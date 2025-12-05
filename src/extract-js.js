import { readFileSync, writeFileSync } from 'fs';
import { PDFDocument, PDFName } from 'pdf-lib';

/**
 * Extrait et affiche le JavaScript contenu dans un PDF
 * Usage: node src/extract-js.js <chemin-du-pdf> [--save]
 */

/**
 * Corrige les retours à la ligne dans les chaînes de caractères JavaScript
 * pour s'assurer que le code extrait est syntaxiquement valide
 */
function fixJavaScriptNewlines(code) {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];

    // Gérer la fin des commentaires de ligne
    if (inLineComment && char === '\n') {
      inLineComment = false;
      result += char;
      i++;
      continue;
    }

    // Si on est dans un commentaire de ligne, copier tel quel
    if (inLineComment) {
      result += char;
      i++;
      continue;
    }

    // Gérer la fin des commentaires de bloc
    if (inBlockComment && char === '*' && nextChar === '/') {
      result += char + nextChar;
      inBlockComment = false;
      i += 2;
      continue;
    }

    // Si on est dans un commentaire de bloc, copier tel quel
    if (inBlockComment) {
      result += char;
      i++;
      continue;
    }

    // Détecter le début d'un commentaire (seulement si on n'est pas dans une chaîne)
    if (!inString && char === '/' && nextChar === '/') {
      inLineComment = true;
      result += char;
      i++;
      continue;
    }

    if (!inString && char === '/' && nextChar === '*') {
      inBlockComment = true;
      result += char;
      i++;
      continue;
    }

    // Gérer les échappements dans les chaînes
    if (inString && escaped) {
      result += char;
      escaped = false;
      i++;
      continue;
    }

    // Si on rencontre un backslash dans une chaîne
    if (inString && char === '\\') {
      result += char;
      escaped = true;
      i++;
      continue;
    }

    // Détecter le début/fin d'une chaîne (guillemets simples ou doubles)
    if ((char === '"' || char === "'") && !inString) {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }

    if (char === stringChar && inString && !escaped) {
      inString = false;
      stringChar = null;
      result += char;
      i++;
      continue;
    }

    // Si on est dans une chaîne et qu'on rencontre un retour à la ligne
    if (inString && char === '\n') {
      // Échapper le retour à la ligne
      result += '\\n';
      i++;
      continue;
    }

    // Pour tous les autres caractères
    result += char;
    i++;
  }

  return result;
}

/**
 * Affiche la structure du Name Tree pour le debug
 */
function debugNameTree(nameTree, context) {
  console.log('\n🔍 Mode Debug: Structure du Name Tree JavaScript\n');
  console.log('Type de l\'objet:', nameTree.constructor.name);

  // Afficher les clés disponibles
  console.log('\nClés disponibles dans le Name Tree:');
  const dict = nameTree.dict || nameTree;
  let hasKeys = false;

  if (dict && dict.entries) {
    for (const [key, value] of dict.entries()) {
      console.log(`  - ${key}`);
      hasKeys = true;
    }
  }

  if (!hasKeys) {
    console.log('  (aucune clé trouvée via entries())');
  }

  // Essayer d'accéder directement au dictionnaire
  console.log('\nContenu brut du Name Tree:');
  try {
    if (nameTree.dict) {
      console.log('  nameTree.dict existe');
      console.log('  Clés du dict:', Object.keys(nameTree.dict));
    }
    if (nameTree.map) {
      console.log('  nameTree.map existe');
      console.log('  Taille de la map:', nameTree.map.size);
    }
  } catch (e) {
    console.log('  Erreur lors de l\'inspection:', e.message);
  }

  // Vérifier Names
  const namesRef = nameTree.get(PDFName.of('Names'));
  if (namesRef) {
    console.log('\n✅ Trouvé: Names (structure directe)');
    const names = context.lookup(namesRef);
    console.log(`   Type: ${names.constructor.name}`);
    console.log(`   Taille: ${names.size ? names.size() : 'N/A'} entrées`);
  } else {
    console.log('\n❌ Pas de Names direct');
  }

  // Vérifier Kids
  const kidsRef = nameTree.get(PDFName.of('Kids'));
  if (kidsRef) {
    console.log('\n✅ Trouvé: Kids (structure avec sous-arbres)');
    const kids = context.lookup(kidsRef);
    console.log(`   Type: ${kids.constructor.name}`);
    console.log(`   Nombre de Kids: ${kids.size ? kids.size() : 'N/A'}`);
  } else {
    console.log('\n❌ Pas de Kids');
  }

  // Essayer d'autres clés communes
  console.log('\n🔎 Vérification d\'autres structures possibles:');

  // Vérifier si c'est un objet action directement
  const sRef = nameTree.get(PDFName.of('S'));
  if (sRef) {
    const s = context.lookup(sRef);
    console.log(`  - /S trouvé: ${s.asString ? s.asString() : s.toString()}`);
  }

  const jsRef = nameTree.get(PDFName.of('JS'));
  if (jsRef) {
    console.log('  - /JS trouvé directement dans le Name Tree !');
    const js = context.lookup(jsRef);
    console.log(`    Type: ${js.constructor.name}`);
    if (js.decodeText) {
      const code = js.decodeText();
      console.log(`    Taille du code: ${code.length} caractères`);
    }
  }

  console.log('\n');
}

