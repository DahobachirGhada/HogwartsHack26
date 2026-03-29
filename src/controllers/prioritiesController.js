require('dotenv').config();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LocalIndex } = require('vectra');
const pool = require('../config/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const prioritiesController = {

  // GET /api/priorities/briefing
  getBriefing: async (req, res) => {
    try {

      const { rows: currentIncidents } = await pool.query(`
        SELECT id, type, description, quartier, lat, lng, danger_level, created_at
        FROM incidents
        WHERE status != 'resolved'
        ORDER BY created_at DESC
      `);

      const { rows: patterns } = await pool.query(`
        SELECT type, quartier, COUNT(*) AS count
        FROM incidents
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY type, quartier
        ORDER BY count DESC
        LIMIT 10
      `);

      if (!currentIncidents || currentIncidents.length === 0) {
        return res.json({ message: "No incidents to report. All quiet!" });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // RAG from admin_index if exists
      const indexPath = path.join(__dirname, '..', '..', 'algiers_index');
      const index = new LocalIndex(indexPath);
      let contextDocs = '';

      if (await index.isIndexCreated()) {
        try {
          const { pipeline } = require('@xenova/transformers');
          const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
          const query = currentIncidents.map(i => `${i.type} ${i.quartier}`).join(' ');
          const output = await embedder(query, { pooling: 'mean', normalize: true });
          const vector = Array.from(output.data);
          const results = await index.queryItems(vector, 5);
          contextDocs = results.map(r => r.item.metadata.text).join('\n');
        } catch {
          contextDocs = '';
        }
      }

      const prompt = `
You are the "Algiers Urban Operations AI", using live incidents and city rules to brief the Admin.

CONTEXT FROM RULES:
${contextDocs}

LIVE INCIDENTS:
${JSON.stringify(currentIncidents)}

HISTORICAL PATTERNS (Last 7 days):
${JSON.stringify(patterns || [])}

TASK:
1. Identify the TOP 3 highest priority incidents (risk, description, and date).
2. Detect any "Alert Patterns" (e.g., multiple fires or thefts in a neighborhood).
3. Provide a 1-sentence expert resolution advice per priority.

RETURN JSON ONLY in this format:
{
  "summary": "One sentence describing the overall city state.",
  "top_priorities": [
    { 
      "id": 123, 
      "nom": "Quartier Name", 
      "lat": 36.7, 
      "lng": 3.0, 
      "score": "High", 
      "recommandation": "Detailed expert advice based on SOPs." 
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const clean = raw.replace(/```json|```/g, '').trim();
      const briefing = JSON.parse(clean);

      res.status(200).json(briefing);

    } catch (error) {
      console.error('Priorities briefing error:', error);
      res.status(500).json({ error: "Failed to generate briefing. " + error.message });
    }
  },

  // PUT /api/priorities/:id/resolve
  resolveIncident: async (req, res) => {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(`
        UPDATE incidents
        SET status = 'resolved'
        WHERE id = $1
        RETURNING id, type, quartier, status
      `, [id]);

      if (!rows.length)
        return res.status(404).json({ message: 'Incident non trouvé' });

      res.status(200).json({
        message: 'Incident marqué comme résolu ✅',
        incident: rows[0]
      });

    } catch (err) {
      console.error('resolveIncident error:', err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
};

module.exports = prioritiesController;