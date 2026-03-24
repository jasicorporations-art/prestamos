import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'cliente_portal_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 horas

type SessionPayload = {
  cliente_id: string
  empresa_id: string
  exp: number
}

function getSecret(): string {
  return (
    process.env.CLIENTE_PORTAL_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'cliente-portal-dev-secret'
  )
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function buildClientePortalSession(cliente_id: string, empresa_id: string): string {
  const payload: SessionPayload = {
    cliente_id,
    empresa_id,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const body = b64urlEncode(JSON.stringify(payload))
  const signature = sign(body)
  return `${body}.${signature}`
}

export function readClientePortalSession(raw: string | undefined | null): SessionPayload | null {
  if (!raw || !raw.includes('.')) return null
  const [body, signature] = raw.split('.', 2)
  const expected = sign(body)
  const ok =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!ok) return null
  try {
    const payload = JSON.parse(b64urlDecode(body)) as SessionPayload
    if (!payload?.cliente_id || !payload?.empresa_id || !payload?.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export const CLIENTE_PORTAL_COOKIE_NAME = COOKIE_NAME
