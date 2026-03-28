const { pipeline } = require('@xenova/transformers');
const { LocalIndex } = require('vectra');
const path = require('path');

const IngestController = {
  sync: async (req, res) => {
    try {
      console.log('🚨 n8n Incident Sync Triggered...');
      
      const indexPath = path.join(process.cwd(), 'algiers_index');
      const index = new LocalIndex(indexPath);

      // 1. Safety check: Ensure the base index exists
      if (!await index.isIndexCreated()) {
        return res.status(400).json({ 
          error: "Base index not found. Please run the static ingestion first." 
        });
      }

      // 2. Fetch incidents (e.g., last 24 hours)
      const incidents = req.body.incidents;

      if (!incidents || incidents.length === 0) {
        return res.json({ message: "No new incidents to sync." });
      }

      // 3. Load embedding model
      const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      // 4. Append to Vectra Index
      for (const row of incidents) {
        const text = `LIVE INCIDENT: ${row.type}. Description: ${row.description}. Location: ${row.location}. Status: ${row.status}.`;
        
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        
        // .insertItem adds to the index without deleting current data
        await index.insertItem({
          vector: Array.from(output.data),
          metadata: { text, source: 'live_incidents', id: row.id, timestamp: row.created_at }
        });
      }

      await index.upsertIndex(); 

      console.log(`✅ Successfully updated algiers_index with ${incidents.length} new records.`);

      res.status(200).json({ 
        status: "success", 
        message: "Index updated on disk",
        count: incidents.length 
      });

    } catch (error) {
      console.error('❌ Incident Sync Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = IngestController;