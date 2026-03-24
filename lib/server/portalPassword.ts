import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import {
  tienePortalPasswordConfigurada,
} from '@/lib/portal-password-configurada'

const KEYLEN = 64
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const

/** Hash para guardar en `clientes.portal_password` (nunca texto plano). */
export function hashPortalPassword(plain: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(plain, salt, KEYLEN, SCRYPT_OPTS)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export function verifyPortalPassword(plain: string, stored: string | null | undefined): boolean {
  if (!tienePortalPasswordConfigurada(stored)) return false
  const parts = String(stored).split('$')
  if (parts.length !== 3) return false
  const [, saltB64, hashB64] = parts
  try {
    const salt = Buffer.from(saltB64, 'base64url')
    const expected = Buffer.from(hashB64, 'base64url')
    if (expected.length !== KEYLEN) return false
    const hash = scryptSync(plain, salt, KEYLEN, SCRYPT_OPTS)
    return timingSafeEqual(hash, expected)
  } catch {
    return false
  }
}

export { tienePortalPasswordConfigurada } from '@/lib/portal-password-configurada'
