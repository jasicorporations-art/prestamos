/**
 * Genera imágenes de splash screen para PWA (Android + iOS)
 * Logo centrado sobre fondo #000000
 * Ejecutar: node scripts/generar-splash.js
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const PUBLIC = path.join(__dirname, '..', 'public')
const ICON = path.join(PUBLIC, 'icon-512x512.png')
const SPLASH_DIR = path.join(PUBLIC, 'splash')

// Tamaños para iOS (ancho x alto)
const SIZES = [
  { w: 1170, h: 2532, name: 'splash-1170x2532.png' },
  { w: 1284, h: 2778, name: 'splash-1284x2778.png' },
  { w: 1290, h: 2796, name: 'splash-1290x2796.png' },
  { w: 750, h: 1334, name: 'splash-750x1334.png' },
  { w: 1242, h: 2688, name: 'splash-1242x2688.png' },
  { w: 828, h: 1792, name: 'splash-828x1792.png' },
  { w: 2048, h: 2732, name: 'splash-2048x2732.png' },
  { w: 1668, h: 2388, name: 'splash-1668x2388.png' },
]

async function generate() {
  if (!fs.existsSync(ICON)) {
    console.error('No se encuentra icon-512x512.png en public/')
    process.exit(1)
  }

  fs.mkdirSync(SPLASH_DIR, { recursive: true })

  for (const { w, h, name } of SIZES) {
    const logoSize = Math.min(512, Math.round(w * 0.35), Math.round(h * 0.35))
    const resizedIcon = await sharp(ICON).resize(logoSize).toBuffer()
    const left = Math.round((w - logoSize) / 2)
    const top = Math.round((h - logoSize) / 2)

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([{ input: resizedIcon, left, top }])
      .png()
      .toFile(path.join(SPLASH_DIR, name))

    console.log('✅', name)
  }

  console.log('\nSplash screens generados en public/splash/')
}

generate().catch(console.error)
