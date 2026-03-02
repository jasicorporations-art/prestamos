import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JASICORPORATIONS',
    short_name: 'JASICORPORATIONS',
    description: 'JASICORPORATIONS',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0ea5e9',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['business', 'finance'],
    shortcuts: [
      {
        name: 'Emitir Vehículo',
        short_name: 'Préstamo',
        description: 'Emitir un nuevo vehículo',
        url: '/ventas?action=new',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Registrar Pago',
        short_name: 'Pago',
        description: 'Registrar un nuevo pago',
        url: '/pagos?action=new',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  }
}


