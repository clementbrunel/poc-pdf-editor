// JavaScript personnalisé pour le PDF
// Version modifiée du script d'origine

app.alert({
  cMsg: "🎉 Ceci est un PDF avec JavaScript MODIFIÉ !\n\nVous pouvez maintenant éditer le JavaScript dans vos PDFs.",
  cTitle: "PDF Édité avec Succès",
  nIcon: 3
});

console.println("=== PDF Custom Chargé ===");
console.println("Timestamp: " + new Date().toISOString());
console.println("Version: 1.0 Custom");

// Fonction personnalisée
function showDocumentStats() {
  var stats = {
    title: this.info.Title || "Document sans titre",
    pages: this.numPages,
    author: this.info.Author || "Auteur inconnu",
    created: this.info.CreationDate
  };

  var message = "📊 Statistiques du Document\n\n";
  message += "Titre: " + stats.title + "\n";
  message += "Pages: " + stats.pages + "\n";
  message += "Auteur: " + stats.author + "\n";

  console.println(message);
  return stats;
}

// Afficher les statistiques
var docStats = showDocumentStats();
console.println("Document analysé avec succès!");
