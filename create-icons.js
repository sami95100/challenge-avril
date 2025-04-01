// Script pour générer les icônes (à exécuter avec Node.js)
const fs = require('fs');
const { createCanvas } = require('canvas');

// Tailles d'icônes requises
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Créer le dossier icons s'il n'existe pas
if (!fs.existsSync('./icons')) {
  fs.mkdirSync('./icons');
}

// Fonction pour créer une icône de taille spécifiée
function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Couleurs de Call of Duty MW
  const backgroundColor = '#0a0a0a';
  const borderColor = '#444444';
  const textColor = '#d4af37';  // Or militaire
  
  // Fond
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);
  
  // Bordure militaire
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = size * 0.04;
  ctx.strokeRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);
  
  // Texte "CA"
  ctx.fillStyle = textColor;
  ctx.font = `bold ${size * 0.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CA', size / 2, size / 2);
  
  // Sauvegarder l'image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./icons/icon-${size}x${size}.png`, buffer);
  console.log(`Icône ${size}x${size} créée avec succès`);
}

// Créer chaque taille d'icône
sizes.forEach(createIcon);
console.log('Toutes les icônes ont été créées!'); 