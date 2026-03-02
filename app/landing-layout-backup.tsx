import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'JasiCorporations - La manera más inteligente de gestionar tu empresa de préstamos',
  description:
    'Lleva el control de cobros, clientes, garantes y Vehiculos desde un solo lugar. Disponible en cualquier dispositivo.',
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

