require('dotenv').config();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LocalIndex } = require('vectra');
const { neon } = require('@neondatabase/serverless');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_ADMIN_API_KEY);

const prioritiesController = {
  getBriefing: async (req, res) => {
    try {
      const { currentIncidents, patterns } = req.body;
      if (!currentIncidents || currentIncidents.length === 0) {
            return res.json({ message: "No incidents provided by n8n." });
      }
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      console.log("📊 Generating Admin Briefing with RAG...");
      if (currentIncidents.length === 0) {
        return res.json({ message: "No new incidents to report today. All quiet!" });
      }

      // 3️⃣ Retrieve context from LocalIndex (RAG)
      const indexPath = path.join(__dirname, '..', 'admin_index');
      const index = new LocalIndex(indexPath);

      let contextDocs = '';
      if (await index.isIndexCreated()) {
        const queries = currentIncidents.map(i => `${i.type} ${i.quartier}`).join(' | ');
        const results = await index.query({
          query: queries,
          topK: 5,
          includeMetadata: true
        });

        contextDocs = results.map(r => r.metadata.text).join('\n');
        console.log("📚 Retrieved context from local index for RAG.");
      }

      // 4️⃣ Build the Gemini prompt
      const prompt = `
You are the "Algiers Urban Operations AI", using live incidents and city rules to brief the Admin.

CONTEXT FROM RULES:
${contextDocs}

LIVE INCIDENTS:
${JSON.stringify(currentIncidents)}

HISTORICAL PATTERNS (Last 7 days):
${JSON.stringify(patterns)}

TASK:
1. Identify the TOP 3 highest priority incidents (risk, description, and date).
2. Detect any "Alert Patterns" (e.g., multiple fires or thefts in a neighborhood).
3.  provide a 1-sentence expert resolution advice.

RETURN JSON ONLY in this format:
{
"summary": "One sentence describing the overall city state (e.g., 'Increasing water infrastructure pressure in Casbah coinciding with seasonal flooding.')",
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

}
      `;

      // 5️⃣ Call Gemini
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      const briefing = JSON.parse(cleanJson);

      res.status(200).json(briefing);

    } catch (error) {
      console.error('❌ Admin Briefing RAG Error:', error);
      res.status(500).json({ error: "Failed to generate briefing. " + error.message });
    }
  }
};

module.exports = prioritiesController;