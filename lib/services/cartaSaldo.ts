import jsPDF from 'jspdf'
import type { Venta } from '@/types'
import { pagosService } from './pagos'
import { actividadService } from './actividad'
import { perfilesService } from './perfiles'
import { empresaInfoService } from './empresaInfo'
import { EMPRESA } from '@/lib/constants'

/**
 * Verifica si todas las cuotas de un préstamo están pagadas
 */
export async function verificarCuotasPagadas(ventaId: string): Promise<boolean> {
  try {
    // Obtener la venta completa
    const { ventasService } = await import('./ventas')
    const venta = await ventasService.getById(ventaId)
    
    if (!venta) {
      throw new Error('Venta no encontrada')
    }

    // Verificar que el saldo pendiente sea 0
    if (venta.saldo_pendiente > 0) {
      return false
    }

    // Obtener todos los pagos de la venta
    const pagos = await pagosService.getByVenta(ventaId)
    
    // Obtener las cuotas únicas pagadas (usando numero_cuota)
    const cuotasPagadasSet = new Set(
      pagos
        .map(p => p.numero_cuota)
        .filter((n): n is number => n !== null && n !== undefined)
    )
    const cuotasPagadas = cuotasPagadasSet.size

    // Verificar que todas las cuotas estén pagadas
    // También considerar el pago inicial (numero_cuota === null)
    const totalPagado = pagos.length
    const cantidadCuotas = venta.cantidad_cuotas
    
    // Si hay pagos, verificar que el número de cuotas pagadas sea igual a la cantidad de cuotas
    // o que el monto total pagado sea igual o mayor al monto total
    if (cuotasPagadas >= cantidadCuotas) {
      return true
    }

    // Verificación adicional: si el saldo pendiente es 0 y hay pagos, asumir que está pagado
    if (venta.saldo_pendiente === 0 && pagos.length > 0) {
      return true
    }

    return false
  } catch (error) {
    console.error('Error verificando cuotas pagadas:', error)
    return false
  }
}

/**
 * Genera una Carta de Saldo en PDF
 */
export async function generarCartaSaldo(venta: Venta): Promise<void> {
  try {
    // Verificar que todas las cuotas estén pagadas
    const cuotasPagadas = await verificarCuotasPagadas(venta.id)
    
    if (!cuotasPagadas) {
      throw new Error('No se puede generar la carta de saldo porque el préstamo aún tiene cuotas pendientes o saldo pendiente.')
    }

    // Verificar que el saldo pendiente sea 0
    if (venta.saldo_pendiente > 0) {
      throw new Error('No se puede generar la carta de saldo porque el préstamo aún tiene saldo pendiente.')
    }

    // Obtener información del usuario actual para la firma
    const perfil = await perfilesService.getPerfilActual()
    const nombreAdmin = await perfilesService.getNombreCompleto()

    // Obtener información de la empresa
    const nombreEmpresa = await empresaInfoService.getNombreEmpresa()
    const rncEmpresa = await empresaInfoService.getRNC()

    // Crear el documento PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Configurar fuente
    doc.setFont('helvetica')

    // Encabezado - Nombre del Dealer
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    const nombreEmpresaDisplay = nombreEmpresa || 'JASICORPORATIONS'
    doc.text(nombreEmpresaDisplay, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    // Información de la empresa
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const rncEmpresaDisplay = rncEmpresa || 'Pendiente'
    doc.text(`RNC/ID Fiscal: ${rncEmpresaDisplay}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5
    const direccionEmpresa = await empresaInfoService.getDireccionEmpresa()
    const direccionEmpresaDisplay = direccionEmpresa || 'Pendiente'
    doc.text(`Dirección: ${direccionEmpresaDisplay}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5
    const telefonoEmpresa = await empresaInfoService.getTelefonoEmpresa()
    const telefonoEmpresaDisplay = telefonoEmpresa || 'Pendiente'
    doc.text(`Teléfono: ${telefonoEmpresaDisplay}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5
    yPosition += 10

    // Línea separadora
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 15

    // Título del documento
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('CARTA DE SALDO', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Fecha
    const fechaActual = new Date().toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha: ${fechaActual}`, margin, yPosition)
    yPosition += 10

    // Cuerpo del texto
    doc.setFontSize(11)
    const textoCuerpo = `A QUIEN PUEDA INTERESAR:

Por medio de la presente, certificamos que el Sr./Sra. ${venta.cliente?.nombre_completo || 'N/A'}, portador de la cédula ${venta.cliente?.cedula || 'N/A'}, ha cancelado en su totalidad el compromiso financiero correspondiente al préstamo del vehículo:

Marca/Modelo: ${venta.motor?.marca || 'N/A'} ${venta.motor?.modelo || ''}
Año: ${venta.motor?.año || 'N/A'}
Chasis: ${venta.motor?.numero_chasis || 'N/A'}
Placa: ${venta.motor?.matricula || 'N/A'}

A la fecha, el cliente se encuentra libre de toda responsabilidad económica con nuestra institución respecto a este contrato, autorizando el levantamiento de cualquier restricción sobre la matrícula del vehículo mencionado.`

    // Dividir el texto en líneas que caben en el ancho de la página
    const maxWidth = pageWidth - (margin * 2)
    const lineas = doc.splitTextToSize(textoCuerpo, maxWidth)
    
    // Agregar cada línea al documento
    lineas.forEach((linea: string) => {
      if (yPosition > pageHeight - 60) {
        // Si nos quedamos sin espacio, agregar nueva página
        doc.addPage()
        yPosition = margin
      }
      doc.text(linea, margin, yPosition)
      yPosition += 6
    })

    yPosition += 10

    // Firma y sello
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      yPosition = margin
    }

    // Firma digital
    doc.setFontSize(10)
    doc.text(`Firma Digital: ${nombreAdmin}`, margin, yPosition)
    yPosition += 5
    doc.text(`Administrador`, margin, yPosition)
    yPosition += 15

    // Código QR de seguridad (usando texto como placeholder)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    const codigoSeguridad = `COD-${venta.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`
    doc.text(`Código de Seguridad: ${codigoSeguridad}`, margin, yPosition)
    yPosition += 5
    doc.text(`Fecha de Emisión: ${fechaActual}`, margin, yPosition)

    // Guardar el PDF
    const nombreArchivo = `Carta_Saldo_${venta.cliente?.nombre_completo?.replace(/\s+/g, '_') || 'Cliente'}_${Date.now()}.pdf`
    doc.save(nombreArchivo)

    // Registrar actividad
    try {
      await actividadService.registrarActividad(
        `Generó carta de saldo`,
        `Carta de saldo generada para Cliente: ${venta.cliente?.nombre_completo || 'N/A'} - Vehículo: ${venta.motor?.marca || 'N/A'} ${venta.motor?.modelo || ''}`,
        'venta',
        venta.id
      )
    } catch (errorActividad) {
      console.warn('Error registrando actividad:', errorActividad)
      // No interrumpir el proceso si falla el registro de actividad
    }
  } catch (error: any) {
    console.error('Error generando carta de saldo:', error)
    throw error
  }
}

