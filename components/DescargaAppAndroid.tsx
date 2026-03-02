'use client'

import { useState } from 'react'
import { Download, ChevronDown, ShieldCheck } from 'lucide-react'

/** Icono Android (robot) - Material Design */
function AndroidIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48a5.25 5.25 0 0 0-2.98 0L9.64 2.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.3 1.3c-.27.11-.54.24-.78.41a5.19 5.19 0 0 0-1.23 1.09c-.19.25-.35.52-.52.79C6.68 6.04 6 8.19 6 10.5c0 2.5 1.5 4.5 4 4.5h4c2.5 0 4-2 4-4.5 0-2.31-.68-4.46-1.96-6.21-.17-.27-.33-.54-.52-.79-.32-.39-.7-.73-1.1-1.03-.24-.17-.51-.3-.78-.41zM12 15.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}

const PASOS_INSTALACION = [
  {
    titulo: 'Paso 1: Descargar el archivo',
    descripcion: 'Haz clic en el botón de descarga y espera a que se complete la descarga del archivo APK.',
  },
  {
    titulo: "Paso 2: Habilitar 'Instalar aplicaciones de fuentes desconocidas'",
    descripcion: 'Ve a Ajustes > Seguridad (o Aplicaciones) y activa la opción para permitir la instalación de aplicaciones desde fuentes desconocidas o desde tu navegador.',
  },
  {
    titulo: "Paso 3: Ignorar el aviso de Play Protect",
    descripcion: "Si aparece un aviso de Play Protect, selecciona 'Instalar de todas formas' o 'Instalar de forma segura' para continuar con la instalación.",
  },
]

export function DescargaAppAndroid() {
  const [acordeonAbierto, setAcordeonAbierto] = useState(false)

  return (
    <section className="py-12 sm:py-16 px-5 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50 to-white w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-visible">
          {/* Badge de seguridad */}
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 sm:px-6 py-4 flex items-center justify-center gap-2 flex-wrap">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium text-emerald-800 text-center">
              Archivo verificado libre de malware
            </span>
          </div>

          <div className="p-5 sm:p-6 lg:p-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 text-center">
              Descarga la App para Android
            </h2>
            <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed">
              Lleva JasiCorporations en tu bolsillo. Instala la app y gestiona tus préstamos desde cualquier lugar.
            </p>

            {/* Botón principal de descarga */}
            <a
              href="/app/JasiCorporations.apk"
              download="JasiCorporations.apk"
              className="flex items-center justify-center gap-2 sm:gap-3 w-full min-h-[56px] px-6 sm:px-8 py-4 bg-gradient-to-r from-[#3DDC84] to-[#2BB673] hover:from-[#4AE394] hover:to-[#3DDC84] text-white rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] border-0 focus:outline-none focus:ring-2 focus:ring-[#3DDC84] focus:ring-offset-2"
            >
              <AndroidIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white flex-shrink-0" />
              <span className="text-center">Descargar APK para Android</span>
              <Download className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            </a>

            {/* Acordeón de instrucciones */}
            <div className="mt-6 sm:mt-8 border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setAcordeonAbierto(!acordeonAbierto)}
                className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                aria-expanded={acordeonAbierto}
              >
                <span className="font-semibold text-gray-900 text-sm sm:text-base min-w-0">
                  ¿Cómo instalar el APK?
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                    acordeonAbierto ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {acordeonAbierto && (
                <div className="px-5 sm:px-6 py-5 sm:py-6 bg-white border-t border-gray-200">
                  <ol className="space-y-5 sm:space-y-6">
                    {PASOS_INSTALACION.map((paso, i) => (
                      <li key={i} className="flex gap-4 sm:gap-4 min-w-0">
                        <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">
                            {paso.titulo}
                          </p>
                          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed break-words">
                            {paso.descripcion}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
