require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { pipeline } = require('@xenova/transformers');
const { LocalIndex } = require('vectra');
const { extractText } = require('office-text-extractor');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");

async function ingestAdmin() {
  const indexPath = path.join(__dirname, '..','admin_index');
  const dataPath = path.join(__dirname, '..', 'DATA', 'AdminDataStatic');
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
      const pdfDocs = await loader.load(); // returns array of pages
  
      docs.push(...pdfDocs);
  
      console.log(`✅ Loaded: ${path.basename(filePath)} (${pdfDocs.length} pages)`);
  
    } catch (err) {
      console.error(`❌ ${path.basename(filePath)}: ${err.message}`);
    }
  }
  console.log(`🧾 Total docs loaded: ${docs.length}`);

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const splitDocs = await splitter.splitDocuments(docs);

  console.log(`📥 Ingesting ${splitDocs.length} PDF chunks...`);

  await index.beginUpdate();
  for (const doc of splitDocs) {
    if (!doc.pageContent.trim()) continue;
    const output = await embedder(doc.pageContent, { pooling: 'mean', normalize: true });
    await index.insertItem({
      vector: Array.from(output.data),
      metadata: { text: doc.pageContent, source: path.basename(doc.metadata.source || 'pdf') }
    });
  }

  await index.endUpdate();

  console.log('\n✅ Vectra index ready!');
}

ingestAdmin().catch(console.error);