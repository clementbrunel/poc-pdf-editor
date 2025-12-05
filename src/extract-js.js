import { readFileSync, writeFileSync } from 'fs';
import { PDFDocument, PDFName } from 'pdf-lib';

/**
 * Extrait et affiche le JavaScript contenu dans un PDF
 * Usage: node src/extract-js.js <chemin-du-pdf> [--save]
 */

async function extractJavaScript(pdfPath, shouldSave = false) {
  try {
    // Charger le PDF
    const existingPdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    console.log(`\n📄 Analyse du PDF: ${pdfPath}\n`);

    // Accéder au catalogue du document
    const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);

    // Chercher les JavaScripts dans le Names dictionary
    const namesRef = catalog.get(PDFName.of('Names'));

    if (!namesRef) {
      console.log('❌ Aucun dictionnaire Names trouvé dans ce PDF');
      console.log('ℹ️  Ce PDF ne contient probablement pas de JavaScript');
      return;
    }

    const names = pdfDoc.context.lookup(namesRef);
    const javascriptRef = names.get(PDFName.of('JavaScript'));

    if (!javascriptRef) {
      console.log('❌ Aucune entrée JavaScript trouvée dans le dictionnaire Names');
      console.log('ℹ️  Ce PDF ne contient pas de JavaScript');
      return;
    }

    // Récupérer le Name Tree
    const nameTree = pdfDoc.context.lookup(javascriptRef);
    const namesArrayRef = nameTree.get(PDFName.of('Names'));

    if (!namesArrayRef) {
      console.log('❌ Structure JavaScript invalide dans le PDF');
      return;
    }

    const namesArray = pdfDoc.context.lookup(namesArrayRef);

    // Parcourir les paires nom/référence
    const scriptsFound = [];
    for (let i = 0; i < namesArray.size(); i += 2) {
      const scriptName = namesArray.lookup(i);
      const scriptRef = namesArray.lookup(i + 1);
      const scriptDict = pdfDoc.context.lookup(scriptRef);

      if (scriptDict) {
        const jsAction = scriptDict.get(PDFName.of('JS'));

        if (jsAction) {
          const jsCode = pdfDoc.context.lookup(jsAction);
          let code = '';

          if (jsCode && typeof jsCode.decodeText === 'function') {
            code = jsCode.decodeText();
          } else if (jsCode && jsCode.asString) {
            code = jsCode.asString();
          }

          const name = scriptName.asString ? scriptName.asString() : `Script ${i / 2 + 1}`;

          scriptsFound.push({ name, code });

          console.log(`\n${'='.repeat(60)}`);
          console.log(`📜 Script: ${name}`);
          console.log(`${'='.repeat(60)}\n`);
          console.log(code);
          console.log(`\n${'='.repeat(60)}\n`);

          // Sauvegarder si demandé
          if (shouldSave) {
            const fileName = `extracted_${name.replace(/[^a-zA-Z0-9]/g, '_')}.js`;
            writeFileSync(fileName, code);
            console.log(`✅ Sauvegardé dans: ${fileName}\n`);
          }
        }
      }
    }

    if (scriptsFound.length === 0) {
      console.log('❌ Aucun code JavaScript trouvé dans ce PDF');
    } else {
      console.log(`\n✅ Total: ${scriptsFound.length} script(s) JavaScript trouvé(s)`);
      if (!shouldSave) {
        console.log(`\nℹ️  Utilisez --save pour sauvegarder les scripts dans des fichiers .js`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction:', error.message);
    console.error(error);
  }
}

// Gestion des arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📖 Usage: node src/extract-js.js <chemin-du-pdf> [--save]

Options:
  --save    Sauvegarde les scripts extraits dans des fichiers .js

Exemple:
  node src/extract-js.js sample.pdf
  node src/extract-js.js sample.pdf --save
  `);
  process.exit(1);
}

const pdfPath = args[0];
const shouldSave = args.includes('--save');

extractJavaScript(pdfPath, shouldSave);
