require('dotenv').config();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LocalIndex } = require('vectra');
const { pipeline } = require('@xenova/transformers');
const IncidentModel = require('../models/incidentmodel');
const ChatSessionModel = require('../models/chatsessionmodel');
const QuartierModel = require('../models/quartiermodel');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Zone classification ─────────────────────────────────────────────────────
async function classifyZones() {
  try {
    const ZoneDangerModel = require('../models/zonedangermodel');
    const incidents = await IncidentModel.findAll_forN8N();

    if (!incidents.length) return;
    const grouped = {};
    for (const inc of incidents) {
      if (!inc.quartier) continue;
      if (!grouped[inc.quartier]) {
        grouped[inc.quartier] = {
          nom: inc.quartier,
          lat: inc.lat,
          lng: inc.lng,
          total: 0,
          high: 0,
          medium: 0,
          low: 0
        };
      }
      grouped[inc.quartier].total++;
      if (inc.danger_level === 'High')   grouped[inc.quartier].high++;
      if (inc.danger_level === 'Medium') grouped[inc.quartier].medium++;
      if (inc.danger_level === 'Low')    grouped[inc.quartier].low++;
    }
    for (const zone of Object.values(grouped)) {
      let score;
      let recommandation;

      if (zone.high >= 1 || zone.total >= 5) {
        score = 'High';
        recommandation = `Zone critique — ${zone.total} incidents dont ${zone.high} urgents. Intervention immédiate requise.`;
      } else if (zone.medium >= 2 || zone.total >= 3) {
        score = 'Medium';
        recommandation = `Zone à surveiller — ${zone.total} incidents signalés. Intervention recommandée.`;
      } else {
        score = 'Low';
        recommandation = `Zone stable — ${zone.total} incident(s) mineur(s) signalé(s).`;
      }

      await ZoneDangerModel.upsert({
        nom: zone.nom,
        lat: zone.lat,
        lng: zone.lng,
        score,
        recommandation
      });
    }

    console.log(`✅ Zones classified: ${Object.keys(grouped).length} zones updated`);
  } catch (err) {
    console.error('classifyZones error:', err.message);
  }
}

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
Tu parles en français naturellement, tu es sympathique et varié dans tes formulations.

Ton rôle est d'EXTRAIRE automatiquement les informations depuis ce que dit le citoyen:
1. type — extrait depuis le message parmi:
   "incendie", "fuite de gaz", "effondrement", "câble électrique",
   "agression", "accident", "éclairage défaillant", "route dégradée",
   "déchet sauvage", "autre"
2. description — extrait depuis le message (ce que le citoyen décrit)
3. since (optionnel) — extrait depuis le message ("depuis hier", "3 jours", etc.)

Le quartier et les coordonnées GPS sont DÉJÀ connus, tu n'as PAS besoin de les demander.

Comportement:
- Essaie TOUJOURS d'extraire le maximum d'infos depuis le message du citoyen AVANT de poser une question
- Si le message contient déjà le type ET la description → passe directement à done:true sans poser de question
- Si une seule info manque → pose UNE seule question pour la récupérer
- Si le message est vague (ex: "bonjour", "j'ai un problème") → demande de décrire l'incident
- Varie tes formulations, sois court et naturel
- Si situation dangereuse (incendie, gaz, agression) → rappelle d'appeler le 17 ou le 14 immédiatement
- Pour les problèmes non urgents → rassure que le signalement sera traité rapidement
- Quand done:true → remercie chaleureusement le citoyen

Niveau de danger — détermine automatiquement:
- "High" → incendie, fuite de gaz, effondrement, câble électrique, agression, accident
- "Medium" → route dégradée, éclairage défaillant
- "Low" → déchet sauvage, autre

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "message": "ta réponse au citoyen",
  "extracted": {
    "type": null ou la valeur extraite,
    "description": null ou la valeur extraite,
    "since": null ou la valeur extraite,
    "danger_level": null ou "Low" ou "Medium" ou "High"
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
          since: updated.since || null, image_url: image_url || null,
          danger_level: updated.danger_level || null
        });

  
        await classifyZones();

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