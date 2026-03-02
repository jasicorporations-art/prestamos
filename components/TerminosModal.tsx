'use client'

import { Modal } from './Modal'
import Link from 'next/link'
import { ExternalLink, AlertTriangle } from 'lucide-react'

interface TerminosModalProps {
  isOpen: boolean
  onClose: () => void
  tipo?: 'terminos' | 'politica'
}

export function TerminosModal({ isOpen, onClose, tipo = 'terminos' }: TerminosModalProps) {
  const esTerminos = tipo === 'terminos'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esTerminos ? 'Términos de Servicio' : 'Política de Privacidad'}
      size="lg"
    >
      <div className="max-h-96 overflow-y-auto space-y-4 text-sm text-gray-700">
        {esTerminos ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-2">⚠️ Importante: Naturaleza del Software</p>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    <strong>JasiCorporations NO es una entidad financiera, banco ni prestamista.</strong> Somos únicamente un 
                    Software como Servicio (SaaS) de gestión. El riesgo crediticio es 100% responsabilidad del Dealer.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Responsabilidad del Dealer</p>
              <p>
                Al usar JasiCorporations, el Dealer declara que es responsable de la legalidad de sus financiamientos y 
                del 100% del riesgo crediticio.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Autorización para Procesar Datos</p>
              <p>
                El usuario garantiza que tiene autorización para procesar datos de vehículos (Chasis, Placas) 
                y documentos de identidad de terceros.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Seguridad de Datos</p>
              <p>
                Utilizamos Supabase con cifrado AES-256 en reposo y protocolos HTTPS/TLS para proteger sus datos. 
                El usuario es responsable de la custodia de sus credenciales de acceso.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Cumplimiento Legal</p>
              <p>
                Cumplimos con la Ley 172-13 (Protección de Datos Personales) de República Dominicana. 
                Usted es dueño de su información y puede solicitar su exportación en cualquier momento.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Limitación de Responsabilidad</p>
              <p>
                JasiCorporations no se hace responsable por cálculos financieros derivados de tasas de interés 
                configuradas erróneamente por el usuario, ni por pérdidas relacionadas con préstamos otorgados.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="font-semibold text-blue-900 mb-2">📄 Documento Completo</p>
              <p className="text-blue-800 text-xs mb-3">
                Esta es una versión resumida. Para leer los términos completos con toda la información legal detallada:
              </p>
              <Link
                href="/terminos-de-servicio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm underline"
              >
                Ver Términos de Servicio Completos
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-semibold text-base text-gray-900 mb-4">
              JasiCorporations - Política de Privacidad
            </p>
            
            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Recopilación de Información</p>
              <p>
                JasiCorporations recopila información personal de los usuarios y clientes para proporcionar 
                servicios de gestión de financiamientos. Esta información incluye datos de vehículos (chasis, placas) 
                y documentos de identidad.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Seguridad de Datos</p>
              <p>
                Utilizamos Supabase con cifrado AES-256 en reposo, protocolos HTTPS/TLS, y aislamiento de datos 
                por políticas de seguridad de nivel empresarial.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Uso de la Información</p>
              <p>
                La información recopilada se utiliza exclusivamente para los fines del sistema de gestión de 
                financiamientos. El usuario es responsable de obtener el consentimiento necesario de sus clientes 
                antes de ingresar sus datos personales.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Responsabilidad Compartida</p>
              <p>
                Aunque implementamos medidas de seguridad robustas, el usuario es responsable de mantener la 
                confidencialidad de sus credenciales de acceso.
              </p>
            </div>

            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-primary-50">
              <p className="font-semibold text-gray-900 mb-2">Cumplimiento y Portabilidad</p>
              <p>
                Cumplimos con la Ley 172-13 de República Dominicana. Usted es dueño de su información y puede 
                solicitar su exportación en cualquier momento.
              </p>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="font-semibold text-gray-900 mb-2">Compartir Información</p>
              <p>
                JasiCorporations no comparte información personal de los usuarios o clientes con terceros, 
                excepto cuando sea requerido por ley o con el consentimiento expreso del usuario.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="font-semibold text-blue-900 mb-2">📄 Documento Completo</p>
              <p className="text-blue-800 text-xs mb-3">
                Esta es una versión resumida. Para leer la política completa con toda la información detallada:
              </p>
              <Link
                href="/politica-de-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm underline"
              >
                Ver Política de Privacidad Completa
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Al aceptar estos términos y condiciones, usted declara que ha leído, entendido y acepta cumplir 
            con todas las condiciones establecidas en el documento completo.
          </p>
        </div>
      </div>

      <div className="mt-6 btn-actions">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  )
}

