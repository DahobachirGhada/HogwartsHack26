const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { pipeline } = require('@xenova/transformers');
const { LocalIndex } = require('vectra');

const IngestController = {
  ingest: async (req, res) => {
    try {
      console.log('🔄 n8n Sync Triggered: Starting Ingestion...');
      
      if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing from .env');
      const sql = neon(process.env.DATABASE_URL);
      const indexPath = path.join(process.cwd(), 'algiers_index');

      // 1. Wipe old index to prevent duplicates
      if (fs.existsSync(indexPath)) {
        console.log("🧹 Clearing old index...");
        fs.rmSync(indexPath, { recursive: true, force: true });
      }

      const index = new LocalIndex(indexPath);
      await index.createIndex();

      // 2. Load Model
      const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      // 3. Process PDFs
      const dataPath = path.join(process.cwd(), 'DATA');
      const pdfFiles = [];
      const walkDir = (dir) => {
        for (const file of fs.readdirSync(dir)) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) walkDir(full);
          else if (file.endsWith('.pdf')) pdfFiles.push(full);
        }
      };
      walkDir(dataPath);

      let docs = [];
      for (const filePath of pdfFiles) {
        const loader = new PDFLoader(filePath);
        docs.push(...await loader.load());
      }

      const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
      const splitDocs = await splitter.splitDocuments(docs);

      // 4. Fetch Neon Data
      const quartiers = await sql`SELECT nom, lat, lng FROM quartiers`;

      // 5. Ingest to Vectra
      for (const doc of splitDocs) {
        const output = await embedder(doc.pageContent, { pooling: 'mean', normalize: true });
        await index.insertItem({
          vector: Array.from(output.data),
          metadata: { text: doc.pageContent, source: 'pdf_knowledge' }
        });
      }

      for (const row of quartiers) {
        const text = `Quartier: ${row.nom}. lat=${row.lat}, lng=${row.lng}.`;
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        await index.insertItem({
          vector: Array.from(output.data),
          metadata: { text, source: 'neon_db' }
        });
      }

      console.log('✅ Sync Successful!');
      return res.status(200).json({ 
        status: "success", 
        message: `Ingested ${splitDocs.length} PDF chunks and ${quartiers.length} database rows.` 
      });

    } catch (error) {
      console.error('❌ Ingestion Error:', error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
};

module.exports = IngestController;