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

      // Essayer d'accéder aux propriétés internes
      console.log('  Propriétés de nameTree:', Object.keys(nameTree));
      console.log('  toString():', nameTree.toString());
    }
    if (nameTree.map) {
      console.log('  nameTree.map existe');
      console.log('  Taille de la map:', nameTree.map.size);

      // Afficher les clés de la map
      if (nameTree.map.size > 0) {
        console.log('  Clés de la map:');
        for (const [key, value] of nameTree.map.entries()) {
          console.log(`    - ${key}: ${value}`);
        }
      }
    }

    // Essayer d'itérer sur toutes les propriétés
    console.log('\n  Tentative d\'accès direct aux clés PDF:');
    const possibleKeys = ['Names', 'Kids', 'D', 'Limits', 'JS', 'S'];
    for (const key of possibleKeys) {
      try {
        const value = nameTree.get(PDFName.of(key));
        if (value) {
          console.log(`    /${key} existe !`);
          const resolved = context.lookup(value);
          console.log(`      Type: ${resolved.constructor.name}`);
        }
      } catch (e) {
        // Ignorer
      }
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

async function extractJavaScript(pdfPath, shouldSave = false, debugMode = false, listOnly = false, grepPattern = null, filterName = null) {
  try {
    // Charger le PDF
    const existingPdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    console.log(`📄 ${pdfPath}\n`);

    // Extraire le nom de base du PDF pour nommer les fichiers extraits
    const pdfBaseName = pdfPath.replace(/\.pdf$/i, '').replace(/^.*[\/\\]/, '');

    // Tableau pour collecter tous les scripts trouvés
    const allScripts = [];

    // Fonction helper pour afficher et collecter les scripts
    const displayAndCollectScript = (name, code, category) => {
      // Appliquer les filtres
      if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) {
        return false;
      }

      if (grepPattern) {
        const regex = new RegExp(grepPattern, 'i');
        if (!regex.test(code)) {
          return false;
        }
      }

      // Collecter le script
      allScripts.push({ name, code, category });

      // Affichage compact
      if (!listOnly) {
        const preview = code.substring(0, 100).replace(/\n/g, ' ');
        console.log(`📜 ${name}`);

        // Extraire et afficher les URLs si présentes
        const urlPatterns = [
          /app\.launchURL\s*\(\s*["']([^"']+)["']/gi,
          /submitForm\s*\(\s*{[^}]*cURL\s*:\s*["']([^"']+)["']/gi,
          /cURL:\s*["']([^"']+)["']/gi,
          /https?:\/\/[^\s"')}]+/gi
        ];

        const urls = new Set();
        for (const pattern of urlPatterns) {
          let match;
          while ((match = pattern.exec(code)) !== null) {
            urls.add(match[1] || match[0]);
          }
        }

        if (urls.size > 0) {
          urls.forEach(url => {
            console.log(`   🌐 ${url}`);
          });
        }

        if (grepPattern) {
          // Afficher la ligne qui matche
          const lines = code.split('\n');
          const matchingLine = lines.find(line => new RegExp(grepPattern, 'i').test(line));
          if (matchingLine) {
            console.log(`   ↳ ${matchingLine.trim().substring(0, 80)}`);
          }
        } else if (urls.size === 0) {
          console.log(`   ↳ ${preview}${code.length > 100 ? '...' : ''}`);
        }
      } else {
        console.log(`  ${name} (${code.length} chars)`);
      }

      return true;
    };

    // Accéder au catalogue du document
    const catalog = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Root);

    if (debugMode) {
      console.log('🔍 Inspection du catalogue PDF\n');
      console.log('Clés du catalogue:');
      if (catalog.dict && catalog.dict.entries) {
        for (const [key, value] of catalog.dict.entries()) {
          console.log(`  - ${key}`);
        }
      }
      console.log();
    }

    // Chercher le JavaScript dans OpenAction (action à l'ouverture)
    const openActionRef = catalog.get(PDFName.of('OpenAction'));

    if (debugMode) {
      console.log('Vérification de OpenAction:', openActionRef ? '✅ Existe' : '❌ Absent');
      if (openActionRef) {
        console.log('Type de OpenAction ref:', openActionRef.constructor.name);
      }
      console.log();
    }

    // Fonction helper pour extraire JavaScript depuis une action
    const extractJSFromAction = (action, actionName, collected = new Set()) => {
      // Éviter les boucles infinies dans les actions chaînées
      const actionKey = action.toString();
      if (collected.has(actionKey)) {
        return null;
      }
      collected.add(actionKey);

      const sRef = action.get(PDFName.of('S'));
      if (sRef) {
        const actionType = pdfDoc.context.lookup(sRef);
        const actionTypeStr = actionType.asString ? actionType.asString() : actionType.toString();

        if (debugMode) {
          console.log(`  Type d'action: ${actionTypeStr} (${actionName})`);
        }

        if (actionTypeStr === '/JavaScript' || actionTypeStr === 'JavaScript') {
          const jsRef = action.get(PDFName.of('JS'));
          if (jsRef) {
            const jsCode = pdfDoc.context.lookup(jsRef);
            let code = '';

            if (jsCode && typeof jsCode.decodeText === 'function') {
              code = jsCode.decodeText();
            } else if (jsCode && jsCode.asString) {
              code = jsCode.asString();
            }

            if (code) {
              return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            }
          }
        } else if (actionTypeStr === '/SubmitForm' || actionTypeStr === 'SubmitForm') {
          // Actions SubmitForm peuvent contenir des URLs web !
          const fRef = action.get(PDFName.of('F'));
          if (fRef) {
            const fileSpec = pdfDoc.context.lookup(fRef);
            let url = '';

            // L'URL peut être directement dans F ou dans F/FS
            if (fileSpec && fileSpec.decodeText) {
              url = fileSpec.decodeText();
            } else if (fileSpec) {
              const fsRef = fileSpec.get(PDFName.of('FS'));
              if (fsRef) {
                const fs = pdfDoc.context.lookup(fsRef);
                url = fs.decodeText ? fs.decodeText() : fs.toString();
              }
              const fStrRef = fileSpec.get(PDFName.of('F'));
              if (fStrRef && !url) {
                const fStr = pdfDoc.context.lookup(fStrRef);
                url = fStr.decodeText ? fStr.decodeText() : fStr.toString();
              }
            }

            if (url) {
              // Créer un pseudo-JavaScript pour afficher l'URL
              const pseudoCode = `// Action SubmitForm - Appel Web
// Nom: ${actionName}
// URL: ${url}
// Type: ${actionTypeStr}

this.submitForm({
  cURL: "${url}",
  cSubmitAs: "PDF"
});`;
              return pseudoCode;
            }
          }
        } else if (actionTypeStr === '/URI' || actionTypeStr === 'URI') {
          // Actions URI - liens web directs
          const uriRef = action.get(PDFName.of('URI'));
          if (uriRef) {
            const uri = pdfDoc.context.lookup(uriRef);
            const url = uri.decodeText ? uri.decodeText() : uri.toString();

            const pseudoCode = `// Action URI - Lien Web
// Nom: ${actionName}
// URL: ${url}

app.launchURL("${url}", true);`;
            return pseudoCode;
          }
        } else if (debugMode) {
          // En mode debug, logger les types d'actions non-JavaScript
          console.log(`    ℹ️  Action ${actionTypeStr} (pas JavaScript)`);
        }
      }

      // Vérifier les actions chaînées (Next)
      const nextRef = action.get(PDFName.of('Next'));
      if (nextRef) {
        const nextAction = pdfDoc.context.lookup(nextRef);
        // Si Next est un tableau, le parcourir
        if (nextAction && nextAction.size) {
          for (let i = 0; i < nextAction.size(); i++) {
            const nextActionRef = nextAction.lookup(i);
            const nextAct = pdfDoc.context.lookup(nextActionRef);
            const code = extractJSFromAction(nextAct, `${actionName}_Next${i + 1}`, collected);
            if (code) return code;
          }
        } else if (nextAction) {
          // Next est une action unique
          const code = extractJSFromAction(nextAction, `${actionName}_Next`, collected);
          if (code) return code;
        }
      }

      return null;
    };

    if (openActionRef) {
      console.log('🔍 OpenAction trouvé, vérification du JavaScript...\n');
      const openAction = pdfDoc.context.lookup(openActionRef);

      if (debugMode) {
        console.log('Type de OpenAction:', openAction.constructor.name);
        console.log('Contenu:', openAction.toString());
      }

      const code = extractJSFromAction(openAction, 'OpenAction');
      if (code) {
        displayAndCollectScript('OpenAction', code, 'OpenAction');
      }
    }

    // Chercher le JavaScript dans Additional Actions (/AA)
    const aaRef = catalog.get(PDFName.of('AA'));
    if (aaRef) {
      const aa = pdfDoc.context.lookup(aaRef);

      if (debugMode) {
        console.log('🔍 Additional Actions (/AA)');
        if (aa.dict && aa.dict.entries) {
          let hasKeys = false;
          for (const [key, value] of aa.dict.entries()) {
            console.log(`  - ${key}`);
            hasKeys = true;
          }
          if (!hasKeys) console.log('  (vide)');
        }
        console.log();
      }

      // Actions possibles dans /AA
      const actionTypes = ['WC', 'WS', 'DS', 'WP', 'DP', 'WillClose', 'WillSave', 'DidSave', 'WillPrint', 'DidPrint'];

      for (const actionType of actionTypes) {
        const actionRef = aa.get(PDFName.of(actionType));
        if (actionRef) {
          const action = pdfDoc.context.lookup(actionRef);
          const code = extractJSFromAction(action, actionType);
          if (code) {
            displayAndCollectScript(actionType, code, 'AdditionalActions');
          }
        }
      }
    }

    // Fonction helper pour inspecter et extraire JavaScript d'un champ
    const inspectField = (field, fieldIndex) => {
      const fieldName = field.get(PDFName.of('T'));
      const name = fieldName ? pdfDoc.context.lookup(fieldName).decodeText?.() || `Field${fieldIndex}` : `Field${fieldIndex}`;

      // Chercher JavaScript dans /A (Action)
      const actionRef = field.get(PDFName.of('A'));
      if (actionRef) {
        const action = pdfDoc.context.lookup(actionRef);
        const code = extractJSFromAction(action, `${name}_Action`);
        if (code) {
          displayAndCollectScript(`${name}_Action`, code, 'FormField');
        }
      }

      // Chercher JavaScript dans /AA (Additional Actions du champ)
      const fieldAARef = field.get(PDFName.of('AA'));
      if (fieldAARef) {
        const fieldAA = pdfDoc.context.lookup(fieldAARef);
        const fieldActionTypes = ['K', 'F', 'V', 'C', 'Fo', 'Bl', 'PO', 'PC', 'PV', 'PI'];

        for (const actionType of fieldActionTypes) {
          const fieldActionRef = fieldAA.get(PDFName.of(actionType));
          if (fieldActionRef) {
            const fieldAction = pdfDoc.context.lookup(fieldActionRef);
            const code = extractJSFromAction(fieldAction, `${name}_${actionType}`);
            if (code) {
              displayAndCollectScript(`${name}_${actionType}`, code, 'FormField');
            }
          }
        }
      }

      // Vérifier si le champ a des enfants (Kids)
      const kidsRef = field.get(PDFName.of('Kids'));
      if (kidsRef) {
        const kids = pdfDoc.context.lookup(kidsRef);
        if (kids && kids.size && kids.size() > 0) {
          for (let j = 0; j < kids.size(); j++) {
            const kidRef = kids.lookup(j);
            const kid = pdfDoc.context.lookup(kidRef);
            inspectField(kid, `${fieldIndex}_${j + 1}`);
          }
        }
      }
    };

    // Chercher le JavaScript dans les champs de formulaire (/AcroForm)
    const acroFormRef = catalog.get(PDFName.of('AcroForm'));
    if (acroFormRef && !listOnly) {
      console.log('🔍 Champs de formulaire...\n');
      const acroForm = pdfDoc.context.lookup(acroFormRef);

      // D'abord, vérifier l'ordre de calcul (/CO) - contient souvent des champs avec JavaScript
      const coRef = acroForm.get(PDFName.of('CO'));
      if (coRef) {
        const co = pdfDoc.context.lookup(coRef);
        if (co && co.size && co.size() > 0) {
          for (let i = 0; i < co.size(); i++) {
            const fieldRef = co.lookup(i);
            const field = pdfDoc.context.lookup(fieldRef);
            inspectField(field, i + 1);
          }
        }
      } else {
        // Si pas de /CO, parcourir les champs normaux
        const fieldsRef = acroForm.get(PDFName.of('Fields'));
        if (fieldsRef) {
          const fields = pdfDoc.context.lookup(fieldsRef);
          if (fields.size && fields.size() > 0) {
            for (let i = 0; i < fields.size(); i++) {
              const fieldRef = fields.lookup(i);
              const field = pdfDoc.context.lookup(fieldRef);
              inspectField(field, i + 1);
            }
          }
        }
      }
    }

    // Chercher les boutons et annotations sur les pages
    if (!listOnly) {
      console.log('🔍 Annotations sur les pages...\n');
    }
    const pagesRef = catalog.get(PDFName.of('Pages'));
    if (pagesRef) {
      const pagesRoot = pdfDoc.context.lookup(pagesRef);

      // Fonction récursive pour parcourir l'arbre des pages
      const scanPageTree = (pageTreeNode, pageNum = 0) => {
        const typeRef = pageTreeNode.get(PDFName.of('Type'));
        const type = typeRef ? pdfDoc.context.lookup(typeRef).toString() : null;

        if (type === '/Pages') {
          // C'est un nœud intermédiaire, parcourir les enfants
          const kidsRef = pageTreeNode.get(PDFName.of('Kids'));
          if (kidsRef) {
            const kids = pdfDoc.context.lookup(kidsRef);
            if (kids && kids.size && kids.size() > 0) {
              for (let i = 0; i < kids.size(); i++) {
                const kidRef = kids.lookup(i);
                const kid = pdfDoc.context.lookup(kidRef);
                pageNum = scanPageTree(kid, pageNum);
              }
            }
          }
        } else if (type === '/Page') {
          // C'est une page, chercher les annotations
          pageNum++;
          const annotsRef = pageTreeNode.get(PDFName.of('Annots'));

          if (annotsRef) {
            const annots = pdfDoc.context.lookup(annotsRef);

            if (annots && annots.size && annots.size() > 0) {
              for (let j = 0; j < annots.size(); j++) {
                const annotRef = annots.lookup(j);
                const annot = pdfDoc.context.lookup(annotRef);

                // Obtenir le nom de l'annotation (si disponible)
                const tRef = annot.get(PDFName.of('T'));
                const annotName = tRef ? pdfDoc.context.lookup(tRef).decodeText?.() || `Annot${j + 1}` : `Annot${j + 1}`;

                // Chercher les actions sur l'annotation
                const actionRef = annot.get(PDFName.of('A'));
                if (actionRef) {
                  const action = pdfDoc.context.lookup(actionRef);
                  const code = extractJSFromAction(action, `Page${pageNum}_${annotName}_Action`);
                  if (code) {
                    displayAndCollectScript(`Page${pageNum}_${annotName}_Action`, code, 'PageAnnotation');
                  }
                }

                // Chercher les Additional Actions sur l'annotation
                const aaRef = annot.get(PDFName.of('AA'));
                if (aaRef) {
                  const aa = pdfDoc.context.lookup(aaRef);
                  const annotActionTypes = ['E', 'X', 'D', 'U', 'Fo', 'Bl', 'PO', 'PC', 'PV', 'PI'];

                  for (const actionType of annotActionTypes) {
                    const annotActionRef = aa.get(PDFName.of(actionType));
                    if (annotActionRef) {
                      const annotAction = pdfDoc.context.lookup(annotActionRef);
                      const code = extractJSFromAction(annotAction, `Page${pageNum}_${annotName}_${actionType}`);
                      if (code) {
                        displayAndCollectScript(`Page${pageNum}_${annotName}_${actionType}`, code, 'PageAnnotation');
                      }
                    }
                  }
                }
              }
            }
          }
        }

        return pageNum;
      };

      scanPageTree(pagesRoot);
    }

    // ═══════════════════════════════════════════════════════════════════
    // RÉSUMÉ ET SAUVEGARDE
    // ═══════════════════════════════════════════════════════════════════

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 RÉSUMÉ`);
    console.log(`${'─'.repeat(60)}`);

    const byCategory = {};
    allScripts.forEach(script => {
      if (!byCategory[script.category]) {
        byCategory[script.category] = [];
      }
      byCategory[script.category].push(script);
    });

    if (allScripts.length === 0) {
      console.log('❌ Aucun JavaScript trouvé dans ce PDF');
      console.log('\n💡 Ce PDF ne contient peut-être pas de JavaScript, ou il utilise');
      console.log('   une structure non supportée. Utilisez --debug pour plus d\'infos.');
    } else {
      console.log(`✅ Total: ${allScripts.length} script(s) trouvé(s)\n`);

      for (const [category, scripts] of Object.entries(byCategory)) {
        console.log(`   ${category}: ${scripts.length} script(s)`);
      }

      if (listOnly) {
        console.log(`\n📝 Liste des scripts:\n`);
        allScripts.forEach((script, index) => {
          console.log(`${index + 1}. ${script.name} (${script.code.length} chars)`);
        });
      }

      // Sauvegarder les fichiers
      if (shouldSave) {
        console.log(`\n💾 Sauvegarde...\n`);
        allScripts.forEach(script => {
          const fileName = `${pdfBaseName}_extract_${script.name}.js`;
          const fixedCode = fixJavaScriptNewlines(script.code);
          writeFileSync(fileName, fixedCode, 'utf-8');
          console.log(`✅ ${fileName}`);
        });

        // Créer un fichier summary
        const summaryContent = allScripts.map((script, index) => {
          return `// ═══════════════════════════════════════════════════════════
// ${index + 1}. ${script.name} (${script.category})
// ${script.code.length} caractères
// ═══════════════════════════════════════════════════════════

${script.code}

`;
        }).join('\n');

        const summaryFileName = `${pdfBaseName}_ALL_SCRIPTS.js`;
        writeFileSync(summaryFileName, summaryContent, 'utf-8');
        console.log(`\n📋 ${summaryFileName} (tous les scripts dans un fichier)`);
      } else {
        console.log(`\nℹ️  Utilisez --save pour sauvegarder les scripts`);
      }
    }

    console.log(`${'─'.repeat(60)}\n`);

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
  --save              Sauvegarde les scripts extraits dans des fichiers .js
  --debug             Active le mode debug pour diagnostiquer les structures
  --list              Affiche uniquement la liste des scripts (pas le contenu)
  --filter <nom>      Filtre par nom de script/champ (ex: --filter bouton)
  --grep <pattern>    Filtre par contenu (regex, ex: --grep "app.alert")

Recherche d'appels web (URLs):
  Le script détecte automatiquement et affiche les URLs dans:
  - Actions SubmitForm (envoi de formulaire)
  - Actions URI (liens web)
  - app.launchURL() dans le JavaScript
  - submitForm() dans le JavaScript

Exemples:
  node src/extract-js.js file.pdf --list
  node src/extract-js.js file.pdf --save
  node src/extract-js.js file.pdf --filter Page20
  node src/extract-js.js file.pdf --grep "submitForm" --save
  node src/extract-js.js file.pdf --grep "http"
  node src/extract-js.js file.pdf --filter bouton --save
  `);
  process.exit(1);
}

const pdfPath = args[0];
const shouldSave = args.includes('--save');
const debugMode = args.includes('--debug');
const listOnly = args.includes('--list');

// Récupérer les valeurs des options avec paramètres
let filterName = null;
let grepPattern = null;

const filterIndex = args.indexOf('--filter');
if (filterIndex !== -1 && args[filterIndex + 1]) {
  filterName = args[filterIndex + 1];
}

const grepIndex = args.indexOf('--grep');
if (grepIndex !== -1 && args[grepIndex + 1]) {
  grepPattern = args[grepIndex + 1];
}

extractJavaScript(pdfPath, shouldSave, debugMode, listOnly, grepPattern, filterName);
