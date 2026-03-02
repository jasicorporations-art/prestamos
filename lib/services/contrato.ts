import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Venta } from '@/types'
import { pagosService } from './pagos'
import { actividadService } from './actividad'
import { perfilesService } from './perfiles'
import { empresaInfoService } from './empresaInfo'
import { ventasService } from './ventas'
import { EMPRESA } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

/**
 * Calcula el plan de pagos con fechas de vencimiento
 */
type CuotaDetallada = {
  numero_cuota: number
  fecha_pago: string
  cuota_fija: number
}

function calcularPlanPagos(venta: Venta, cuotasDetalladas?: CuotaDetallada[]): Array<{
  numeroCuota: number
  fechaVencimiento: string
  monto: number
}> {
  const plan: Array<{ numeroCuota: number; fechaVencimiento: string; monto: number }> = []
  if (cuotasDetalladas && cuotasDetalladas.length > 0) {
    cuotasDetalladas.forEach((cuota) => {
      plan.push({
        numeroCuota: cuota.numero_cuota,
        fechaVencimiento: new Date(cuota.fecha_pago).toLocaleDateString('es-DO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        monto: Number(cuota.cuota_fija || 0)
      })
    })
    return plan
  }

  const fechaVenta = new Date(venta.fecha_venta)
  const montoPorCuota = venta.monto_total / venta.cantidad_cuotas

  for (let i = 1; i <= venta.cantidad_cuotas; i++) {
    let fechaVencimiento = new Date(fechaVenta)

    switch (venta.tipo_plazo) {
      case 'diario':
        fechaVencimiento.setDate(fechaVencimiento.getDate() + i)
        break
      case 'semanal':
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (i * 7))
        break
      case 'quincenal':
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (i * 15))
        break
      case 'mensual':
      default:
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i)
        if (venta.dia_pago_mensual) {
          fechaVencimiento.setDate(venta.dia_pago_mensual)
        }
        break
    }

    plan.push({
      numeroCuota: i,
      fechaVencimiento: fechaVencimiento.toLocaleDateString('es-DO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      monto: montoPorCuota
    })
  }

  return plan
}

/**
 * Calcula el pago inicial (primer pago con numero_cuota === null)
 */
async function calcularPagoInicial(ventaId: string): Promise<number> {
  try {
    const pagos = await pagosService.getByVenta(ventaId)
    const pagoInicial = pagos.find(p => p.numero_cuota === null)
    return pagoInicial?.monto || 0
  } catch (error) {
    console.error('Error calculando pago inicial:', error)
    return 0
  }
}

/**
 * Genera un Contrato de Financiamiento en PDF
 */
