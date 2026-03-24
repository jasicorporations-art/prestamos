import { avatarClienteService } from '@/lib/services/avatarCliente'

export function resolveAvatarUrl(fotoUrl?: string | null): string | null {
  if (!fotoUrl) return null

  const value = String(fotoUrl).trim()
  if (!value) return null

  if (value.startsWith('blob:')) return value
  if (value.startsWith('http://') || value.startsWith('https://')) return value

  return avatarClienteService.getPublicUrl(value)
}