async function extractJavaScript(pdfPath, shouldSave = false, debugMode = false) {
  try {
    // Charger le PDF
    const existingPdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    console.log(`\n📄 Analyse du PDF: ${pdfPath}\n`);

    // Extraire le nom de base du PDF pour nommer les fichiers extraits
    const pdfBaseName = pdfPath.replace(/\.pdf$/i, '').replace(/^.*[\/\\]/, '');

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

    // Mode debug: afficher la structure
    if (debugMode) {
      debugNameTree(nameTree, pdfDoc.context);
    }

    // Essayer différentes structures de Name Tree
    let namesArrayRef = nameTree.get(PDFName.of('Names'));
    let namesArray = null;

    if (namesArrayRef) {
      // Structure classique avec tableau Names direct
      namesArray = pdfDoc.context.lookup(namesArrayRef);
    } else {
      // Essayer la structure avec Kids (sous-arbres)
      const kidsRef = nameTree.get(PDFName.of('Kids'));
      if (kidsRef) {
        const kids = pdfDoc.context.lookup(kidsRef);
        if (kids && kids.size && kids.size() > 0) {
          // Prendre le premier enfant et chercher Names dedans
          const firstKidRef = kids.lookup(0);
          const firstKid = pdfDoc.context.lookup(firstKidRef);
          namesArrayRef = firstKid.get(PDFName.of('Names'));
          if (namesArrayRef) {
            namesArray = pdfDoc.context.lookup(namesArrayRef);
          }
        }
      }
    }

    if (!namesArray) {
      console.log('❌ Structure JavaScript non supportée dans ce PDF');
      console.log('\n🔍 Informations de diagnostic :');
      console.log('   Structure du Name Tree trouvée mais format non reconnu.');
      console.log('\n💡 Solutions possibles :');
      console.log('   1. Essayez avec un autre lecteur PDF pour régénérer le PDF');
      console.log('   2. Ouvrez une issue sur GitHub avec votre fichier pour support');
      console.log('   3. Le JavaScript peut être dans OpenAction ou dans les champs de formulaire\n');
      return;
    }

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

          // Essayer différentes méthodes de décodage
          if (jsCode && typeof jsCode.decodeText === 'function') {
            code = jsCode.decodeText();
          } else if (jsCode && jsCode.asString) {
            code = jsCode.asString();
          }

          // Nettoyer le code pour éviter les problèmes d'encodage
          // Normaliser les retours à la ligne
          code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

          const name = scriptName.asString ? scriptName.asString() : `Script ${i / 2 + 1}`;

          scriptsFound.push({ name, code });

          console.log(`\n${'='.repeat(60)}`);
          console.log(`📜 Script: ${name}`);
          console.log(`${'='.repeat(60)}\n`);
          console.log(code);
          console.log(`\n${'='.repeat(60)}\n`);

          // Sauvegarder si demandé
          if (shouldSave) {
            // Générer le nom du fichier basé sur le PDF source
            // Ex: sample.pdf → sample_extract.js (pour le premier script)
            const scriptIndex = scriptsFound.length;
            const suffix = scriptIndex > 1 ? `_extract${scriptIndex}` : '_extract';
            const fileName = `${pdfBaseName}${suffix}.js`;

            // Corriger le code pour qu'il soit valide en JavaScript
            // Échapper les retours à la ligne dans les chaînes de caractères
            let fixedCode = fixJavaScriptNewlines(code);

            writeFileSync(fileName, fixedCode, 'utf-8');
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
📖 Usage: node src/extract-js.js <chemin-du-pdf> [options]

Options:
  --save     Sauvegarde les scripts extraits dans des fichiers .js
  --debug    Active le mode debug pour diagnostiquer les structures non supportées

Exemples:
  node src/extract-js.js sample.pdf
  node src/extract-js.js sample.pdf --save
  node src/extract-js.js problematic.pdf --debug
  node src/extract-js.js sample.pdf --save --debug
  `);
  process.exit(1);
}

const pdfPath = args[0];
const shouldSave = args.includes('--save');
const debugMode = args.includes('--debug');

extractJavaScript(pdfPath, shouldSave, debugMode);
