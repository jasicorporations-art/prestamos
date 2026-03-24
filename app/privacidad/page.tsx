import type { Metadata } from 'next'
import { ArrowLeft, Shield, Lock, Eye, Database, FileText, Download } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad | JasiCorporations Electro',
  description:
    'Conoce cómo JasiCorporations Electro recopila, utiliza y protege la información personal.',
  alternates: {
    canonical: '/politica-de-privacidad',
  },
  openGraph: {
    title: 'Política de Privacidad | JasiCorporations Electro',
    description:
      'Conoce cómo JasiCorporations Electro recopila, utiliza y protege la información personal.',
    url: '/politica-de-privacidad',
    siteName: 'JasiCorporations Electro',
    type: 'article',
  },
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Política de Privacidad</h1>
              <p className="text-gray-600 mt-2">Última actualización: {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8">
          {/* Introducción */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              En <strong>JasiCorporations</strong>, su privacidad es fundamental para nosotros. Esta Política de Privacidad 
              explica cómo recopilamos, utilizamos, almacenamos y protegemos su información personal y la de sus clientes cuando 
              utiliza nuestra plataforma SaaS de gestión para dealers de vehículos.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Al utilizar nuestros servicios, usted acepta las prácticas descritas en esta política. Si no está de acuerdo con 
              alguna parte de esta política, debe abstenerse de utilizar nuestros servicios.
            </p>
          </section>

          {/* Información que recopilamos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-primary-600" />
              1. Información que Recopilamos
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">1.1 Información de Su Cuenta</h3>
                <p className="leading-relaxed mb-3">
                  Cuando se registra en JasiCorporations, recopilamos la siguiente información:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Nombre completo y apellidos</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Número de teléfono</li>
                  <li>Dirección física</li>
                  <li>Nombre de la empresa o dealer</li>
                  <li>Número de registro (RNC) de la empresa</li>
                  <li>Credenciales de acceso (contraseña encriptada)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">1.2 Información de Sus Clientes</h3>
                <p className="leading-relaxed mb-3">
                  A través de nuestra plataforma, usted puede ingresar información de sus clientes, incluyendo:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Nombres completos y documentos de identidad</li>
                  <li>Información de contacto (teléfono, dirección, correo electrónico)</li>
                  <li>Datos de vehículos (chasis/VIN, placas, marca, modelo, año, color)</li>
                  <li>Información financiera relacionada con préstamos (montos, cuotas, fechas de pago)</li>
                  <li>Historial de pagos y transacciones</li>
                  <li>Información de garantes o fiadores cuando aplique</li>
                  <li>Documentos escaneados (cédulas, contratos, etc.) que usted cargue al sistema</li>
                </ul>
                <p className="leading-relaxed mt-3 font-semibold text-amber-900 bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                  <strong>Importante:</strong> Usted es responsable de obtener el consentimiento expreso de sus clientes antes de 
                  ingresar sus datos personales a nuestra plataforma. JasiCorporations no asume responsabilidad por la falta de 
                  consentimiento o autorización de los titulares de datos.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">1.3 Información Técnica</h3>
                <p className="leading-relaxed mb-3">
                  Automáticamente recopilamos cierta información técnica cuando utiliza nuestros servicios:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Dirección IP y tipo de dispositivo</li>
                  <li>Navegador web y sistema operativo</li>
                  <li>Páginas visitadas y tiempo de uso</li>
                  <li>Registros de actividad y acceso (logs)</li>
                  <li>Cookies y tecnologías similares (ver sección de Cookies)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cómo utilizamos la información */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary-600" />
              2. Cómo Utilizamos Su Información
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                Utilizamos la información recopilada exclusivamente para los siguientes propósitos:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Prestación de servicios:</strong> Proporcionar, mantener y mejorar nuestra plataforma de gestión de financiamientos.
                </li>
                <li>
                  <strong>Autenticación y seguridad:</strong> Verificar su identidad, prevenir acceso no autorizado y proteger la seguridad del sistema.
                </li>
                <li>
                  <strong>Comunicación:</strong> Enviarle notificaciones sobre su cuenta, cambios en los servicios, o información importante relacionada con el uso de la plataforma.
                </li>
                <li>
                  <strong>Soporte técnico:</strong> Responder a sus consultas, resolver problemas técnicos y proporcionar asistencia.
                </li>
                <li>
                  <strong>Cumplimiento legal:</strong> Cumplir con obligaciones legales, regulaciones aplicables, y responder a solicitudes de autoridades competentes.
                </li>
                <li>
                  <strong>Mejora del servicio:</strong> Analizar patrones de uso (de forma agregada y anónima) para mejorar la funcionalidad y experiencia del usuario.
                </li>
                <li>
                  <strong>Prevención de fraude:</strong> Detectar y prevenir actividades fraudulentas o abusivas.
                </li>
              </ul>
              <p className="leading-relaxed mt-4 font-semibold bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <strong>No vendemos ni alquilamos su información personal</strong> a terceros para fines comerciales. 
                Tampoco utilizamos la información de sus clientes para nuestros propios fines comerciales.
              </p>
            </div>
          </section>

          {/* Seguridad de Datos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-600" />
              3. Seguridad de Datos y Medidas de Protección
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                Implementamos medidas de seguridad técnicas, administrativas y físicas de nivel empresarial para proteger su información:
              </p>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Cifrado de Datos</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Cifrado AES-256 en reposo:</strong> Todos los datos almacenados en nuestras bases de datos están protegidos 
                    con Advanced Encryption Standard de 256 bits, uno de los estándares de cifrado más seguros disponibles.
                  </li>
                  <li>
                    <strong>Cifrado en tránsito:</strong> Utilizamos protocolos HTTPS/TLS para encriptar todas las comunicaciones entre 
                    su dispositivo y nuestros servidores, garantizando que la información viaje de forma segura a través de internet.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Infraestructura Segura (Supabase)</h3>
                <p className="leading-relaxed mb-3">
                  Utilizamos <strong>Supabase</strong>, una plataforma de nivel empresarial que proporciona:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Aislamiento de datos:</strong> Políticas de seguridad estrictas que garantizan el aislamiento completo 
                    de los datos de cada cliente, previniendo acceso no autorizado entre diferentes cuentas.
                  </li>
                  <li>
                    <strong>Centros de datos certificados:</strong> Nuestros servidores operan en instalaciones que cumplen con 
                    estándares internacionales de seguridad (ISO 27001, SOC 2, etc.).
                  </li>
                  <li>
                    <strong>Respaldo automático:</strong> Copias de seguridad diarias para proteger contra pérdida de datos.
                  </li>
                  <li>
                    <strong>Monitoreo continuo:</strong> Sistemas de detección de intrusiones y monitoreo 24/7 de la infraestructura.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Control de Acceso</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Autenticación de múltiples factores disponible para mayor seguridad</li>
                  <li>Control de acceso basado en roles (Admin/Vendedor)</li>
                  <li>Registro y auditoría de todas las actividades y accesos al sistema</li>
                  <li>Bloqueo automático de cuentas después de intentos fallidos de acceso</li>
                </ul>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3.4 Responsabilidad Compartida</h3>
                <p className="leading-relaxed">
                  Aunque implementamos medidas de seguridad robustas, la seguridad es una responsabilidad compartida:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                  <li>
                    <strong>Usted es responsable</strong> de mantener la confidencialidad de sus credenciales de acceso 
                    (usuario y contraseña).
                  </li>
                  <li>
                    <strong>No comparta sus credenciales</strong> con terceros y notifique inmediatamente cualquier uso no autorizado.
                  </li>
                  <li>
                    <strong>Utilice contraseñas seguras</strong> y cámbielas periódicamente.
                  </li>
                  <li>
                    <strong>Active la autenticación de múltiples factores</strong> cuando esté disponible para mayor protección.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Compartir información */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Compartir Información con Terceros</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                JasiCorporations <strong>NO vende, alquila ni comparte</strong> su información personal ni la de sus clientes con 
                terceros para fines comerciales. Sin embargo, podemos compartir información en las siguientes circunstancias:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Proveedores de servicios:</strong> Con proveedores de confianza que nos ayudan a operar la plataforma 
                  (como Supabase para almacenamiento de datos), bajo estrictos acuerdos de confidencialidad y uso limitado de la información.
                </li>
                <li>
                  <strong>Requisitos legales:</strong> Cuando sea requerido por ley, orden judicial, o por autoridades competentes 
                  en cumplimiento de procedimientos legales.
                </li>
                <li>
                  <strong>Protección de derechos:</strong> Para proteger los derechos, propiedad o seguridad de JasiCorporations, 
                  nuestros usuarios, o terceros.
                </li>
                <li>
                  <strong>Con su consentimiento:</strong> Cuando usted nos haya dado su consentimiento expreso para compartir información.
                </li>
                <li>
                  <strong>Transferencias empresariales:</strong> En caso de fusión, adquisición, o venta de activos, siempre bajo 
                  condiciones que garanticen la continuidad de la protección de datos.
                </li>
              </ul>
            </div>
          </section>

          {/* Cumplimiento Legal */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cumplimiento Legal y Estándares Globales</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Estándares Globales de Protección de Datos</h3>
                <p className="leading-relaxed mb-3">
                  JasiCorporations se alinea con los principios y estándares internacionales de protección de datos, garantizando 
                  un tratamiento ético y responsable de la información. Nuestra plataforma cumple con:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>RGPD (Reglamento General de Protección de Datos de la UE):</strong> Aunque no estamos directamente 
                    sujetos al RGPD, aplicamos sus principios fundamentales de privacidad por diseño, minimización de datos, 
                    transparencia, y respeto a los derechos del titular de datos.
                  </li>
                  <li>
                    <strong>Convenio 108 del Consejo de Europa:</strong> Nuestras prácticas se alinean con el Convenio para la 
                    protección de las personas con respecto al tratamiento automatizado de datos de carácter personal, garantizando 
                    procesamiento justo, legítimo y transparente de información personal.
                  </li>
                  <li>
                    <strong>Principios de privacidad por diseño y por defecto:</strong> Implementamos medidas técnicas y organizativas 
                    desde el diseño mismo del sistema para proteger la privacidad y seguridad de los datos, minimizando el procesamiento 
                    a lo estrictamente necesario.
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Ley de Protección de Datos Personales (Ley 172-13)</h3>
                <p className="leading-relaxed mb-3">
                  JasiCorporations se compromete a cumplir plenamente con la <strong>Ley No. 172-13 sobre Protección de Datos Personales</strong> 
                  de la República Dominicana y con todas las normativas aplicables de protección de datos.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.3 Derechos ARCO del Titular de Datos</h3>
                <p className="leading-relaxed mb-3">
                  En cumplimiento con la Ley 172-13 y los estándares internacionales (RGPD, Convenio 108), reconocemos y garantizamos 
                  explícitamente los siguientes derechos ARCO a todos los titulares de datos personales:
                </p>
                <ul className="list-disc list-inside space-y-3 ml-4">
                  <li>
                    <strong>Derecho de Acceso:</strong> Usted tiene derecho a conocer qué datos personales tenemos sobre usted, 
                    incluyendo:
                    <ul className="list-circle list-inside space-y-1 ml-6 mt-2">
                      <li>Qué categorías de datos personales procesamos</li>
                      <li>Los propósitos para los cuales utilizamos sus datos</li>
                      <li>Con quién compartimos sus datos (si aplica)</li>
                      <li>Cuánto tiempo conservamos sus datos</li>
                      <li>El origen de los datos (si no los proporcionó directamente)</li>
                    </ul>
                    Proporcionaremos esta información de forma clara, accesible y dentro de los plazos legales establecidos.
                  </li>
                  <li>
                    <strong>Derecho de Rectificación:</strong> Usted puede solicitar la corrección, actualización o complementación 
                    de datos inexactos, incompletos o desactualizados. Esto incluye:
                    <ul className="list-circle list-inside space-y-1 ml-6 mt-2">
                      <li>Corrección de errores en datos personales</li>
                      <li>Actualización de información que haya cambiado</li>
                      <li>Complementación de información incompleta</li>
                    </ul>
                    Procesaremos estas solicitudes de forma expedita y verificaremos la identidad del solicitante para proteger su seguridad.
                  </li>
                  <li>
                    <strong>Derecho de Cancelación:</strong> Usted puede solicitar la eliminación de sus datos personales cuando:
                    <ul className="list-circle list-inside space-y-1 ml-6 mt-2">
                      <li>Ya no sean necesarios para los fines que motivaron su obtención</li>
                      <li>Se retire el consentimiento y no exista otra base legal para el tratamiento</li>
                      <li>El tratamiento haya sido ilícito</li>
                      <li>Deban suprimirse para el cumplimiento de una obligación legal</li>
                    </ul>
                    Esto se realizará respetando los períodos de retención legal requeridos (por ejemplo, para cumplimiento fiscal).
                  </li>
                  <li>
                    <strong>Derecho de Oposición:</strong> Usted puede oponerse al tratamiento de sus datos personales cuando:
                    <ul className="list-circle list-inside space-y-1 ml-6 mt-2">
                      <li>Existan motivos legítimos relacionados con su situación particular</li>
                      <li>No desee que sus datos sean utilizados para fines específicos (como marketing directo)</li>
                      <li>El tratamiento se base en intereses legítimos y usted considere que sus derechos prevalecen</li>
                    </ul>
                    Evaluaremos cada solicitud de oposición y procederemos según corresponda legalmente, informándole sobre nuestra decisión.
                  </li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h3 className="text-xl font-semibold text-blue-900 mb-3">5.4 Ejercicio de los Derechos ARCO</h3>
                <p className="text-blue-800 leading-relaxed mb-3">
                  Para ejercer cualquiera de estos derechos ARCO, puede contactarnos a través de:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-blue-800">
                  <li>Centro de Ayuda dentro de la plataforma</li>
                  <li>Correo electrónico de soporte (disponible en su panel de administración)</li>
                </ul>
                <p className="text-blue-800 leading-relaxed mt-3">
                  Procesaremos su solicitud dentro de los plazos establecidos por la ley (típicamente dentro de 20 días hábiles) 
                  y le informaremos sobre el resultado de su solicitud. Si su solicitud es denegada, le explicaremos las razones 
                  legales para ello.
                </p>
              </div>
            </div>
          </section>

          {/* Transferencia Internacional */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Transferencia Segura Internacional de Datos</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                JasiCorporations utiliza <strong>Supabase</strong> como proveedor de infraestructura en la nube, lo cual puede 
                implicar que los datos se procesen en servidores ubicados fuera de la República Dominicana. Esta sección explica 
                cómo garantizamos la seguridad de las transferencias internacionales.
              </p>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Base Legal y Garantías de Transferencia</h3>
                <p className="leading-relaxed mb-3">
                  Garantizamos que todas las transferencias internacionales de datos cumplen con estándares legales estrictos 
                  y estándares de &apos;Transferencia Internacional de Datos&apos;:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>No transferencia a terceros sin base legal:</strong> Los datos almacenados en Supabase NO son transferidos 
                    a terceros sin una base legal sólida. Todas las transferencias se realizan únicamente bajo:
                    <ul className="list-circle list-inside space-y-1 ml-6 mt-2">
                      <li>Consentimiento explícito del titular de los datos cuando sea requerido</li>
                      <li>Cumplimiento de obligaciones contractuales necesarias para la prestación del servicio</li>
                      <li>Cumplimiento de obligaciones legales o requerimientos de autoridades competentes</li>
                      <li>Protección de intereses legítimos, siempre que se respeten los derechos y libertades fundamentales</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Acuerdos contractuales estrictos:</strong> Supabase está sujeto a acuerdos de nivel empresarial (incluyendo 
                    cláusulas contractuales tipo para transferencias internacionales) que garantizan que no utilizarán los datos para 
                    otros fines que no sean la prestación del servicio, y que no compartirán datos con terceros sin autorización.
                  </li>
                  <li>
                    <strong>Estándares de seguridad equivalentes:</strong> Los centros de datos de Supabase cumplen con estándares 
                    internacionales de seguridad (ISO 27001, SOC 2 Type II, GDPR compliance) que garantizan niveles de protección 
                    equivalentes o superiores a los requeridos por las normativas locales.
                  </li>
                  <li>
                    <strong>Cumplimiento con RGPD para transferencias:</strong> Aunque aplicamos principios del RGPD, las transferencias 
                    a Supabase cumplen con los requisitos de transferencia internacional segura, incluyendo cláusulas contractuales 
                    tipo y garantías adecuadas.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Medidas de Protección Técnica en Transferencias</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Cifrado antes de la transferencia:</strong> Todos los datos se cifran utilizando AES-256 antes de ser 
                    transmitidos a través de fronteras internacionales.
                  </li>
                  <li>
                    <strong>Protocolos seguros de transmisión:</strong> Utilizamos HTTPS/TLS para todas las transferencias internacionales, 
                    garantizando que los datos viajen de forma encriptada.
                  </li>
                  <li>
                    <strong>Verificación y auditoría continua:</strong> Monitoreamos y auditamos regularmente las prácticas de seguridad 
                    y cumplimiento de Supabase para asegurar el cumplimiento continuo de nuestros estándares.
                  </li>
                  <li>
                    <strong>Transparencia:</strong> Informamos a los usuarios sobre cualquier transferencia internacional de datos y 
                    los mecanismos de protección implementados.
                  </li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="font-semibold text-blue-900 mb-2">Compromiso de Protección en Transferencias Internacionales</p>
                <p className="text-blue-800 leading-relaxed">
                  JasiCorporations se compromete a garantizar que todas las transferencias internacionales de datos se realicen 
                  únicamente con bases legales sólidas y bajo estándares de seguridad equivalentes o superiores, cumpliendo con 
                  los estándares de transferencia internacional de datos de la Ley 172-13, RGPD y Convenio 108.
                </p>
              </div>
            </div>
          </section>

          {/* Seguridad Técnica Reforzada */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-600" />
              7. Medidas de Seguridad Técnica Reforzada
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                JasiCorporations implementa múltiples capas de protección técnica como medidas de protección activa y continua 
                para garantizar la seguridad de sus datos:
              </p>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">7.1 Cifrado AES-256 como Protección Activa</h3>
                <p className="leading-relaxed mb-3">
                  Utilizamos <strong>cifrado Advanced Encryption Standard de 256 bits (AES-256)</strong> como una medida de protección 
                  activa y continua de sus datos:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Cifrado en reposo:</strong> Todos los datos almacenados en nuestras bases de datos están protegidos con 
                    AES-256, uno de los algoritmos de cifrado más seguros y ampliamente reconocidos en la industria, utilizado incluso 
                    por gobiernos y organizaciones militares.
                  </li>
                  <li>
                    <strong>Protección continua:</strong> El cifrado AES-256 funciona como una barrera activa de protección que 
                    previene el acceso no autorizado incluso si alguien obtuviera acceso físico a los medios de almacenamiento.
                  </li>
                  <li>
                    <strong>Estándar de nivel militar:</strong> AES-256 es el mismo estándar de cifrado utilizado para proteger 
                    información clasificada, garantizando máxima seguridad.
                  </li>
                  <li>
                    <strong>Gestión segura de claves:</strong> Las claves de cifrado se gestionan mediante sistemas especializados que 
                    garantizan su rotación periódica, acceso restringido y protección contra compromiso.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">7.2 Protocolo HTTPS/TLS como Protección en Tránsito</h3>
                <p className="leading-relaxed mb-3">
                  Todas las comunicaciones están protegidas mediante <strong>protocolos HTTPS/TLS (Transport Layer Security)</strong> 
                  como medida de protección activa contra interceptación:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Encriptación end-to-end:</strong> Todos los datos transmitidos entre su dispositivo y nuestros servidores 
                    están encriptados utilizando TLS 1.2 o superior, garantizando que la información viaje de forma segura a través 
                    de internet.
                  </li>
                  <li>
                    <strong>Prevención activa de interceptación:</strong> HTTPS/TLS previene activamente que terceros intercepten, 
                    modifiquen o lean los datos durante la transmisión, actuando como una protección continua.
                  </li>
                  <li>
                    <strong>Autenticación de servidor:</strong> Los certificados SSL/TLS garantizan que usted se está comunicando 
                    con nuestros servidores auténticos y no con impostores (protección contra ataques man-in-the-middle).
                  </li>
                  <li>
                    <strong>Actualización continua:</strong> Mantenemos los protocolos de seguridad actualizados para protegerse 
                    contra nuevas vulnerabilidades descubiertas, asegurando protección activa y actualizada.
                  </li>
                </ul>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <p className="font-semibold text-green-900 mb-2">🛡️ Protección Multicapa Activa</p>
                <p className="text-green-800 leading-relaxed">
                  La combinación de cifrado AES-256 en reposo y HTTPS/TLS en tránsito proporciona una protección multicapa que actúa 
                  como medidas de protección activa y continua. Esta defensa multicapa garantiza la seguridad de sus datos tanto 
                  cuando están almacenados como cuando se transmiten, protegiendo activamente contra accesos no autorizados, 
                  interceptación y manipulación.
                </p>
              </div>
            </div>
          </section>

          {/* Portabilidad de Datos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-6 h-6 text-primary-600" />
              8. Portabilidad y Propiedad de los Datos
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed font-semibold text-lg">
                <strong>Usted es el único propietario de su información.</strong>
              </p>
              <p className="leading-relaxed">
                JasiCorporations reconoce que todos los datos que usted ingresa (información de clientes, vehículos, préstamos, 
                pagos, documentos, etc.) son de su exclusiva propiedad. Nosotros actuamos únicamente como custodios de esta información 
                para proporcionarle el servicio de gestión.
              </p>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Exportación de Datos</h3>
                <p className="leading-relaxed mb-3">
                  En cualquier momento, puede solicitar la exportación completa de todos sus datos. Proporcionaremos sus datos en 
                  formatos estándar y estructurados:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>CSV:</strong> Para datos tabulares (clientes, vehículos, préstamos, pagos)</li>
                  <li><strong>JSON:</strong> Para exportación técnica completa de toda la estructura de datos</li>
                  <li><strong>PDF:</strong> Para documentos y reportes formateados</li>
                </ul>
                <p className="leading-relaxed mt-3">
                  Para solicitar la exportación de sus datos, contacte a nuestro equipo de soporte. Las solicitudes serán procesadas 
                  típicamente dentro de 5 a 10 días hábiles. No se cobrará tarifa adicional por exportaciones estándar.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Eliminación de Datos</h3>
                <p className="leading-relaxed">
                  Si decide cancelar su cuenta, puede solicitar la eliminación completa de todos sus datos. Procesaremos su solicitud 
                  de acuerdo con:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Las normativas de protección de datos aplicables (Ley 172-13)</li>
                  <li>Nuestros períodos de retención legal requeridos (por ejemplo, para cumplir con obligaciones fiscales)</li>
                  <li>Períodos razonables de respaldo para recuperación ante errores accidentales</li>
                </ul>
                <p className="leading-relaxed mt-3">
                  Después de la eliminación, los datos no podrán ser recuperados. Le recomendamos realizar una exportación completa 
                  antes de solicitar la eliminación.
                </p>
              </div>
            </div>
          </section>

          {/* Retención de Datos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Retención de Datos</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                Conservamos su información mientras:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Su cuenta esté activa y utilice nuestros servicios</li>
                <li>Sea necesario para proporcionarle nuestros servicios</li>
                <li>Sea requerido por ley o para cumplir con obligaciones legales (por ejemplo, períodos de retención fiscal)</li>
                <li>Sea necesario para resolver disputas o hacer cumplir nuestros acuerdos</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Cuando ya no sea necesario conservar su información, la eliminaremos de forma segura de nuestros sistemas.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cookies y Tecnologías Similares</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                Utilizamos cookies y tecnologías similares para:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Mantener su sesión activa mientras utiliza la plataforma</li>
                <li>Recordar sus preferencias y configuraciones</li>
                <li>Mejorar la seguridad y prevenir acceso no autorizado</li>
                <li>Analizar el uso de la plataforma (de forma agregada y anónima)</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Puede configurar su navegador para rechazar cookies, pero esto puede afectar la funcionalidad de la plataforma. 
                No utilizamos cookies de seguimiento de terceros para publicidad.
              </p>
            </div>
          </section>

          {/* Cambios en la política */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Cambios en esta Política de Privacidad</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                Podemos actualizar esta Política de Privacidad ocasionalmente para reflejar cambios en nuestras prácticas, 
                servicios o por razones legales. Le notificaremos sobre cambios significativos mediante:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Notificación prominente dentro de la plataforma</li>
                <li>Correo electrónico a la dirección registrada</li>
                <li>Actualización de la fecha de &quot;Última actualización&quot; en esta página</li>
              </ul>
              <p className="leading-relaxed mt-4 font-semibold">
                Le recomendamos revisar esta política periódicamente para mantenerse informado sobre cómo protegemos su información.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <section className="bg-primary-50 p-6 rounded-lg border border-primary-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contacto y Preguntas sobre Privacidad</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Si tiene preguntas, inquietudes o solicitudes relacionadas con esta Política de Privacidad o el manejo de sus datos personales, 
              puede contactarnos a través de:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Centro de Ayuda dentro de la plataforma</li>
              <li>Correo electrónico de soporte (disponible en su panel de administración)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Nos comprometemos a responder a sus consultas dentro de un plazo razonable y de acuerdo con las normativas aplicables.
            </p>
          </section>
        </div>

        {/* Enlaces adicionales */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/terminos-de-servicio" className="text-primary-600 hover:text-primary-700 underline">
            Términos de Servicio
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/academia" className="text-primary-600 hover:text-primary-700 underline">
            Centro de Ayuda
          </Link>
        </div>
      </div>
    </div>
  )
}
