import { writeFileSync } from 'fs';
import { PDFDocument, PDFName, PDFString, rgb, StandardFonts } from 'pdf-lib';

/**
 * Crée un PDF d'exemple avec du JavaScript intégré
 * Usage: node src/create-sample-pdf.js [nom-fichier]
 */

async function createSamplePdf(outputPath = 'sample.pdf') {
  try {
    console.log('\n🔨 Création d\'un PDF d\'exemple avec JavaScript...\n');

    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create();

    // Ajouter une page
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();

    // Ajouter du texte
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('PDF avec JavaScript intégré', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0.2, 0.6),
    });

    page.drawText('Ce PDF contient du code JavaScript qui s\'exécute à l\'ouverture.', {
      x: 50,
      y: height - 100,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Utilisez les outils de ce projet pour:', {
      x: 50,
      y: height - 140,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    const instructions = [
      '• Extraire et visualiser le JavaScript',
      '• Modifier le code JavaScript',
      '• Créer une version personnalisée du PDF',
    ];

    let yPosition = height - 165;
    instructions.forEach(instruction => {
      page.drawText(instruction, {
        x: 70,
        y: yPosition,
        size: 11,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 25;
    });

    page.drawText('Commandes disponibles:', {
      x: 50,
      y: yPosition - 20,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    const commands = [
      'npm run extract sample.pdf',
      'npm run edit sample.pdf custom.js output.pdf',
    ];

    yPosition -= 45;
    commands.forEach(command => {
      page.drawText(command, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0.4, 0, 0.6),
      });
      yPosition -= 25;
    });

    // Code JavaScript d'exemple à intégrer
    const sampleJavaScript = `// Script JavaScript d'exemple intégré dans le PDF
// Ce code s'exécute à l'ouverture du document

// Afficher un message d'accueil
app.alert({
  cMsg: "Bienvenue ! Ce PDF contient du JavaScript personnalisé.\\n\\nUtilisez l'outil d'extraction pour voir ce code.",
  cTitle: "PDF JavaScript Editor - Demo",
  nIcon: 3  // Icône d'information
});

// Logger un message dans la console (si disponible)
console.println("PDF chargé avec succès !");
console.println("Date: " + new Date());

// Fonction d'exemple
function getCurrentInfo() {
  return {
    title: this.info.Title || "Sans titre",
    author: this.info.Author || "Inconnu",
    pages: this.numPages,
    modified: this.info.ModDate
  };
}

// Afficher les informations du document
var info = getCurrentInfo();
console.println("Titre: " + info.title);
console.println("Pages: " + info.pages);
`;

    // Accéder au catalogue du document
    const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);

    // Créer le dictionnaire Names
    const namesDict = pdfDoc.context.obj({});
    const namesRef = pdfDoc.context.register(namesDict);
    catalog.set(PDFName.of('Names'), namesRef);

    // Créer le dictionnaire JavaScript
    const javascriptDict = pdfDoc.context.obj({});
    const javascriptRef = pdfDoc.context.register(javascriptDict);
    namesDict.set(PDFName.of('JavaScript'), javascriptRef);

    // Créer le tableau de noms
    const namesArray = pdfDoc.context.obj([]);
    javascriptDict.set(PDFName.of('Names'), namesArray);

    // Créer l'action JavaScript
    const jsActionDict = pdfDoc.context.obj({
      S: PDFName.of('JavaScript'),
      JS: PDFString.of(sampleJavaScript)
    });

    const jsActionRef = pdfDoc.context.register(jsActionDict);

    // Ajouter au tableau de noms
    namesArray.push(PDFString.of('SampleScript'));
    namesArray.push(jsActionRef);

    // Configurer les métadonnées
    pdfDoc.setTitle('PDF avec JavaScript - Exemple');
    pdfDoc.setAuthor('POC PDF Editor');
    pdfDoc.setSubject('Démonstration d\'extraction et édition de JavaScript');
    pdfDoc.setKeywords(['JavaScript', 'PDF', 'pdf-lib', 'Node.js']);
    pdfDoc.setCreator('POC PDF Editor');
    pdfDoc.setProducer('pdf-lib');

    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save();
    writeFileSync(outputPath, pdfBytes);

    console.log(`✅ PDF d'exemple créé avec succès: ${outputPath}`);
    console.log(`\n📊 Détails:`);
    console.log(`   - Pages: 1`);
    console.log(`   - Taille du JavaScript: ${sampleJavaScript.length} caractères`);
    console.log(`   - Nom du script: SampleScript`);
    console.log(`\n🚀 Prochaines étapes:`);
    console.log(`   1. Extraire le JavaScript: npm run extract ${outputPath}`);
    console.log(`   2. Modifier le code et sauvegarder dans un fichier .js`);
    console.log(`   3. Créer un PDF modifié: npm run edit ${outputPath} custom.js output.pdf`);
    console.log();

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Gestion des arguments
const args = process.argv.slice(2);
const outputPath = args[0] || 'sample.pdf';

createSamplePdf(outputPath);
