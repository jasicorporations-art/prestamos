import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface CuotaRow {
  numero_cuota: number
  fecha_pago: string
  cuota_fija: number
  interes_mes: number
  abono_capital: number
  saldo_pendiente: number
}

interface PlanPagosEmailProps {
  nombreCliente: string
  ventaId: string
  nombreEmpresa: string
  tablaAmortizacion: CuotaRow[]
}

const PlanPagosEmail = ({
  nombreCliente,
  ventaId,
  nombreEmpresa,
  tablaAmortizacion,
}: PlanPagosEmailProps) => {
  const formatCurrency = (value: number) =>
    value.toLocaleString('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Html>
      <Head />
      <Preview>Tu Plan de Pagos - Préstamo #{ventaId.slice(-6).toUpperCase()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>{nombreEmpresa}</Heading>
            <Text style={logoSubtitle}>PLAN DE PAGOS</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Tu Plan de Pagos - Préstamo #{ventaId.slice(-6).toUpperCase()}</Heading>

            <Text style={paragraph}>
              Estimado/a <strong>{nombreCliente}</strong>,
            </Text>

            <Text style={paragraph}>
              Adjunto encontrarás la tabla de amortización completa de tu préstamo.
              Consulta las fechas de vencimiento y mantén tus pagos al día.
            </Text>

            <Section style={tableWrapper}>
              <table style={table} cellPadding="0" cellSpacing="0">
                <thead>
                  <tr>
                    <th style={th}>Cuota</th>
                    <th style={th}>Fecha</th>
                    <th style={th}>Cuota fija</th>
                    <th style={th}>Interés</th>
                    <th style={th}>Capital</th>
                    <th style={th}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaAmortizacion.map((cuota, idx) => (
                    <tr key={cuota.numero_cuota} style={idx % 2 === 0 ? trEven : trOdd}>
                      <td style={td}>{cuota.numero_cuota}</td>
                      <td style={td}>{formatDate(cuota.fecha_pago)}</td>
                      <td style={td}>{formatCurrency(cuota.cuota_fija)}</td>
                      <td style={td}>{formatCurrency(cuota.interes_mes)}</td>
                      <td style={td}>{formatCurrency(cuota.abono_capital)}</td>
                      <td style={td}>{formatCurrency(cuota.saldo_pendiente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Text style={paragraph}>
              Recuerda pagar antes de la fecha de vencimiento para evitar cargos adicionales.
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

export default PlanPagosEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '620px',
}

const header = {
  backgroundColor: '#059669',
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
  color: '#d1fae5',
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

const tableWrapper = {
  overflowX: 'auto' as const,
  margin: '24px 0',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
}

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
}

const th = {
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  padding: '10px 8px',
  textAlign: 'left' as const,
  fontWeight: '600',
}

const trEven = {
  backgroundColor: '#f9fafb',
}

const trOdd = {
  backgroundColor: '#ffffff',
}

const td = {
  padding: '10px 8px',
  borderBottom: '1px solid #e5e7eb',
  color: '#374151',
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
