const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

const docsDir = path.join(__dirname, 'Docs');
const outputDir = path.join(__dirname, 'Docs-Text');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function extractPdf(filePath) {
  const dataBuffer = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
  const numPages = doc.numPages;
  let allText = '';
  
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str).join(' ');
    allText += `\n--- PAGE ${i} ---\n${strings}\n`;
  }
  
  return { numPages, text: allText };
}

async function extractAll() {
  const files = fs.readdirSync(docsDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const outputPath = path.join(outputDir, file.replace('.pdf', '.txt'));
    
    try {
      console.log(`Processing: ${file}`);
      const { numPages, text } = await extractPdf(filePath);
      fs.writeFileSync(outputPath, text, 'utf8');
      console.log(`  -> Extracted ${numPages} pages, ${text.length} chars`);
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}`);
    }
  }
  console.log('\nDone!');
}

extractAll();