export async function generarContrato(venta: Venta): Promise<void> {
  try {
    // Asegurarse de que la venta tiene todas las relaciones cargadas
    let ventaCompleta = venta
    if (!venta.cliente || !venta.motor) {
      ventaCompleta = await ventasService.getById(venta.id) || venta
    }

    if (!ventaCompleta.cliente || !ventaCompleta.motor) {
      throw new Error('La venta no tiene información completa del cliente o del producto')
    }

    // Calcular pago inicial y monto financiado
    const pagoInicial = await calcularPagoInicial(ventaCompleta.id)
    const montoFinanciado = ventaCompleta.monto_total - pagoInicial

    // Obtener información del administrador como representante legal
    const nombreAdmin = await perfilesService.getNombreCompleto()

    // Obtener información de la empresa
    const nombreEmpresa = await empresaInfoService.getNombreEmpresa()
    const rncEmpresa = await empresaInfoService.getRNC()
    const direccionEmpresa = await empresaInfoService.getDireccionEmpresa()
    const telefonoEmpresa = await empresaInfoService.getTelefonoEmpresa()

    // Cargar cuotas detalladas para usar la cuota fija correcta si existen
    const { data: cuotasDetalladas } = await supabase
      .from('cuotas_detalladas')
      .select('numero_cuota, fecha_pago, cuota_fija')
      .eq('venta_id', ventaCompleta.id)
      .order('numero_cuota', { ascending: true }) as { data: { numero_cuota?: number; fecha_pago?: string; cuota_fija?: number }[] | null }

    const cuotaFija = (cuotasDetalladas || [])[0]?.cuota_fija ?? null

    // Calcular plan de pagos
    const planPagos = calcularPlanPagos(ventaCompleta, cuotasDetalladas as CuotaDetallada[] | undefined)

    // Crear el documento PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPosition = margin

    // ============================================
    // ENCABEZADO
    // ============================================
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const nombreEmpresaDisplay = nombreEmpresa || 'JASICORPORATIONS'
    doc.text(nombreEmpresaDisplay, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const rncEmpresaDisplay = rncEmpresa || 'Pendiente'
    doc.text(`RNC: ${rncEmpresaDisplay}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5

    const direccionEmpresaDisplay = direccionEmpresa || 'Pendiente'
    const direccionLines = doc.splitTextToSize(direccionEmpresaDisplay, pageWidth - (margin * 2))
    direccionLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 5
    })
    const telefonoEmpresaDisplay = telefonoEmpresa || 'Pendiente'
    doc.text(`Teléfono: ${telefonoEmpresaDisplay}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5

    yPosition += 5

    // Línea separadora
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    // ============================================
    // TÍTULO DEL CONTRATO
    // ============================================
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATO DE VENTA CONDICIONAL Y FINANCIAMIENTO', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    const fechaContrato = new Date().toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha: ${fechaContrato}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10

    // ============================================
    // PARTES DEL CONTRATO
    // ============================================
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PARTES DEL CONTRATO', margin, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Datos de la Empresa
    doc.setFont('helvetica', 'bold')
    doc.text('POR LA EMPRESA:', margin, yPosition)
    yPosition += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre/Razón Social: ${nombreEmpresaDisplay}`, margin + 5, yPosition)
    yPosition += 5
    doc.text(`RNC: ${rncEmpresaDisplay}`, margin + 5, yPosition)
    yPosition += 5
    doc.text(`Dirección: ${direccionEmpresaDisplay}`, margin + 5, yPosition)
    yPosition += 5
    doc.text(`Teléfono: ${telefonoEmpresa || EMPRESA.telefono || 'Pendiente'}`, margin + 5, yPosition)
    yPosition += 5
    doc.text(`Representante Legal: ${nombreAdmin || 'Pendiente'}`, margin + 5, yPosition)
    yPosition += 8

    // Datos del Cliente
    doc.setFont('helvetica', 'bold')
    doc.text('POR EL CLIENTE (DEUDOR):', margin, yPosition)
    yPosition += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre Completo: ${ventaCompleta.cliente.nombre_completo}`, margin + 5, yPosition)
    yPosition += 5
    doc.text(`Cédula: ${ventaCompleta.cliente.cedula}`, margin + 5, yPosition)
    yPosition += 5
    doc.text(`Dirección: ${ventaCompleta.cliente.direccion}`, margin + 5, yPosition)
    yPosition += 5
    doc.text(`Teléfono: ${ventaCompleta.cliente.celular || 'No especificado'}`, margin + 5, yPosition)
    yPosition += 5
    if (ventaCompleta.cliente.email) {
      doc.text(`Email: ${ventaCompleta.cliente.email}`, margin + 5, yPosition)
      yPosition += 5
    }
    yPosition += 8

    // Datos del Garante
    doc.setFont('helvetica', 'bold')
    doc.text('POR EL GARANTE (FIADOR SOLIDARIO):', margin, yPosition)
    yPosition += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${ventaCompleta.cliente.nombre_garante || 'No especificado'}`, margin + 5, yPosition)
    yPosition += 5
    if (ventaCompleta.cliente.direccion_garante) {
      doc.text(`Dirección: ${ventaCompleta.cliente.direccion_garante}`, margin + 5, yPosition)
      yPosition += 5
    }
    if (ventaCompleta.cliente.telefono_garante) {
      doc.text(`Teléfono: ${ventaCompleta.cliente.telefono_garante}`, margin + 5, yPosition)
      yPosition += 5
    }
    yPosition += 10

    // ============================================
    // DETALLES DEL PRODUCTO
    // ============================================
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('ARTÍCULO OBJETO DEL FINANCIAMIENTO', margin, yPosition)
    yPosition += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Detalles del Producto', margin, yPosition)
    yPosition += 6

    const datosVehiculo = [
      ['Marca', ventaCompleta.motor.marca || 'N/A'],
      ['Producto', ventaCompleta.motor.numero_chasis || 'N/A'],
      ['Modelo', ventaCompleta.motor.modelo || 'N/A'],
      ['Categoría de Producto', ventaCompleta.motor.categoria || 'N/A'],
      ['Número de Serie (S/N)', ventaCompleta.motor.numero_chasis_real || 'N/A'],
      ['Color', ventaCompleta.motor.color || 'N/A'],
      ['Garantía (Meses)', ventaCompleta.motor.año?.toString() || 'N/A'],
    ]

    autoTable(doc, {
      startY: yPosition,
      head: [['Dato', 'Valor']],
      body: datosVehiculo,
      theme: 'grid',
      headStyles: { fillColor: [74, 144, 226], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // ============================================
    // DATOS DEL FINANCIAMIENTO
    // ============================================
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('TÉRMINOS DEL FINANCIAMIENTO', margin, yPosition)
    yPosition += 8

    const tasaInteres = ventaCompleta.porcentaje_interes || 0
    const gastosManejo = 0 // Para contado siempre es 0
    const esContado = ventaCompleta.tipo_pago === 'contado'

    const datosFinanciamiento = esContado
      ? [
          ['Tipo de Pago', 'Contado'],
          ['Monto Total', `$${ventaCompleta.monto_total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
          ['Ahorro por pago al contado', `$${(ventaCompleta.descuento_contado || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
          ['Gastos de Manejo', `$${gastosManejo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
          ['Pago Único de Liquidación', `$${ventaCompleta.monto_total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
        ]
      : [
          ['Monto Total', `$${ventaCompleta.monto_total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
          ['Pago Inicial', `$${pagoInicial.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
          ['Monto Financiado', `$${montoFinanciado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
          ['Tasa de Interés Anual', `${tasaInteres}%`],
          ['Tasa de Interés Mensual', `${(tasaInteres / 12).toFixed(2)}%`],
          ['Gastos de Manejo', `$${gastosManejo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
          ['Cantidad de Cuotas', ventaCompleta.cantidad_cuotas.toString()],
          ['Tipo de Plazo', ventaCompleta.tipo_plazo === 'semanal' ? 'Semanal' : ventaCompleta.tipo_plazo === 'quincenal' ? 'Quincenal' : ventaCompleta.tipo_plazo === 'diario' ? 'Diario' : 'Mensual'],
          ['Valor por Cuota', `$${((cuotaFija ?? (montoFinanciado / ventaCompleta.cantidad_cuotas))).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`],
        ]

    autoTable(doc, {
      startY: yPosition,
      head: [['Concepto', 'Valor']],
      body: datosFinanciamiento,
      theme: 'grid',
      headStyles: { fillColor: [74, 144, 226], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // ============================================
    // PLAN DE PAGOS
    // ============================================
    if (yPosition > pageHeight - 100) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PLAN DE PAGOS', margin, yPosition)
    yPosition += 8

    const tablaPagos = planPagos.map(cuota => [
      cuota.numeroCuota.toString(),
      cuota.fechaVencimiento,
      `$${cuota.monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Cuota #', 'Fecha de Vencimiento', 'Monto']],
      body: tablaPagos,
      theme: 'grid',
      headStyles: { fillColor: [74, 144, 226], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { left: margin, right: margin },
      pageBreak: 'auto',
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // ============================================
    // CLÁUSULAS LEGALES
    // ============================================
    if (yPosition > pageHeight - 150) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('CLÁUSULAS Y CONDICIONES', margin, yPosition)
    yPosition += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const clausulas = [
      {
        numero: '1.',
        titulo: 'MORA',
        texto: 'En caso de retraso en el pago de cualquier cuota, el DEUDOR se obliga a pagar un recargo por mora equivalente al 3.7% mensual sobre el monto de la cuota vencida, calculado desde la fecha de vencimiento hasta la fecha de pago efectivo.'
      },
      {
        numero: '2.',
        titulo: 'GASTOS DE CIERRE',
        texto: 'Los gastos administrativos y legales del presente préstamo están incluidos en el monto total financiado. El DEUDOR se compromete a cubrir cualquier gasto adicional que pueda surgir por la tramitación de documentos legales relacionados con este contrato.'
      },
      {
        numero: '3.',
        titulo: 'SEGURO',
        texto: 'El DEUDOR se obliga a mantener el artículo objeto de este contrato asegurado durante todo el plazo del financiamiento, con una póliza de seguro que cubra daños materiales y responsabilidad civil, nombrando a la EMPRESA como beneficiaria en caso de siniestro total.'
      },
      {
        numero: '4.',
        titulo: 'INCAUTACIÓN',
        texto: 'En caso de incumplimiento del pago de dos (2) cuotas consecutivas o de más del 30% del monto total adeudado, la EMPRESA tendrá derecho a recuperar inmediatamente el artículo objeto de este contrato, sin necesidad de previo aviso, y el DEUDOR y GARANTE se obligan a facilitar la entrega del mismo.'
      },
      {
        numero: '5.',
        titulo: 'PROPIEDAD',
        texto: 'La propiedad del artículo objeto de este contrato permanecerá en poder de la EMPRESA hasta la cancelación total del financiamiento. Una vez cancelado el monto total, la EMPRESA procederá a transferir la propiedad del artículo al DEUDOR.'
      },
      {
        numero: '6.',
        titulo: 'OBLIGACIONES DEL GARANTE',
        texto: 'El GARANTE se obliga solidariamente con el DEUDOR al cumplimiento de todas las obligaciones contenidas en este contrato, renunciando expresamente al beneficio de excusión y division.'
      },
    ]

    if (ventaCompleta.tipo_pago === 'contado') {
      clausulas.push({
        numero: '7.',
        titulo: 'PAGO ÚNICO',
        texto: 'El cliente liquida la totalidad del equipo mediante pago único, quedando exento de financiamiento y gastos administrativos.'
      })
    }

    clausulas.forEach((clausula) => {
      if (yPosition > pageHeight - 60) {
        doc.addPage()
        yPosition = margin
      }

      doc.setFont('helvetica', 'bold')
      doc.text(`${clausula.numero} ${clausula.titulo}`, margin, yPosition)
      yPosition += 5

      doc.setFont('helvetica', 'normal')
      const textoLines = doc.splitTextToSize(clausula.texto, pageWidth - (margin * 2))
      textoLines.forEach((line: string) => {
        doc.text(line, margin + 5, yPosition)
        yPosition += 4
      })
      yPosition += 5
    })

    // ============================================
    // SECCIÓN DE FIRMAS
    // ============================================
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = margin
    }

    yPosition += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('FIRMAS', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Firmas en tres columnas
    const anchoColumna = (pageWidth - (margin * 2)) / 3
    const xPosiciones = [margin, margin + anchoColumna, margin + (anchoColumna * 2)]

    // Por la Empresa
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('POR LA EMPRESA', xPosiciones[0], yPosition, { align: 'center' })
    yPosition += 25
    doc.setLineWidth(0.5)
    doc.line(xPosiciones[0] - 5, yPosition, xPosiciones[0] + anchoColumna - 10, yPosition)
    yPosition += 5
    doc.setFont('helvetica', 'bold')
    doc.text(nombreAdmin || nombreEmpresa || EMPRESA.nombre, xPosiciones[0], yPosition, { align: 'center' })
    yPosition += 5
    doc.setFont('helvetica', 'normal')
    doc.text('Representante Legal', xPosiciones[0], yPosition, { align: 'center' })
    yPosition += 5
    if (rncEmpresa || EMPRESA.rnc) {
      doc.text(`RNC: ${rncEmpresa || EMPRESA.rnc}`, xPosiciones[0], yPosition, { align: 'center' })
    }

    // Por el Cliente
    yPosition = yPosition - 40
    doc.setFont('helvetica', 'normal')
    doc.text('POR EL CLIENTE (DEUDOR)', xPosiciones[1], yPosition, { align: 'center' })
    yPosition += 25
    doc.line(xPosiciones[1] - 5, yPosition, xPosiciones[1] + anchoColumna - 10, yPosition)
    yPosition += 5
    doc.setFont('helvetica', 'bold')
    doc.text(ventaCompleta.cliente.nombre_completo, xPosiciones[1], yPosition, { align: 'center' })
    yPosition += 5
    doc.setFont('helvetica', 'normal')
    doc.text(`Cédula: ${ventaCompleta.cliente.cedula}`, xPosiciones[1], yPosition, { align: 'center' })

    // Por el Garante
    yPosition = yPosition - 35
    doc.setFont('helvetica', 'normal')
    doc.text('POR EL GARANTE', xPosiciones[2], yPosition, { align: 'center' })
    yPosition += 25
    doc.line(xPosiciones[2] - 5, yPosition, xPosiciones[2] + anchoColumna - 10, yPosition)
    yPosition += 5
    doc.setFont('helvetica', 'bold')
    doc.text(ventaCompleta.cliente.nombre_garante || 'N/A', xPosiciones[2], yPosition, { align: 'center' })
    yPosition += 5
    doc.setFont('helvetica', 'normal')
    doc.text('Fiador Solidario', xPosiciones[2], yPosition, { align: 'center' })

    // ============================================
    // PIE DE PÁGINA Y CÓDIGO QR
    // ============================================
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      
      // Numeración de páginas
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })

      // Código QR de validación (solo en la última página)
      if (i === totalPages) {
        const codigoQR = `CONTRATO-${ventaCompleta.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.text(`Código de Validación: ${codigoQR}`, margin, pageHeight - 15)
      }
    }

    // Guardar el PDF
    const nombreArchivo = `Contrato_${ventaCompleta.cliente.nombre_completo?.replace(/\s+/g, '_') || 'Cliente'}_${Date.now()}.pdf`
    
    // Abrir en nueva ventana para impresión
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    const nuevaVentana = window.open(pdfUrl, '_blank')
    
    if (nuevaVentana) {
      // Esperar a que se cargue y luego preparar para impresión
      nuevaVentana.onload = () => {
        // La ventana está lista, pero no forzamos la impresión automáticamente
        // El usuario puede usar Ctrl+P o Cmd+P para imprimir
      }
    } else {
      // Si no se puede abrir nueva ventana, descargar directamente
      doc.save(nombreArchivo)
    }

    // Registrar actividad
    try {
      await actividadService.registrarActividad(
        `Generó contrato de financiamiento`,
        `Contrato generado para Cliente: ${ventaCompleta.cliente.nombre_completo || 'N/A'} - Artículo: ${ventaCompleta.motor?.marca || 'N/A'} ${ventaCompleta.motor?.modelo || ''}`,
        'venta',
        ventaCompleta.id
      )
    } catch (errorActividad) {
      console.warn('Error registrando actividad:', errorActividad)
    }
  } catch (error: any) {
    console.error('Error generando contrato:', error)
    throw error
  }
}

