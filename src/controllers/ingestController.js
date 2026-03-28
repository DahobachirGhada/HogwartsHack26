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
      const index = new LocalIndex(indexPath);

      if (!await index.isIndexCreated()) {
        return res.status(400).json({ 
          error: "Base index not found. Run static ingestion first." 
        });
      }

      if (!fs.existsSync(indexPath)) {
        console.log("❌ Index folder does NOT exist, creating...");
        fs.mkdirSync(indexPath, { recursive: true });
      } else {
        console.log("✅ Index folder exists");
      }
      const incidents = req.body.incidents;

      if (!incidents || incidents.length === 0) {
        return res.json({ message: "No new incidents to sync." });
      }

      const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      // Loop through incidents and insert
      for (const row of incidents) {
        // Fix: using row.quartier since 'location' was undefined in your JSON
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
      await index.save();
      console.log("💾 Index saved to disk");
      const files = fs.readdirSync(indexPath);
      console.log("📂 Current files in index folder:", files);
      const stats = fs.statSync(path.join(indexPath, 'index.json')); 
      console.log("🕒 Index last modified:", stats.mtime);

      // NOTE: In Vectra, insertItem writes to the index. 
      // If you still don't see changes, it's often a pathing issue on Render.
      
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