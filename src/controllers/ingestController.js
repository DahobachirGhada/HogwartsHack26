const { pipeline } = require('@xenova/transformers');
const { LocalIndex } = require('vectra');
const path = require('path');
const fs = require('fs');

const IngestController = {
  sync: async (req, res) => {
    try {
      console.log('🚨 n8n Incident Sync Triggered...');
      console.log("📍 process.cwd():", process.cwd());

      const indexPath = path.join(process.cwd(), 'algiers_index');
      console.log("📂 indexPath:", indexPath);

      // ✅ Step 1: ensure folder exists
      if (!fs.existsSync(indexPath)) {
        console.log("❌ Index folder does NOT exist, creating...");
        fs.mkdirSync(indexPath, { recursive: true });
      } else {
        console.log("✅ Index folder exists");
      }

      // ✅ Step 2: create index
      const index = new LocalIndex(indexPath);

      // ✅ Step 3: check if base index exists
      if (!await index.isIndexCreated()) {
        return res.status(400).json({ 
          error: "Base index not found. Run static ingestion first." 
        });
      }

      const incidents = req.body.incidents;

      if (!incidents || incidents.length === 0) {
        return res.json({ message: "No new incidents to sync." });
      }

      const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      // ✅ Insert data
      for (const row of incidents) {
        const text = `LIVE INCIDENT: ${row.type}. Description: ${row.description}. Location: ${row.quartier || 'Unknown'}.`;
        
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        
        await index.insertItem({
          vector: Array.from(output.data),
          metadata: { 
            text, 
            source: 'live_incidents', 
            id: row.id, 
            timestamp: row.created_at 
          }
        });
      }

      console.log("🧪 Insert finished, checking files...");

      // ✅ Debug write (IMPORTANT)
      fs.writeFileSync(path.join(indexPath, 'debug.txt'), 'it works');

      const files = fs.readdirSync(indexPath);
      console.log("📂 Current files in index folder:", files);

      const stats = fs.statSync(path.join(indexPath, 'index.json')); 
      console.log("🕒 Index last modified:", stats.mtime);

      console.log(`✅ Successfully updated algiers_index with ${incidents.length} new records.`);

      res.status(200).json({ 
        status: "success", 
        message: "Items inserted into index",
        count: incidents.length 
      });

    } catch (error) {
      console.error('❌ Incident Sync Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = IngestController;