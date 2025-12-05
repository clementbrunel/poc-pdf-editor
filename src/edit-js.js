import { readFileSync, writeFileSync } from 'fs';
import { PDFDocument, PDFName, PDFDict, PDFString } from 'pdf-lib';

/**
 * Édite le JavaScript dans un PDF et crée une nouvelle version
 * Usage: node src/edit-js.js <pdf-source> <fichier-js> <pdf-destination> [nom-script]
 */

async function editPdfJavaScript(sourcePdf, jsFilePath, destinationPdf, scriptName = 'CustomScript') {
  try {
    console.log(`\n🔧 Édition du JavaScript dans le PDF...\n`);

    // Charger le PDF source
    const existingPdfBytes = readFileSync(sourcePdf);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Lire le nouveau code JavaScript
    const newJsCode = readFileSync(jsFilePath, 'utf-8');
    console.log(`📝 Nouveau code JavaScript chargé depuis: ${jsFilePath}`);
    console.log(`   Taille: ${newJsCode.length} caractères\n`);

    // Accéder au catalogue du document
    const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);

    // Chercher ou créer le dictionnaire Names
    let names = catalog.get(PDFName.of('Names'));
    if (!names) {
      names = pdfDoc.context.obj({});
      catalog.set(PDFName.of('Names'), names);
    } else {
      names = pdfDoc.context.lookup(names);
    }

    // Chercher ou créer l'entrée JavaScript
    let javascript = names.get(PDFName.of('JavaScript'));
    let javascriptDict;

    if (!javascript) {
      javascriptDict = pdfDoc.context.obj({});
      const javascriptRef = pdfDoc.context.register(javascriptDict);
      names.set(PDFName.of('JavaScript'), javascriptRef);
    } else {
      javascriptDict = pdfDoc.context.lookup(javascript);
    }

    // Chercher ou créer le tableau Names
    let namesArray = javascriptDict.get(PDFName.of('Names'));

    if (!namesArray) {
      namesArray = pdfDoc.context.obj([]);
      javascriptDict.set(PDFName.of('Names'), namesArray);
    } else {
      namesArray = pdfDoc.context.lookup(namesArray);
    }

    // Créer le dictionnaire d'action JavaScript
    const jsActionDict = pdfDoc.context.obj({
      S: PDFName.of('JavaScript'),
      JS: PDFString.of(newJsCode)
    });

    const jsActionRef = pdfDoc.context.register(jsActionDict);

    // Chercher si un script avec ce nom existe déjà
    let scriptFound = false;
    for (let i = 0; i < namesArray.size(); i += 2) {
      const existingName = namesArray.lookup(i);
      const existingNameStr = existingName.asString ? existingName.asString() : '';

      if (existingNameStr === scriptName) {
        // Remplacer le script existant
        namesArray.set(i + 1, jsActionRef);
        scriptFound = true;
        console.log(`♻️  Script '${scriptName}' existant remplacé`);
        break;
      }
    }

    // Si le script n'existe pas, l'ajouter
    if (!scriptFound) {
      namesArray.push(PDFString.of(scriptName));
      namesArray.push(jsActionRef);
      console.log(`➕ Nouveau script '${scriptName}' ajouté`);
    }

    // Sauvegarder le nouveau PDF
    const pdfBytes = await pdfDoc.save();
    writeFileSync(destinationPdf, pdfBytes);

    console.log(`\n✅ PDF édité sauvegardé avec succès: ${destinationPdf}`);
    console.log(`\n📊 Informations:`);
    console.log(`   - PDF source: ${sourcePdf}`);
    console.log(`   - Script: ${scriptName}`);
    console.log(`   - Taille du code: ${newJsCode.length} caractères`);
    console.log(`   - PDF de sortie: ${destinationPdf}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'édition:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Gestion des arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
📖 Usage: node src/edit-js.js <pdf-source> <fichier-js> <pdf-destination> [nom-script]

Arguments:
  pdf-source        Chemin du PDF source
  fichier-js        Chemin du fichier JavaScript à injecter
  pdf-destination   Chemin du PDF de sortie (sera créé, ne modifie pas l'original)
  nom-script        (Optionnel) Nom du script dans le PDF (défaut: CustomScript)

Exemples:
  node src/edit-js.js input.pdf custom.js output.pdf
  node src/edit-js.js input.pdf custom.js output.pdf MyScript
  `);
  process.exit(1);
}

const [sourcePdf, jsFilePath, destinationPdf, scriptName] = args;

editPdfJavaScript(sourcePdf, jsFilePath, destinationPdf, scriptName);
