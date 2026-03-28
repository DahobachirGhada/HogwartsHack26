require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { pipeline } = require('@xenova/transformers');
const { LocalIndex } = require('vectra');

async function ingest() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing from .env');
  const sql = neon(process.env.DATABASE_URL);
  const indexPath = path.join(process.cwd(), 'algiers_index');

  if (fs.existsSync(indexPath)) {
    console.log("🧹 Clearing old index for a fresh sync...");
    fs.rmSync(indexPath, { recursive: true, force: true });
}

  // Now create it fresh
  const index = new LocalIndex(indexPath);
  await index.createIndex();
  
  console.log(' Loading embedding model...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  if (!await index.isIndexCreated()) {
    console.log('Creating Vectra index...');
    await index.createIndex();
  }

  const dataPath = path.join(process.cwd(), 'DATA');
  const pdfFiles = [];
  function walkDir(dir) {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) walkDir(full);
      else if (file.endsWith('.pdf') && !file.startsWith('.')) pdfFiles.push(full);
    }
  }
  walkDir(dataPath);
  console.log(`Found ${pdfFiles.length} PDFs`);

  let docs = [];
  for (const filePath of pdfFiles) {
    try {
      const loader = new PDFLoader(filePath);
      docs.push(...await loader.load());
      console.log(` ${path.basename(filePath)}`);
    } catch (err) {
      console.error(` ${path.basename(filePath)}: ${err.message}`);
    }
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const splitDocs = await splitter.splitDocuments(docs);

  console.log('🐘 Fetching quartiers...');
  const quartiers = await sql`SELECT nom, lat, lng FROM quartiers`;

  console.log(`📥 Ingesting ${splitDocs.length} PDF chunks...`);
  for (const doc of splitDocs) {
    if (!doc.pageContent.trim()) continue;
    const output = await embedder(doc.pageContent, { pooling: 'mean', normalize: true });
    await index.insertItem({
      vector: Array.from(output.data),
      metadata: { text: doc.pageContent, source: path.basename(doc.metadata.source || 'pdf') }
    });
  }

  console.log(`📥 Ingesting ${quartiers.length} quartiers...`);
  for (const row of quartiers) {
    const text = `Quartier: ${row.nom}. lat=${row.lat}, lng=${row.lng}.`;
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    await index.insertItem({
      vector: Array.from(output.data),
      metadata: { text, source: 'neon_quartiers' }
    });
  }

  console.log('\n✅ Vectra index ready!');
}

ingest().catch(console.error);