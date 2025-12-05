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

```bash
node src/extract-js.js sample.pdf --save
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
npm run edit sample.pdf mon-script.js output.pdf
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
npm run extract sample.pdf --save

# Étape 3 : Modifier le fichier extracted_SampleScript.js

# Étape 4 : Créer un nouveau PDF avec le JavaScript modifié
npm run edit sample.pdf extracted_SampleScript.js custom-output.pdf

# Étape 5 : Vérifier le résultat
npm run extract custom-output.pdf
```

## 📂 Structure du projet

```
poc-pdf-editor/
├── src/
│   ├── extract-js.js         # Extraction du JavaScript
│   ├── edit-js.js             # Édition et création de PDF
│   └── create-sample-pdf.js   # Création d'exemples
├── package.json
└── README.md
```

## 🛠️ Exemples d'utilisation

### Exemple 1 : Modifier un message d'alerte

1. Créer un fichier `custom-alert.js` :

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
npm run edit sample.pdf custom-alert.js my-custom.pdf MyAlert
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
npm run edit sample.pdf interactive.js interactive-doc.pdf
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

### Erreur : "Aucun JavaScript trouvé"

- Vérifiez que le PDF contient réellement du JavaScript
- Tous les PDFs ne contiennent pas de scripts
- Utilisez `npm run create-sample` pour tester avec un PDF d'exemple

### Erreur lors de la lecture du PDF

- Assurez-vous que le fichier PDF n'est pas corrompu
- Vérifiez que le chemin du fichier est correct
- Certains PDFs protégés ou chiffrés peuvent ne pas fonctionner

## 📝 License

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📧 Contact

Pour toute question ou suggestion, ouvrez une issue sur GitHub.
