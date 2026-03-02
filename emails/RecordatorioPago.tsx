import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface RecordatorioPagoProps {
  nombreCliente: string
  apellidoCliente: string
  telefono: string
  numeroPrestamo: string
  montoAPagar: number
  diasRestantes: number
}

const RecordatorioPago = ({
  nombreCliente,
  apellidoCliente,
  telefono,
  numeroPrestamo,
  montoAPagar,
  diasRestantes,
}: RecordatorioPagoProps) => {
  const nombreCompleto = `${nombreCliente} ${apellidoCliente}`
  const montoFormateado = montoAPagar.toLocaleString('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  })

  return (
    <Html>
      <Head />
      <Preview>Recordatorio de Pago: Tu cuota vence en {diasRestantes.toString()} {diasRestantes === 1 ? 'día' : 'días'}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header con Logo */}
          <Section style={header}>
            <Heading style={logo}>JASICORPORATIONS</Heading>
            <Text style={logoSubtitle}>GESTION DE PRESTAMOS</Text>
          </Section>

          {/* Contenido Principal */}
          <Section style={content}>
            <Heading style={heading}>
              Recordatorio de Pago: Tu cuota vence en {diasRestantes.toString()} {diasRestantes === 1 ? 'día' : 'días'}
            </Heading>
            
            <Text style={paragraph}>
              Estimado/a <strong>{nombreCompleto}</strong>,
            </Text>
            
            <Text style={paragraph}>
              Le recordamos que tiene una cuota pendiente de pago que vence en <strong>{diasRestantes.toString()} {diasRestantes === 1 ? 'día' : 'días'}</strong>.
            </Text>

            {/* Tabla con Información */}
            <Section style={tableContainer}>
              <Row style={tableRow}>
                <Column style={tableHeader}>
                  <Text style={tableHeaderText}>Número de Préstamo</Text>
                </Column>
                <Column style={tableCell}>
                  <Text style={tableCellText}>{numeroPrestamo}</Text>
                </Column>
              </Row>
              
              <Row style={tableRow}>
                <Column style={tableHeader}>
                  <Text style={tableHeaderText}>Nombre</Text>
                </Column>
                <Column style={tableCell}>
                  <Text style={tableCellText}>{nombreCliente}</Text>
                </Column>
              </Row>
              
              <Row style={tableRow}>
                <Column style={tableHeader}>
                  <Text style={tableHeaderText}>Apellido</Text>
                </Column>
                <Column style={tableCell}>
                  <Text style={tableCellText}>{apellidoCliente}</Text>
                </Column>
              </Row>
              
              <Row style={tableRow}>
                <Column style={tableHeader}>
                  <Text style={tableHeaderText}>Teléfono</Text>
                </Column>
                <Column style={tableCell}>
                  <Text style={tableCellText}>{telefono}</Text>
                </Column>
              </Row>
              
              <Row style={{...tableRow, ...lastTableRow}}>
                <Column style={{...tableHeader, ...highlightHeader}}>
                  <Text style={{...tableHeaderText, ...highlightText}}>Monto a Pagar</Text>
                </Column>
                <Column style={{...tableCell, ...highlightCell}}>
                  <Text style={{...tableCellText, ...highlightText}}>{montoFormateado}</Text>
                </Column>
              </Row>
            </Section>

            <Text style={paragraph}>
              Por favor, realice el pago antes de la fecha de vencimiento para evitar cargos adicionales.
            </Text>

            <Text style={paragraph}>
              Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <strong>JASICORPORATIONS GESTION DE PRESTAMOS</strong>
            </Text>
            <Text style={footerText}>
              contacto@jasicorporations.com
            </Text>
            <Text style={footerText}>
              Este es un correo automático, por favor no responda a este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default RecordatorioPago
export { RecordatorioPago }

// Estilos
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
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
}

const logoSubtitle = {
  color: '#e0f2fe',
  fontSize: '14px',
  margin: '4px 0 0 0',
  textAlign: 'center' as const,
  letterSpacing: '1px',
}

const content = {
  padding: '32px 24px',
}

const heading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
}

const tableContainer = {
  margin: '24px 0',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden',
}

const tableRow = {
  borderBottom: '1px solid #e5e7eb',
}

const lastTableRow = {
  borderBottom: 'none',
}

const tableHeader = {
  backgroundColor: '#f9fafb',
  padding: '12px 16px',
  width: '40%',
}

const tableCell = {
  padding: '12px 16px',
  width: '60%',
}

const tableHeaderText = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  textTransform: 'uppercase' as const,
}

const tableCellText = {
  color: '#1f2937',
  fontSize: '16px',
  margin: '0',
  fontWeight: '500',
}

const highlightHeader = {
  backgroundColor: '#dbeafe',
}

const highlightCell = {
  backgroundColor: '#eff6ff',
}

const highlightText = {
  color: '#1e40af',
  fontWeight: 'bold',
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

