import { NextRequest, NextResponse } from 'next/server'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { obtenerRecordatoriosPendientes } from '@/lib/services/recordatorios'
import RecordatorioPago from '@/emails/RecordatorioPago'
import { render } from '@react-email/render'
import React from 'react'

// Marcar esta ruta como dinámica
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface EnviarRecordatorioBody {
  email?: string
  cuotaId?: string
  enviarTodos?: boolean
}

/**
 * POST /api/enviar-recordatorio
 * 
 * Envía correos de recordatorio de pago
 * 
 * Body opciones:
 * - email: Email específico del cliente (opcional)
 * - cuotaId: ID de cuota específica (opcional)
 * - enviarTodos: Si es true, envía a todos los que tienen cuotas vencidas en 2 días (opcional)
 * 
 * Ejemplo:
 * POST /api/enviar-recordatorio
 * {
 *   "enviarTodos": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar que Resend esté configurado
    if (!resend) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resend no está configurado. Por favor, configura RESEND_API_KEY en las variables de entorno.',
        },
        { status: 500 }
      )
    }

    const body: EnviarRecordatorioBody = await request.json()
    const { email, cuotaId, enviarTodos } = body

    // Si se solicita enviar a todos
    if (enviarTodos) {
      const recordatorios = await obtenerRecordatoriosPendientes()
      
      // Si no hay recordatorios, retornar mensaje informativo
      if (recordatorios.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No hay recordatorios pendientes para enviar',
          enviados: 0,
          fallidos: 0,
          resultados: [],
        })
      }
      
      const resultados = []

      for (const recordatorio of recordatorios) {
        const cuota = recordatorio.cuota
        const cliente = cuota.cliente

        // Extraer nombre y apellido del nombre completo
        // Asumimos formato: "Nombre Apellido" o "Nombre Apellido1 Apellido2"
        const partesNombre = cliente.nombre_completo.trim().split(/\s+/)
        const nombreCliente = partesNombre[0] || cliente.nombre_completo
        const apellidoCliente = partesNombre.length > 1 
          ? partesNombre.slice(1).join(' ') 
          : ''

        // Obtener email del cliente (si no tiene, usar el teléfono como fallback)
        const emailCliente = cliente.email || `${cliente.celular || cliente.cedula}@temp.jasicorporations.com`

        // Solo enviar si el cliente tiene email válido
        if (cliente.email && cliente.email.includes('@')) {
          try {
            const emailHtml = await render(
              React.createElement(RecordatorioPago, {
                nombreCliente,
                apellidoCliente,
                telefono: cliente.celular || cuota.telefono || 'N/A',
                numeroPrestamo: cuota.motor.numero_chasis,
                montoAPagar: cuota.totalAPagar,
                diasRestantes: recordatorio.diasRestantes,
              })
            )

            const { data, error } = await resend.emails.send({
              from: FROM_EMAIL,
              to: cliente.email,
              subject: `Recordatorio de Pago: Tu cuota vence en ${recordatorio.diasRestantes} ${recordatorio.diasRestantes === 1 ? 'día' : 'días'}`,
              html: emailHtml,
            })

            if (error) {
              resultados.push({
                cliente: cliente.nombre_completo,
                email: cliente.email,
                success: false,
                error: error.message,
              })
            } else {
              resultados.push({
                cliente: cliente.nombre_completo,
                email: cliente.email,
                success: true,
                emailId: data?.id,
              })
            }
          } catch (error: any) {
            resultados.push({
              cliente: cliente.nombre_completo,
              email: cliente.email,
              success: false,
              error: error.message || 'Error desconocido',
            })
          }
        } else {
          resultados.push({
            cliente: cliente.nombre_completo,
            email: cliente.email || 'No tiene email',
            success: false,
            error: 'Cliente no tiene email válido',
          })
        }
      }

      const exitosos = resultados.filter(r => r.success).length
      const fallidos = resultados.filter(r => !r.success).length

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${resultados.length} recordatorios`,
        enviados: exitosos,
        fallidos: fallidos,
        resultados,
      })
    }

    // Si se especifica un email específico
    if (email) {
      const recordatorios = await obtenerRecordatoriosPendientes()
      const recordatorio = recordatorios.find(
        r => r.cuota.cliente.email === email || r.cuota.cliente.nombre_completo.toLowerCase().includes(email.toLowerCase())
      )

      if (!recordatorio) {
        return NextResponse.json(
          {
            success: false,
            error: 'No se encontró un recordatorio para el email especificado',
          },
          { status: 404 }
        )
      }

      const cuota = recordatorio.cuota
      const cliente = cuota.cliente

      const partesNombre = cliente.nombre_completo.trim().split(/\s+/)
      const nombreCliente = partesNombre[0] || cliente.nombre_completo
      const apellidoCliente = partesNombre.length > 1 
        ? partesNombre.slice(1).join(' ') 
        : ''

      const emailHtml = await render(
        React.createElement(RecordatorioPago, {
          nombreCliente,
          apellidoCliente,
          telefono: cliente.celular || cuota.telefono || 'N/A',
          numeroPrestamo: cuota.motor.numero_chasis,
          montoAPagar: cuota.totalAPagar,
          diasRestantes: recordatorio.diasRestantes,
        })
      )

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Recordatorio de Pago: Tu cuota vence en ${recordatorio.diasRestantes} ${recordatorio.diasRestantes === 1 ? 'día' : 'días'}`,
        html: emailHtml,
      })

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Correo enviado exitosamente',
        emailId: data?.id,
      })
    }

    // Si se especifica un cuotaId
    if (cuotaId) {
      const recordatorios = await obtenerRecordatoriosPendientes()
      const recordatorio = recordatorios.find(r => r.cuota.id === cuotaId)

      if (!recordatorio) {
        return NextResponse.json(
          {
            success: false,
            error: 'No se encontró el recordatorio especificado',
          },
          { status: 404 }
        )
      }

      const cuota = recordatorio.cuota
      const cliente = cuota.cliente

      if (!cliente.email || !cliente.email.includes('@')) {
        return NextResponse.json(
          {
            success: false,
            error: 'El cliente no tiene un email válido',
          },
          { status: 400 }
        )
      }

      const partesNombre = cliente.nombre_completo.trim().split(/\s+/)
      const nombreCliente = partesNombre[0] || cliente.nombre_completo
      const apellidoCliente = partesNombre.length > 1 
        ? partesNombre.slice(1).join(' ') 
        : ''

      const emailHtml = await render(
        React.createElement(RecordatorioPago, {
          nombreCliente,
          apellidoCliente,
          telefono: cliente.celular || cuota.telefono || 'N/A',
          numeroPrestamo: cuota.motor.numero_chasis,
          montoAPagar: cuota.totalAPagar,
          diasRestantes: recordatorio.diasRestantes,
        })
      )

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: cliente.email,
        subject: `Recordatorio de Pago: Tu cuota vence en ${recordatorio.diasRestantes} ${recordatorio.diasRestantes === 1 ? 'día' : 'días'}`,
        html: emailHtml,
      })

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Correo enviado exitosamente',
        emailId: data?.id,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Debe especificar email, cuotaId o enviarTodos en el body',
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error enviando recordatorio:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al enviar el correo',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/enviar-recordatorio
 * 
 * Obtiene información sobre los recordatorios pendientes sin enviar correos
 */
export async function GET() {
  try {
    const recordatorios = await obtenerRecordatoriosPendientes()

    return NextResponse.json({
      success: true,
      count: recordatorios.length,
      recordatorios: recordatorios.map(r => ({
        cuotaId: r.cuota.id,
        cliente: r.cuota.cliente.nombre_completo,
        email: r.cuota.cliente.email || 'No tiene email',
        telefono: r.cuota.cliente.celular || r.cuota.telefono,
        numeroPrestamo: r.cuota.motor.numero_chasis,
        montoAPagar: r.cuota.totalAPagar,
        diasRestantes: r.diasRestantes,
      })),
    })
  } catch (error: any) {
    console.error('Error obteniendo recordatorios:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener recordatorios',
      },
      { status: 500 }
    )
  }
}

