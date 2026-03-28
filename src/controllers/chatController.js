const { GoogleGenerativeAI } = require('@google/generative-ai');
const IncidentModel = require('../models/incidentmodel');
const ChatSessionModel = require('../models/chatsessionmodel');
const QuartierModel = require('../models/quartiermodel');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `Tu es SafeCity, un assistant civique pour signaler des incidents urbains à Alger.
Tu parles en français naturellement et tu es sympathique.

Ton rôle est de collecter exactement 3 informations:
1. type — le type d'incident parmi: "éclairage défaillant", "accident", "route dégradée", "déchet sauvage", "autre"
2. description — les détails supplémentaires donnés par le citoyen
3. since (optionnel) — depuis combien de temps ("depuis hier", "3 jours", etc.)

Le quartier et les coordonnées GPS sont DÉJÀ connus (choisis avant le chat), tu n'as PAS besoin de les demander.

Règles:
- Pose UNE question à la fois
- Sois court et naturel
- Quand tu as le type et la description, dis que tu as tout ce qu'il faut et termine par: READY_TO_SAVE
- Réponds UNIQUEMENT en JSON avec ce format:
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

  // GET /api/quartiers
  async getQuartiers(req, res) {
    try {
      const quartiers = await QuartierModel.findAll();
      res.status(200).json({ quartiers });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  // POST /api/chat/start — user picks quartier, session begins
  async startSession(req, res) {
    try {
      const { quartier_id } = req.body;
      const user_id = req.user.id;

      const quartier = await QuartierModel.findById(quartier_id);
      if (!quartier) return res.status(404).json({ message: 'Quartier non trouvé' });

      // Delete old session if exists
      const old = await ChatSessionModel.findByUserId(user_id);
      if (old) await ChatSessionModel.delete(old.id);

      const session = await ChatSessionModel.create({
        user_id,
        quartier: quartier.nom,
        lat: quartier.lat,
        lng: quartier.lng
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

  // POST /api/chat — handle each message
  async chat(req, res) {
    try {
      const { message, session_id, image_url } = req.body;
      const user_id = req.user.id;

      // Get session
      const session = await ChatSessionModel.findByUserId(user_id);
      if (!session) return res.status(400).json({ message: 'Session non trouvée. Choisissez d\'abord un quartier.' });

      const collected = session.collected || {};

      // Call Gemini
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `${SYSTEM_PROMPT}

Informations déjà collectées: ${JSON.stringify(collected)}
Message du citoyen: "${message}"

Réponds uniquement en JSON valide.`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text();

      // Parse Gemini JSON response
      let parsed;
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        return res.status(200).json({ message: "Pouvez-vous reformuler ?" });
      }

      // Merge extracted data into session
      const updated = {
        ...collected,
        ...Object.fromEntries(
          Object.entries(parsed.extracted || {}).filter(([, v]) => v !== null)
        )
      };

      // If Gemini says done and we have type + description → save incident
      if (parsed.done && updated.type && updated.description) {
        const incident = await IncidentModel.create({
          user_id,
          type: updated.type,
          description: updated.description,
          quartier: session.quartier,
          lat: session.lat,
          lng: session.lng,
          since: updated.since || null,
          image_url: image_url || null
        });

        // Ping n8n webhook
        if (process.env.N8N_WEBHOOK_URL) {
          axios.post(process.env.N8N_WEBHOOK_URL, { incident_id: incident.id })
            .catch(err => console.error('n8n ping failed:', err.message));
        }

        // Clean up session
        await ChatSessionModel.delete(session.id);

        return res.status(200).json({
          message: parsed.message,
          done: true,
          incident_id: incident.id
        });
      }

      // Update session with new collected data
      await ChatSessionModel.update(session.id, {
        step: updated.type ? (updated.description ? 'done' : 'awaiting_description') : 'awaiting_type',
        collected: updated
      });

      res.status(200).json({
        message: parsed.message,
        done: false
      });

    } catch (err) {
      console.error('chat error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  // GET /api/incidents
  async getIncidents(req, res) {
    try {
      const { quartier, type, date } = req.query;
      const incidents = await IncidentModel.findAll({ quartier, type, date });
      res.status(200).json({ incidents });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  // GET /api/zones
  async getZones(req, res) {
    try {
      const ZoneDangerModel = require('../models/zonedangermodel');
      const zones = await ZoneDangerModel.findAll();
      res.status(200).json({ zones });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  },

  // GET /api/stats
  async getStats(req, res) {
    try {
      const stats = await IncidentModel.getStats();
      res.status(200).json({ stats });
    } catch (err) {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = ChatController;
