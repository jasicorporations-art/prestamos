import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface ReciboPagoEmailProps {
  nombreCliente: string
  numeroRecibo: string
  nombreEmpresa: string
  montoPagado: number
  fechaPago: string
  balanceRestante: number
  /** Si se define, se muestra este texto en lugar del balance formateado (ej. "No disponible" cuando faltan columnas en BD). */
  balanceRestanteTexto?: string
  /** Texto ya formateado (ej. "0", "5") para evitar pasar número 0 al render y error "0 is not a function" */
  cuotasRestantesTexto?: string
  cuotasRestantesEsUno?: boolean
  linkPrestamo: string
}

/** Garantiza un número válido para .toLocaleString (evita NaN o tipos que fallen en el servidor). */
function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value) && value !== Infinity && value !== -Infinity) return value
  const n = Number(value)
  return Number.isNaN(n) ? 0 : n
}

const ReciboPagoEmail = ({
  nombreCliente,
  numeroRecibo,
  nombreEmpresa,
  montoPagado,
  fechaPago,
  balanceRestante,
  balanceRestanteTexto,
  cuotasRestantesTexto,
  cuotasRestantesEsUno,
  linkPrestamo,
}: ReciboPagoEmailProps) => {
  const montoNum = toSafeNumber(montoPagado)
  const balanceNum = toSafeNumber(balanceRestante)
  const montoFormateado = montoNum.toLocaleString('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  })
  const balanceFormateado =
    balanceRestanteTexto != null && balanceRestanteTexto !== ''
      ? balanceRestanteTexto
      : balanceNum.toLocaleString('es-DO', {
          style: 'currency',
          currency: 'DOP',
          minimumFractionDigits: 2,
        })

  return (
    <Html>
      <Head />
      <Preview>Recibo de Pago #{numeroRecibo} - {nombreEmpresa}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>{nombreEmpresa}</Heading>
            <Text style={logoSubtitle}>RECIBO DE PAGO</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Recibo de Pago #{numeroRecibo}</Heading>

            <Text style={paragraph}>
              Estimado/a <strong>{nombreCliente}</strong>,
            </Text>

            <Text style={paragraph}>
              Confirmamos la recepción de su pago. A continuación los detalles:
            </Text>

            <Section style={card}>
              <Text style={cardLabel}>Monto pagado</Text>
              <Text style={cardValue}>{montoFormateado}</Text>

              <Text style={cardLabel}>Fecha de pago</Text>
              <Text style={cardValue}>{fechaPago}</Text>

              <Text style={cardLabel}>Balance restante</Text>
              <Text style={{ ...cardValue, ...highlightValue }}>{balanceFormateado}</Text>

              {cuotasRestantesTexto != null && cuotasRestantesTexto !== '' && (
                <>
                  <Text style={cardLabel}>Cuotas restantes</Text>
                  <Text style={cardValue}>{cuotasRestantesTexto} {cuotasRestantesEsUno ? 'cuota' : 'cuotas'}</Text>
                </>
              )}
            </Section>

            <Section style={buttonSection}>
              <Button style={button} href={linkPrestamo}>
                Ver préstamo en la PWA
              </Button>
            </Section>

            <Text style={paragraph}>
              Si tiene alguna pregunta, no dude en contactarnos.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>Este es un correo automático. No responder.</Text>
            <Text style={footerText}>{nombreEmpresa}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ReciboPagoEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#0ea5e9',
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const logoSubtitle = {
  color: '#e0f2fe',
  fontSize: '12px',
  margin: '4px 0 0 0',
  letterSpacing: '1px',
}

const content = {
  padding: '32px 24px',
}

const heading = {
  color: '#1f2937',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 24px 0',
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
}

const card = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const cardLabel = {
  color: '#6b7280',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px 0',
}

const cardValue = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const highlightValue = {
  color: '#059669',
  fontSize: '20px',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

const button = {
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontWeight: '600',
  textDecoration: 'none',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const footer = {
  padding: '0 24px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
}
