'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Send, Clock, AlertCircle, CreditCard, CheckCircle, Smartphone } from 'lucide-react'
import { WhatsAppCupoBanner } from '@/components/WhatsAppCupoBanner'
import { WhatsappLink } from '@/components/WhatsappLink'
import { Input } from '@/components/Input'
import { authService } from '@/lib/services/auth'
import { obtenerRecordatoriosPendientes, type Recordatorio } from '@/lib/services/recordatorios'
import { Button } from '@/components/Button'
import { toast } from '@/lib/toast'

type ConfigWhatsApp = {
  metodo_envio: string
  evolution_base_url: string | null
  evolution_instance: string | null
  evolution_apikey: string | null
}

export default function RecordatoriosPage() {
  const searchParams = useSearchParams()
  const [hasPremium, setHasPremium] = useState<boolean | null>(null)
  const [hasEvolutionPremium, setHasEvolutionPremium] = useState<boolean | null>(null)
  const [configWhatsApp, setConfigWhatsApp] = useState<ConfigWhatsApp | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [enviados, setEnviados] = useState<Set<string>>(new Set())
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [evolutionCheckoutLoading, setEvolutionCheckoutLoading] = useState(false)
  const [configSaveLoading, setConfigSaveLoading] = useState(false)
  const [evolutionBaseUrl, setEvolutionBaseUrl] = useState('')
  const [evolutionInstance, setEvolutionInstance] = useState('')
  const [evolutionApikey, setEvolutionApikey] = useState('')

  // Acceso si tiene WhatsApp Premium (Twilio) O Evolution
  const hasAcceso = hasPremium === true || hasEvolutionPremium === true

  useEffect(() => {
    const check = async () => {
      try {
        const session = await authService.getSession()
        const headers: Record<string, string> = {}
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        const [premiumRes, evolutionRes] = await Promise.all([
          fetch('/api/whatsapp-premium', { headers }),
          fetch('/api/whatsapp-evolution-premium', { headers }),
        ])
        const premiumData = await premiumRes.json().catch(() => ({}))
        const evolutionData = await evolutionRes.json().catch(() => ({}))
        setHasPremium(!!premiumData.tienePremium)
        setHasEvolutionPremium(!!evolutionData.tieneEvolutionPremium)
      } catch {
        setHasPremium(false)
        setHasEvolutionPremium(false)
      }
    }
    check()
    if (searchParams.get('success') === 'true' || searchParams.get('evolution_success') === 'true') {
      const t = setTimeout(check, 2500)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  useEffect(() => {
    if (!hasAcceso) return
    const load = async () => {
      const session = await authService.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      setConfigLoading(true)
      try {
        const [evRes, cfgRes] = await Promise.all([
          fetch('/api/whatsapp-evolution-premium', { headers }),
          fetch('/api/configuracion-whatsapp', { headers }),
        ])
        const evData = await evRes.json().catch(() => ({}))
        const cfgData = await cfgRes.json().catch(() => ({}))
        setHasEvolutionPremium(!!evData.tieneEvolutionPremium)
        if (cfgData.metodo_envio != null) {
          const cfg = {
            metodo_envio: cfgData.metodo_envio ?? 'TWILIO',
            evolution_base_url: cfgData.evolution_base_url ?? null,
            evolution_instance: cfgData.evolution_instance ?? null,
            evolution_apikey: cfgData.evolution_apikey ?? null,
          }
          setConfigWhatsApp(cfg)
          setEvolutionBaseUrl(cfgData.evolution_base_url ?? '')
          setEvolutionInstance(cfgData.evolution_instance ?? '')
          setEvolutionApikey(cfgData.evolution_apikey ?? '')
        }
      } finally {
        setConfigLoading(false)
      }
    }
    load()
    if (searchParams.get('evolution_success') === 'true') {
      const t = setTimeout(load, 2000)
      return () => clearTimeout(t)
    }
  }, [hasAcceso, searchParams])

  useEffect(() => {
    if (!hasAcceso) return
    loadRecordatorios()
    const interval = setInterval(loadRecordatorios, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [hasAcceso])

  async function loadRecordatorios() {
    try {
      setLoading(true)
      const data = await obtenerRecordatoriosPendientes()
      setRecordatorios(data)
    } catch (error) {
      console.error('Error cargando recordatorios:', error)
    } finally {
      setLoading(false)
    }
  }

  function abrirWhatsApp(url: string, recordatorioId: string) {
    setEnviando(recordatorioId)
    window.open(url, '_blank')
    // Marcar como enviado después de un momento
    setTimeout(() => {
      setEnviados(prev => new Set(prev).add(recordatorioId))
      setEnviando(null)
    }, 1000)
  }

  function enviarTodos() {
    recordatorios.forEach((recordatorio) => {
      if (!enviados.has(recordatorio.cuota.id)) {
        abrirWhatsApp(recordatorio.urlWhatsApp, recordatorio.cuota.id)
        // Esperar un poco entre cada envío para no abrir demasiadas ventanas a la vez
        setTimeout(() => {}, 500)
      }
    })
  }

  const recordatoriosPendientes = recordatorios.filter(r => !enviados.has(r.cuota.id))
  const recordatoriosEnviados = recordatorios.filter(r => enviados.has(r.cuota.id))

  const successParam = searchParams.get('success')
  const canceledParam = searchParams.get('canceled')

  async function iniciarPago() {
    setCheckoutLoading(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/create-checkout-whatsapp', { method: 'POST', credentials: 'include', headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error || `Error ${res.status}: ${res.statusText}`
        if (res.status === 400 && typeof msg === 'string' && msg.includes('Ya tienes WhatsApp Premium')) {
          setHasPremium(true)
          return
        }
        throw new Error(msg)
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'No se recibió URL de pago')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al procesar el pago'
      console.error('Error iniciarPago WhatsApp:', e)
      toast.error(`Error: ${msg} — Verifica que STRIPE_SECRET_KEY esté configurada en Vercel.`)
    } finally {
      setCheckoutLoading(false)
    }
  }

  async function iniciarPagoEvolution() {
    setEvolutionCheckoutLoading(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/create-checkout-whatsapp-evolution', { method: 'POST', credentials: 'include', headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error || `Error ${res.status}`
        if (res.status === 400 && typeof msg === 'string' && msg.includes('Ya tienes WhatsApp Evolution')) {
          setHasEvolutionPremium(true)
          return
        }
        throw new Error(msg)
      }
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'No se recibió URL de pago')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al procesar el pago')
    } finally {
      setEvolutionCheckoutLoading(false)
    }
  }

  async function guardarConfigEvolution(updates: Partial<ConfigWhatsApp>) {
    setConfigSaveLoading(true)
    try {
      const session = await authService.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/configuracion-whatsapp', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`)
      if (configWhatsApp) setConfigWhatsApp({ ...configWhatsApp, ...updates })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setConfigSaveLoading(false)
    }
  }

  if (hasPremium === null && hasEvolutionPremium === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-500">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (!hasAcceso) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Recordatorios de WhatsApp</h1>
          <p className="text-gray-600">
            Activa el módulo de recordatorios automáticos por WhatsApp
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-lg mx-auto text-center">
          <MessageCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp Premium</h2>
          <p className="text-gray-600 mb-6">
            Recuerda a tus clientes por WhatsApp 2 días antes del vencimiento de sus cuotas. Incluye envíos automáticos programados.
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-6">$30 <span className="text-base font-normal text-gray-500">/ 30 días</span></p>
          <Button
            onClick={iniciarPago}
            disabled={checkoutLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            {checkoutLoading ? (
              <>
                <Clock className="w-5 h-5 mr-2 inline animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2 inline" />
                Activar WhatsApp Premium
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Recordatorios de WhatsApp</h1>
        <p className="text-gray-600">
          Envía recordatorios automáticos 2 días antes del vencimiento de las cuotas
        </p>
        {successParam === 'true' && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">¡Pago exitoso! WhatsApp Premium activado.</span>
          </div>
        )}
        {canceledParam === 'true' && (
          <div className="mt-4 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
            Pago cancelado. Puedes intentar de nuevo cuando quieras.
          </div>
        )}
        {searchParams.get('extension_success') === 'true' && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">¡Paquete de extensión adquirido! 200 notificaciones agregadas a tu balance.</span>
          </div>
        )}
        {searchParams.get('evolution_success') === 'true' && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">¡WhatsApp Evolution activado! Configura tu instancia abajo para empezar a usarlo.</span>
          </div>
        )}
        {searchParams.get('evolution_canceled') === 'true' && (
          <div className="mt-4 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
            Pago de Evolution cancelado. Puedes activarlo cuando quieras.
          </div>
        )}
      </div>

      {/* Configuración de envío: Twilio vs Evolution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Configuración de envío WhatsApp</h2>
        <p className="text-sm text-gray-600 mb-4">
          Puedes usar <strong>Twilio</strong> (incluido con WhatsApp Premium) o <strong>Evolution API</strong> (requiere activación de $30/30 días).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-gray-900">Twilio</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Sistema por defecto. Los mensajes se envían con la configuración del administrador. Ya está incluido con WhatsApp Premium.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={configLoading || configWhatsApp?.metodo_envio === 'TWILIO'}
              onClick={() => guardarConfigEvolution({ metodo_envio: 'TWILIO' })}
            >
              {configWhatsApp?.metodo_envio === 'TWILIO' ? 'En uso' : 'Usar Twilio'}
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              <h3 className="font-medium text-gray-900">Evolution API</h3>
            </div>
            {configLoading ? (
              <div className="animate-pulse h-4 w-32 bg-gray-100 rounded" />
            ) : !hasEvolutionPremium ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Usa tu propia instancia de Evolution API para enviar WhatsApp. Requiere activación por $30 (30 días).
                </p>
                <p className="text-lg font-bold text-gray-900 mb-3">$30 <span className="text-sm font-normal text-gray-500">/ 30 días</span></p>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={evolutionCheckoutLoading}
                  onClick={iniciarPagoEvolution}
                >
                  {evolutionCheckoutLoading ? (
                    <><Clock className="w-4 h-4 mr-2 inline animate-spin" /> Procesando...</>
                  ) : (
                    <><CreditCard className="w-4 h-4 mr-2 inline" /> Activar WhatsApp Evolution</>
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  Evolution activado. Configura la URL, instancia y (opcional) API key. Luego genera el QR para vincular WhatsApp.
                </p>
                <div className="space-y-3 mb-4">
                  <Input
                    label="URL base Evolution"
                    placeholder="https://tu-evolution.com"
                    value={evolutionBaseUrl}
                    onChange={(e) => setEvolutionBaseUrl(e.target.value)}
                  />
                  <Input
                    label="Nombre de instancia"
                    placeholder="Ej: mi-empresa o ID de empresa"
                    value={evolutionInstance}
                    onChange={(e) => setEvolutionInstance(e.target.value)}
                  />
                  <Input
                    label="API Key (opcional)"
                    type="password"
                    placeholder="Opcional"
                    value={evolutionApikey}
                    onChange={(e) => setEvolutionApikey(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="mb-3"
                  disabled={configSaveLoading}
                  onClick={() =>
                    guardarConfigEvolution({
                      evolution_base_url: evolutionBaseUrl.trim() || null,
                      evolution_instance: evolutionInstance.trim() || null,
                      evolution_apikey: evolutionApikey.trim() || null,
                    })
                  }
                >
                  {configSaveLoading ? 'Guardando...' : 'Guardar configuración Evolution'}
                </Button>
                <div className="mb-3">
                  <WhatsappLink />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={configSaveLoading || configWhatsApp?.metodo_envio === 'EVOLUTION'}
                  onClick={() => guardarConfigEvolution({ metodo_envio: 'EVOLUTION' })}
                >
                  {configWhatsApp?.metodo_envio === 'EVOLUTION' ? 'Evolution en uso' : 'Usar Evolution para envíos'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <WhatsAppCupoBanner />

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recordatorios Pendientes</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{recordatoriosPendientes.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencen Hoy</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {recordatorios.filter(r => r.diasRestantes === 0).length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Enviados</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{recordatoriosEnviados.length}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Send className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Botón Enviar Todos */}
      {recordatoriosPendientes.length > 0 && (
        <div className="mb-6">
          <Button
            onClick={enviarTodos}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="w-5 h-5 mr-2 inline" />
            Enviar Todos los Recordatorios ({recordatoriosPendientes.length})
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Se abrirán las ventanas de WhatsApp para cada cliente. Asegúrate de tener WhatsApp Web abierto.
          </p>
        </div>
      )}

      {/* Lista de Recordatorios */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-3 w-28 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-24 bg-gray-100 rounded" />
                <div className="h-4 w-16 bg-gray-100 rounded" />
                <div className="h-8 w-28 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : recordatorios.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay recordatorios pendientes. Cuando tengas cuotas por vencer, aquí podrás enviar avisos a tus clientes.</p>
          <p className="text-gray-400 text-sm mt-2">
            Los recordatorios aparecerán 2 días antes del vencimiento de las cuotas
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Restantes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total a Pagar
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recordatorios.map((recordatorio) => {
                  const estaEnviado = enviados.has(recordatorio.cuota.id)
                  const estaEnviando = enviando === recordatorio.cuota.id
                  
                  return (
                    <tr
                      key={recordatorio.cuota.id}
                      className={estaEnviado ? 'bg-green-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {recordatorio.cuota.cliente.nombre_completo}
                        </div>
                        <div className="text-xs text-gray-500">
                          {recordatorio.cuota.telefono}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {recordatorio.cuota.motor.marca} {recordatorio.cuota.motor.modelo ? `- ${recordatorio.cuota.motor.modelo}` : ''} ({recordatorio.cuota.motor.numero_chasis})
                        </div>
                        <div className="text-xs text-gray-500">
                          Cuota #{recordatorio.cuota.numeroCuota}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(recordatorio.cuota.fechaVencimiento)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          recordatorio.diasRestantes === 0
                            ? 'text-red-600'
                            : recordatorio.diasRestantes === 1
                            ? 'text-orange-600'
                            : 'text-yellow-600'
                        }`}>
                          {recordatorio.diasRestantes === 0
                            ? 'HOY'
                            : recordatorio.diasRestantes === 1
                            ? 'MAÑANA'
                            : `${recordatorio.diasRestantes} días`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ${recordatorio.cuota.totalAPagar.toLocaleString('es-DO', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {estaEnviado ? (
                          <span className="text-green-600 text-sm font-medium">
                            ✓ Enviado
                          </span>
                        ) : (
                          <Button
                            onClick={() => abrirWhatsApp(recordatorio.urlWhatsApp, recordatorio.cuota.id)}
                            disabled={estaEnviando}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm"
                          >
                            {estaEnviando ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 inline animate-spin" />
                                Abriendo...
                              </>
                            ) : (
                              <>
                                <MessageCircle className="w-4 h-4 mr-2 inline" />
                                Enviar
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista previa del mensaje */}
      {recordatorios.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa del Mensaje</h3>
          <div className="bg-white rounded-md p-4 border border-gray-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {recordatorios[0]?.mensaje || 'No hay mensajes disponibles'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}




