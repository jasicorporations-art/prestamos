const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImage = path.join(__dirname, '..', 'public', 'iconos.png');
const publicDir = path.join(__dirname, '..', 'public');

// Verificar que la imagen original existe
if (!fs.existsSync(inputImage)) {
  console.error('❌ Error: No se encontró iconos.png en la carpeta public/');
  console.error('   Por favor, coloca tu imagen en: public/iconos.png');
  process.exit(1);
}

// Tamaños necesarios para la PWA
const sizes = [
  { name: 'favicon.ico', size: 32, format: 'png' }, // Se convertirá a ico después
  { name: 'apple-touch-icon.png', size: 180, format: 'png' },
  { name: 'icon-192x192.png', size: 192, format: 'png' },
  { name: 'icon-512x512.png', size: 512, format: 'png' },
];

async function generarIconos() {
  console.log('🎨 Generando iconos desde:', inputImage);
  
  try {
    // Generar todos los iconos
    for (const { name, size, format } of sizes) {
      const outputPath = path.join(publicDir, name);
      
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Fondo transparente
        })
        .toFormat(format)
        .toFile(outputPath);
      
      console.log(`✅ Generado: ${name} (${size}x${size})`);
    }

    // Generar favicon.ico (32x32)
    const faviconPng = path.join(publicDir, 'favicon-temp.png');
    await sharp(inputImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFormat('png')
      .toFile(faviconPng);

    // Convertir PNG a ICO (usando sharp para crear un ICO simple)
    // Nota: sharp no soporta ICO directamente, así que usaremos PNG como favicon
    // Los navegadores modernos aceptan PNG como favicon
    const faviconPath = path.join(publicDir, 'favicon.ico');
    fs.copyFileSync(faviconPng, faviconPath);
    fs.unlinkSync(faviconPng); // Eliminar temporal
    
    console.log('✅ Generado: favicon.ico (32x32)');
    console.log('\n✨ ¡Todos los iconos han sido generados exitosamente!');
    console.log('\n📁 Archivos creados en public/:');
    sizes.forEach(({ name }) => {
      console.log(`   - ${name}`);
    });
    console.log('   - favicon.ico');
    
  } catch (error) {
    console.error('❌ Error generando iconos:', error);
    process.exit(1);
  }
}

generarIconos();



