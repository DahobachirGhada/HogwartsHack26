require('dotenv').config();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LocalIndex } = require('vectra');
const { pipeline } = require('@xenova/transformers');
const IncidentModel = require('../models/incidentmodel');
const ChatSessionModel = require('../models/chatsessionmodel');
const QuartierModel = require('../models/quartiermodel');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let embedderInstance = null;

async function getEmbedder() {
  if (!embedderInstance)
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return embedderInstance;
}

async function getVectraContext(question) {
  try {
    const indexPath = path.join(process.cwd(), 'algiers_index');
    const index = new LocalIndex(indexPath);
    if (!await index.isIndexCreated()) return '';
    const embedder = await getEmbedder();
    const output = await embedder(question, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);
    const results = await index.queryItems(vector, 3);
    return results.map(r => r.item.metadata.text).join('\n\n');
  } catch (err) {
    console.error('Vectra context error:', err.message);
    return '';
  }
}

 const SYSTEM_PROMPT = `Tu es SafeCity, un assistant civique pour signaler des incidents urbains à Alger.
Tu parles en français naturellement et tu es sympathique et varié dans tes formulations.

Ton rôle est de collecter exactement 3 informations:
1. type — le type d'incident parmi: 
   "incendie", "fuite de gaz", "effondrement", "câble électrique",
   "agression", "accident", "éclairage défaillant", "route dégradée", 
   "déchet sauvage", "autre"
2. description — les détails supplémentaires donnés par le citoyen
3. since (optionnel) — depuis combien de temps ("depuis hier", "3 jours", etc.)

Le quartier et les coordonnées GPS sont DÉJÀ connus (choisis avant le chat), tu n'as PAS besoin de les demander.

Règles:
- Pose UNE question à la fois
- Varie tes formulations à chaque échange — n'utilise JAMAIS deux fois la même phrase ou tournure
- Sois court, naturel et humain — comme un agent civique bienveillant, pas un robot
- Si la situation est dangereuse (incendie, gaz, agression) → rappelle d'appeler le 17 (Police) ou le 14 (SAMU) immédiatement
- Pour les problèmes non urgents → rassure le citoyen que son signalement sera traité rapidement
- Quand tu as le type ET la description, remercie le citoyen chaleureusement et termine par READY_TO_SAVE

Exemples de variations pour demander le type (ne pas copier mot pour mot):
- "Qu'est-ce qui se passe exactement ?"
- "De quel type de problème s'agit-il ?"
- "Pouvez-vous me dire ce que vous observez ?"
- "C'est quel genre d'incident ?"

Exemples de variations pour demander la description:
- "Vous pouvez me donner plus de détails ?"
- "Qu'est-ce que vous constatez précisément sur place ?"
- "Décrivez-moi la situation en quelques mots."
- "C'est grave ? Dites-m'en plus."

Exemples de variations pour demander le since:
- "Ça dure depuis combien de temps ?"
- "C'est récent ou ça fait un moment ?"
- "Vous savez depuis quand c'est comme ça ?"

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "message": "ta réponse au citoyen",
  "extracted": {
    "type": null ou la valeur extraite,
    "description": null ou la valeur extraite,
    "since": null ou la valeur extraite
  },
  "done": false ou true
}`;

const ChatController = {

  async getQuartiers(req, res) {
    try {
      const quartiers = await QuartierModel.findAll();
      res.status(200).json({ quartiers });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  async startSession(req, res) {
    try {
      const { quartier_id } = req.body;
      const user_id = req.user.id;
      const quartier = await QuartierModel.findById(quartier_id);
      if (!quartier) return res.status(404).json({ message: 'Quartier non trouvé' });
      const old = await ChatSessionModel.findByUserId(user_id);
      if (old) await ChatSessionModel.delete(old.id);
      const session = await ChatSessionModel.create({
        user_id, quartier: quartier.nom, lat: quartier.lat, lng: quartier.lng
      });
      res.status(201).json({
        session_id: session.id,
        message: `Bonjour ! Je vais vous aider à signaler un incident à ${quartier.nom}. Quel est le problème que vous constatez ?`
      });
    } catch (err) {
      console.error('startSession error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  async chat(req, res) {
    try {
      const { message, image_url } = req.body;
      const user_id = req.user.id;
      const session = await ChatSessionModel.findByUserId(user_id);
      if (!session) return res.status(400).json({ message: "Session non trouvée. Choisissez d'abord un quartier." });
      const collected = session.collected || {};

      const contextText = await getVectraContext(message);
      const systemWithContext = contextText
        ? `${SYSTEM_PROMPT}\n\nCONTEXTE DOCUMENTS:\n${contextText}`
        : SYSTEM_PROMPT;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `${systemWithContext}\n\nInformations déjà collectées: ${JSON.stringify(collected)}\nMessage du citoyen: "${message}"\n\nRéponds uniquement en JSON valide.`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text();

      let parsed;
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        return res.status(200).json({ message: 'Pouvez-vous reformuler ?' });
      }

      const updated = {
        ...collected,
        ...Object.fromEntries(Object.entries(parsed.extracted || {}).filter(([, v]) => v !== null))
      };

      if (parsed.done && updated.type && updated.description) {
        const incident = await IncidentModel.create({
          user_id, type: updated.type, description: updated.description,
          quartier: session.quartier, lat: session.lat, lng: session.lng,
          since: updated.since || null, image_url: image_url || null
        });
        if (process.env.N8N_WEBHOOK_URL) {
          axios.post(process.env.N8N_WEBHOOK_URL, { incident_id: incident.id })
            .catch(err => console.error('n8n ping failed:', err.message));
        }
        await ChatSessionModel.delete(session.id);
        return res.status(200).json({ message: parsed.message, done: true, incident_id: incident.id });
      }

      await ChatSessionModel.update(session.id, {
        step: updated.type ? (updated.description ? 'done' : 'awaiting_description') : 'awaiting_type',
        collected: updated
      });

      res.status(200).json({ message: parsed.message, done: false });

    } catch (err) {
      console.error('chat error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  async getIncidents(req, res) {
    try {
      const { quartier, type, date } = req.query;
      const incidents = await IncidentModel.findAll({ quartier, type, date });
      res.status(200).json({ incidents });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  async getZones(req, res) {
    try {
      const ZoneDangerModel = require('../models/zonedangermodel');
      const zones = await ZoneDangerModel.findAll();
      res.status(200).json({ zones });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  async getStats(req, res) {
    try {
      const stats = await IncidentModel.getStats();
      res.status(200).json({ stats });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  async getHomeStats(req, res) {
    try {
      const weekly = await IncidentModel.getWeeklyReports();
      const total = await IncidentModel.getTotalIncidents();
      res.status(200).json({
        weekly_reports: parseInt(weekly.total),
        total_incidents: parseInt(total.total)
      });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = ChatController;