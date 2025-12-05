# POC PDF JavaScript Editor

Un projet Node.js permettant de visualiser et d'éditer le JavaScript contenu dans des fichiers PDF en utilisant la bibliothèque **pdf-lib**.

## 🎯 Fonctionnalités

- ✅ **Extraire** le JavaScript d'un PDF existant
- ✅ **Visualiser** le code JavaScript dans la console
- ✅ **Éditer** le JavaScript et créer une nouvelle version du PDF
- ✅ **Préserver** le PDF original (aucune modification du fichier source)
- ✅ **Créer** des PDFs d'exemple avec JavaScript intégré

## 📋 Prérequis

- Node.js 18+ (testé avec Node 22.14)
- npm

## 🚀 Installation

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd poc-pdf-editor

# Installer les dépendances
npm install
```

## 📖 Utilisation

### 1. Créer un PDF d'exemple

Pour commencer rapidement, créez un PDF d'exemple contenant du JavaScript :

```bash
npm run create-sample
```

Cela génère un fichier `sample.pdf` avec du JavaScript intégré.

Vous pouvez aussi spécifier un nom de fichier personnalisé :

```bash
node src/create-sample-pdf.js mon-exemple.pdf
```

### 2. Extraire le JavaScript d'un PDF

Pour visualiser le JavaScript contenu dans un PDF :

```bash
npm run extract sample.pdf
```

#### Options :

- **`--save`** : Sauvegarde les scripts extraits dans des fichiers `.js`
- **`--debug`** : Active le mode debug pour diagnostiquer les structures non supportées

```bash
# Sauvegarder les scripts extraits
node src/extract-js.js sample.pdf --save

# Mode debug pour diagnostiquer les problèmes
node src/extract-js.js problematic.pdf --debug

# Combiner les deux options
node src/extract-js.js sample.pdf --save --debug
```

#### Exemple de sortie :

```
📄 Analyse du PDF: sample.pdf

============================================================
📜 Script: SampleScript
============================================================

// Script JavaScript d'exemple intégré dans le PDF
// Ce code s'exécute à l'ouverture du document

app.alert({
  cMsg: "Bienvenue !",
  cTitle: "Demo",
  nIcon: 3
});

============================================================

✅ Total: 1 script(s) JavaScript trouvé(s)
```

### 3. Éditer le JavaScript dans un PDF

Pour remplacer ou ajouter du JavaScript dans un PDF :

```bash
npm run edit sample.pdf sample_custom.js sample-custom.pdf
```

#### Paramètres :

1. **PDF source** : Le fichier PDF à lire
2. **Fichier JavaScript** : Le fichier `.js` contenant votre nouveau code
3. **PDF destination** : Le nom du nouveau PDF à créer
4. **Nom du script** *(optionnel)* : Nom du script dans le PDF (défaut: `CustomScript`)

#### Exemple complet :

```bash
# Étape 1 : Créer un PDF d'exemple
npm run create-sample

# Étape 2 : Extraire le JavaScript
npm run extract sample.pdf -- --save

# Étape 3 : Modifier le fichier sample_extract.js et le sauvegarder en sample_custom.js

# Étape 4 : Créer un nouveau PDF avec le JavaScript modifié
npm run edit sample.pdf sample_custom.js sample-custom.pdf

# Étape 5 : Vérifier le résultat
npm run extract sample-custom.pdf
```

## 📂 Structure du projet

```
poc-pdf-editor/
├── src/
│   ├── extract-js.js         # Extraction du JavaScript
│   ├── edit-js.js             # Édition et création de PDF
│   └── create-sample-pdf.js   # Création d'exemples
├── sample_custom.js           # Exemple de JavaScript personnalisé
├── package.json
└── README.md
```

## 🛠️ Exemples d'utilisation

### Exemple 1 : Modifier un message d'alerte

1. Créer un fichier `sample_custom.js` :

```javascript
app.alert({
  cMsg: "Ceci est mon message personnalisé !",
  cTitle: "Mon PDF Custom",
  nIcon: 3
});

console.println("PDF personnalisé chargé !");
```

2. Créer un nouveau PDF :

```bash
npm run edit sample.pdf sample_custom.js sample-custom.pdf MyAlert
```

### Exemple 2 : Ajouter des fonctionnalités interactives

1. Créer un fichier `interactive.js` :

```javascript
// Fonction pour calculer la date d'expiration
function calculateExpiration(days) {
  var now = new Date();
  var expiration = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  return expiration.toLocaleDateString();
}

// Afficher une alerte avec la date d'expiration
var expirationDate = calculateExpiration(30);
app.alert({
  cMsg: "Ce document expire le : " + expirationDate,
  cTitle: "Information d'expiration",
  nIcon: 1
});

// Ajouter un bouton personnalisé
this.addScript("MonScript", "app.alert('Action personnalisée !');");
```

2. Intégrer dans un PDF :

```bash
npm run edit sample.pdf interactive.js interactive-custom.pdf
```

## 📚 API JavaScript PDF (Acrobat)

Les PDFs peuvent exécuter du JavaScript en utilisant l'API Adobe Acrobat. Voici quelques fonctions courantes :

- `app.alert()` - Afficher une boîte de dialogue
- `console.println()` - Écrire dans la console JavaScript
- `this.info` - Accéder aux métadonnées du document
- `this.numPages` - Nombre de pages
- `this.getField()` - Accéder aux champs de formulaire

Pour plus d'informations : [Adobe Acrobat JavaScript Reference](https://www.adobe.com/devnet/acrobat/javascript.html)

## ⚠️ Limitations

- Le JavaScript dans les PDFs est exécuté par le lecteur PDF (Adobe Acrobat, etc.)
- Tous les lecteurs PDF ne supportent pas JavaScript
- Les fonctionnalités disponibles dépendent du lecteur utilisé
- Ce projet ne peut pas **exécuter** le JavaScript, seulement l'extraire et le modifier

## 🔧 Dépannage

### Erreur : "Structure JavaScript invalide"

Si vous obtenez cette erreur avec un PDF qui fonctionne en production :

1. **Utilisez le mode debug** pour voir la structure :
   ```bash
   node src/extract-js.js votre-fichier.pdf --debug
   ```

2. **Structures supportées** :
   - ✅ Name Tree avec tableau `Names` direct
   - ✅ Name Tree avec sous-arbres `Kids`
   - ❌ JavaScript dans `OpenAction` (non encore supporté)
   - ❌ JavaScript dans les champs de formulaire (non encore supporté)

3. **Solutions** :
   - Regardez la sortie du mode debug pour comprendre la structure
   - Ouvrez une issue sur GitHub avec les informations de debug
   - Essayez de régénérer le PDF avec Adobe Acrobat

### Erreur : "Aucun JavaScript trouvé"

- Vérifiez que le PDF contient réellement du JavaScript
- Tous les PDFs ne contiennent pas de scripts
- Utilisez `npm run create-sample` pour tester avec un PDF d'exemple

### Erreur lors de la lecture du PDF

- Assurez-vous que le fichier PDF n'est pas corrompu
- Vérifiez que le chemin du fichier est correct
- Certains PDFs protégés ou chiffrés peuvent ne pas fonctionner

### Le fichier .js extrait a des erreurs de syntaxe

Cela ne devrait plus arriver avec la dernière version. Si c'est le cas :
- Vérifiez que vous utilisez la dernière version du code
- Le script échappe automatiquement les retours à la ligne dans les chaînes
- Testez avec `node -c fichier_extract.js` pour valider la syntaxe

## 📝 License

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📧 Contact

Pour toute question ou suggestion, ouvrez une issue sur GitHub.
