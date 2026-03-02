import type { Metadata } from 'next'
import { ArrowLeft, Shield, Lock, FileText, AlertTriangle, MessageSquare, Mail, Layers, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos de Servicio | JasiCorporations Electro',
  description:
    'Consulta los términos de servicio de JasiCorporations Electro y las condiciones de uso de la plataforma.',
  alternates: {
    canonical: '/terminos-de-servicio',
  },
  openGraph: {
    title: 'Términos de Servicio | JasiCorporations Electro',
    description:
      'Consulta los términos de servicio de JasiCorporations Electro y las condiciones de uso de la plataforma.',
    url: '/terminos-de-servicio',
    siteName: 'JasiCorporations Electro',
    type: 'article',
  },
}

export default function TerminosPage() {
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
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Términos de Servicio</h1>
              <p className="text-gray-600 mt-2">Última actualización: {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Introducción */}
          <section>
            <p className="text-gray-700 leading-relaxed">
              Bienvenido a <strong>JasiCorporations</strong>. Estos términos de servicio (&quot;Términos&quot;) rigen su acceso y uso 
              de nuestra plataforma SaaS de gestión para dealers de vehículos. Al utilizar nuestros servicios, usted acepta estos 
              términos en su totalidad. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.
            </p>
          </section>

          {/* Naturaleza del Software */}
          <section className="border-l-4 border-amber-500 pl-6 py-4 bg-amber-50 rounded-r-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              1. Naturaleza del Software y Exención de Responsabilidad Financiera
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                <strong>JasiCorporations</strong> es un Software como Servicio (SaaS) diseñado para la gestión administrativa 
                y operativa de dealers de vehículos. Es importante entender que:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>JasiCorporations NO es una entidad financiera, banco, cooperativa ni prestamista.</strong>
                </li>
                <li>
                  <strong>JasiCorporations NO otorga créditos ni préstamos de ninguna naturaleza.</strong>
                </li>
                <li>
                  <strong>JasiCorporations NO asume ningún riesgo crediticio relacionado con los financiamientos gestionados 
                  a través de nuestra plataforma.</strong>
                </li>
                <li>
                  El <strong>riesgo crediticio es 100% responsabilidad del Dealer</strong> que utiliza nuestra plataforma.
                </li>
                <li>
                  El Dealer es el único responsable de evaluar la solvencia de sus clientes, establecer términos de financiamiento, 
                  gestionar la cobranza y asumir todas las pérdidas derivadas de impagos o morosidad.
                </li>
              </ul>
              <p className="leading-relaxed font-semibold text-amber-900">
                Al utilizar JasiCorporations, el Dealer declara y garantiza que comprende y acepta que toda responsabilidad 
                financiera, legal y crediticia recae exclusivamente sobre su persona o empresa.
              </p>
            </div>
          </section>

          {/* Seguridad de Datos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-600" />
              2. Seguridad de Datos y Protección de la Información
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Almacenamiento Seguro con Supabase</h3>
                <p className="leading-relaxed mb-3">
                  JasiCorporations utiliza <strong>Supabase</strong>, una plataforma de nivel empresarial que implementa 
                  las siguientes medidas de seguridad:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Cifrado AES-256 en reposo:</strong> Todos los datos almacenados en nuestras bases de datos 
                    están protegidos con cifrado Advanced Encryption Standard de 256 bits, uno de los estándares más seguros 
                    disponibles en la industria.
                  </li>
                  <li>
                    <strong>Aislamiento de datos:</strong> Implementamos políticas de seguridad de nivel empresarial que 
                    garantizan el aislamiento completo de los datos de cada cliente, previniendo acceso no autorizado entre 
                    diferentes cuentas o empresas.
                  </li>
                  <li>
                    <strong>Infraestructura empresarial:</strong> Nuestros servidores operan en centros de datos certificados 
                    que cumplen con estándares internacionales de seguridad física y lógica.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Cifrado en Tránsito</h3>
                <p className="leading-relaxed mb-3">
                  Todas las comunicaciones entre su navegador o aplicación y nuestros servidores están protegidas mediante:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Protocolo HTTPS/TLS:</strong> Utilizamos certificados SSL/TLS de alta seguridad para encriptar 
                    todas las transmisiones de datos, garantizando que la información viaje de forma segura a través de internet.
                  </li>
                  <li>
                    <strong>Comunicación cliente-servidor cifrada:</strong> Ningún dato sensible se transmite sin encriptación, 
                    protegiendo su información contra intercepción o manipulación durante el tránsito.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Responsabilidad Compartida */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-primary-600" />
              3. Responsabilidad Compartida en Seguridad
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                Aunque implementamos medidas de seguridad robustas a nivel de plataforma, la seguridad es una responsabilidad 
                compartida entre JasiCorporations y nuestros usuarios:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Custodia de credenciales:</strong> El usuario es el único responsable de mantener la confidencialidad 
                  de sus credenciales de acceso (usuario y contraseña).
                </li>
                <li>
                  <strong>Acceso no autorizado:</strong> Cualquier uso no autorizado del sistema que resulte de la pérdida, 
                  robo o divulgación de credenciales será responsabilidad exclusiva del usuario.
                </li>
                <li>
                  <strong>Buenas prácticas:</strong> Recomendamos encarecidamente utilizar contraseñas seguras, cambiarlas 
                  periódicamente, y no compartir credenciales con terceros.
                </li>
                <li>
                  <strong>Actividad sospechosa:</strong> El usuario debe notificar inmediatamente a JasiCorporations sobre 
                  cualquier actividad sospechosa o acceso no autorizado a su cuenta.
                </li>
              </ul>
            </div>
          </section>

          {/* Cumplimiento Legal */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cumplimiento Legal y Regulaciones</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Estándares Globales de Protección de Datos</h3>
                <p className="leading-relaxed mb-3">
                  JasiCorporations se alinea con los principios y estándares internacionales de protección de datos, garantizando 
                  un tratamiento ético y responsable de la información. Nuestra plataforma cumple con:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>RGPD (Reglamento General de Protección de Datos de la UE):</strong> Aunque no estamos directamente 
                    sujetos al RGPD, aplicamos sus principios fundamentales de privacidad por diseño, minimización de datos, 
                    transparencia y derechos del titular de datos.
                  </li>
                  <li>
                    <strong>Convenio 108 del Consejo de Europa:</strong> Nuestras prácticas se alinean con el Convenio para la 
                    protección de las personas con respecto al tratamiento automatizado de datos de carácter personal, garantizando 
                    procesamiento justo y legítimo de información.
                  </li>
                  <li>
                    <strong>Principios de privacidad por diseño:</strong> Implementamos medidas técnicas y organizativas desde el 
                    diseño mismo del sistema para proteger la privacidad y seguridad de los datos.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Ley de Protección de Datos Personales (Ley 172-13)</h3>
                <p className="leading-relaxed mb-3">
                  JasiCorporations se compromete a cumplir plenamente con la <strong>Ley No. 172-13 sobre Protección de Datos Personales</strong> 
                  de la República Dominicana, y con todas las normativas aplicables de protección de datos. Esto incluye:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Respeto a los derechos de los titulares de datos personales, incluyendo los derechos ARCO (Acceso, Rectificación, Cancelación y Oposición).</li>
                  <li>Implementación de medidas técnicas y organizativas adecuadas para proteger los datos.</li>
                  <li>Procesamiento lícito y limitado de datos personales únicamente para los fines autorizados.</li>
                  <li>Notificación de brechas de seguridad cuando sea legalmente requerido.</li>
                  <li>Transparencia en el tratamiento de datos y comunicación clara con los titulares.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Derechos ARCO del Titular de Datos</h3>
                <p className="leading-relaxed mb-3">
                  En cumplimiento con la Ley 172-13 y los estándares internacionales, reconocemos y garantizamos los siguientes 
                  derechos a todos los titulares de datos personales:
                </p>
                <ul className="list-disc list-inside space-y-3 ml-4">
                  <li>
                    <strong>Derecho de Acceso:</strong> Los titulares tienen derecho a conocer qué datos personales tenemos sobre 
                    ellos, para qué propósito los utilizamos, con quién los compartimos (si aplica), y cuánto tiempo los conservamos. 
                    Proporcionaremos esta información de forma clara y accesible.
                  </li>
                  <li>
                    <strong>Derecho de Rectificación:</strong> Los titulares pueden solicitar la corrección, actualización o 
                    complementación de datos inexactos, incompletos o desactualizados. Procesaremos estas solicitudes de forma 
                    expedita y verificaremos la identidad del solicitante.
                  </li>
                  <li>
                    <strong>Derecho de Cancelación:</strong> Los titulares pueden solicitar la eliminación de sus datos personales 
                    cuando ya no sean necesarios para los fines que motivaron su obtención, cuando se retire el consentimiento, o 
                    cuando el tratamiento haya sido ilícito. Esto se realizará respetando los períodos de retención legal requeridos.
                  </li>
                  <li>
                    <strong>Derecho de Oposición:</strong> Los titulares pueden oponerse al tratamiento de sus datos personales 
                    cuando existan motivos legítimos para ello, o cuando no deseen que sus datos sean utilizados para fines 
                    específicos. Evaluaremos cada solicitud y procederemos según corresponda legalmente.
                  </li>
                </ul>
                <p className="leading-relaxed mt-4 font-semibold bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  Para ejercer cualquiera de estos derechos ARCO, los titulares pueden contactarnos a través del Centro de Ayuda 
                  dentro de la plataforma o por correo electrónico. Procesaremos las solicitudes dentro de los plazos establecidos 
                  por la ley, típicamente dentro de 20 días hábiles.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">4.4 Responsabilidades del Usuario</h3>
                <p className="leading-relaxed">
                  El usuario (Dealer) es responsable de:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Obtener el consentimiento expreso e informado de sus clientes antes de ingresar sus datos personales al sistema.</li>
                  <li>Informar a sus clientes sobre sus derechos ARCO y cómo pueden ejercerlos.</li>
                  <li>Cumplir con todas las normativas locales aplicables a su actividad comercial y de financiamiento.</li>
                  <li>Garantizar que tiene autorización legal para procesar datos de vehículos (chasis, placas) y documentos de identidad.</li>
                  <li>Implementar sus propias políticas de privacidad y términos de servicio para sus clientes cuando sea requerido.</li>
                  <li>Notificar a JasiCorporations cualquier solicitud de ejercicio de derechos ARCO de sus clientes para su procesamiento oportuno.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Transferencia Internacional de Datos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Transferencia Segura Internacional de Datos</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                JasiCorporations utiliza <strong>Supabase</strong> como proveedor de infraestructura en la nube para el almacenamiento 
                y procesamiento de datos. Esta sección explica cómo garantizamos la seguridad de las transferencias internacionales 
                de datos.
              </p>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Base Legal para Transferencias Internacionales</h3>
                <p className="leading-relaxed mb-3">
                  El almacenamiento en Supabase puede implicar que los datos se procesen en servidores ubicados fuera de la República 
                  Dominicana. Garantizamos que todas las transferencias internacionales de datos cumplen con estándares legales estrictos:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>No transferencia a terceros sin base legal:</strong> Los datos almacenados en Supabase NO son transferidos 
                    a terceros sin una base legal sólida. Todas las transferencias se realizan únicamente bajo las siguientes condiciones:
                  </li>
                  <li className="ml-6">
                    • Consentimiento explícito del titular de los datos cuando sea requerido
                  </li>
                  <li className="ml-6">
                    • Cumplimiento de obligaciones contractuales necesarias para la prestación del servicio
                  </li>
                  <li className="ml-6">
                    • Cumplimiento de obligaciones legales o requerimientos de autoridades competentes
                  </li>
                  <li className="ml-6">
                    • Protección de intereses legítimos, siempre que se respeten los derechos y libertades fundamentales
                  </li>
                  <li>
                    <strong>Acuerdos contractuales estrictos:</strong> Supabase está sujeto a acuerdos de nivel empresarial que 
                    garantizan que no utilizarán los datos para otros fines que no sean la prestación del servicio, y que no 
                    compartirán datos con terceros sin autorización.
                  </li>
                  <li>
                    <strong>Estándares de seguridad equivalentes:</strong> Los centros de datos de Supabase cumplen con estándares 
                    internacionales de seguridad (ISO 27001, SOC 2 Type II) que garantizan niveles de protección equivalentes o 
                    superiores a los requeridos por las normativas locales.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Garantías de Transferencia Segura</h3>
                <p className="leading-relaxed mb-3">
                  Para garantizar la transferencia segura internacional de datos, implementamos las siguientes medidas:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Cifrado end-to-end:</strong> Todos los datos se cifran antes de ser transmitidos a través de fronteras, 
                    utilizando cifrado AES-256 y protocolos HTTPS/TLS.
                  </li>
                  <li>
                    <strong>Verificación continua:</strong> Monitoreamos y auditamos regularmente las prácticas de seguridad y 
                    cumplimiento de Supabase para asegurar el cumplimiento continuo de nuestros estándares.
                  </li>
                  <li>
                    <strong>Transparencia:</strong> Informamos a los usuarios sobre cualquier transferencia internacional de datos 
                    y los mecanismos de protección implementados.
                  </li>
                  <li>
                    <strong>Derecho de oposición:</strong> Los usuarios pueden oponerse a transferencias internacionales de datos 
                    cuando sea legalmente posible, aunque esto puede afectar la funcionalidad del servicio.
                  </li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="font-semibold text-blue-900 mb-2">Compromiso de Protección</p>
                <p className="text-blue-800 leading-relaxed">
                  JasiCorporations se compromete a garantizar que todas las transferencias internacionales de datos se realicen 
                  únicamente con bases legales sólidas y bajo estándares de seguridad equivalentes o superiores a los requeridos 
                  por la Ley 172-13 y los principios del RGPD y Convenio 108.
                </p>
              </div>
            </div>
          </section>

          {/* Portabilidad de Datos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Portabilidad y Propiedad de los Datos</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                <strong>Usted es el único propietario de su información.</strong> JasiCorporations reconoce que todos los datos 
                ingresados por usted (incluyendo información de clientes, vehículos, préstamos, pagos, etc.) son de su exclusiva 
                propiedad y responsabilidad.
              </p>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Derecho de Exportación</h3>
                <p className="leading-relaxed mb-3">
                  En cualquier momento, usted puede solicitar la exportación de todos sus datos en formatos estándar (CSV, JSON, PDF). 
                  Para solicitar la exportación de sus datos:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Contacte a nuestro equipo de soporte a través de la plataforma o por correo electrónico.</li>
                  <li>Las solicitudes serán procesadas dentro de un plazo razonable, típicamente entre 5 a 10 días hábiles.</li>
                  <li>No se cobrará tarifa adicional por la exportación de datos, excepto en casos de solicitudes excepcionalmente complejas.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Eliminación de Datos</h3>
                <p className="leading-relaxed">
                  Si decide cancelar su cuenta, puede solicitar la eliminación completa de sus datos. Procesaremos su solicitud 
                  de acuerdo con las normativas de protección de datos aplicables y nuestros períodos de retención legales requeridos.
                </p>
              </div>
            </div>
          </section>

          {/* Uso del Sistema */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Uso Aceptable del Sistema</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                El usuario se compromete a utilizar JasiCorporations de manera responsable, ética y legal:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>No utilizar el sistema para actividades ilegales, fraudulentas o que violen derechos de terceros.</li>
                <li>No intentar acceder a datos de otras empresas o usuarios.</li>
                <li>No realizar acciones que puedan comprometer la seguridad, estabilidad o rendimiento del sistema.</li>
                <li>Respetar los derechos de privacidad de sus clientes y cumplir con todas las normativas de protección de datos aplicables.</li>
                <li>Utilizar el sistema únicamente para los fines para los que fue diseñado: gestión de financiamientos de vehículos.</li>
              </ul>
            </div>
          </section>

          {/* Seguridad Técnica Reforzada */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Medidas de Seguridad Técnica</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                JasiCorporations implementa múltiples capas de protección técnica para garantizar la seguridad activa de sus datos:
              </p>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">8.1 Cifrado AES-256 como Protección Activa</h3>
                <p className="leading-relaxed mb-3">
                  Utilizamos <strong>cifrado Advanced Encryption Standard de 256 bits (AES-256)</strong> como una medida de protección 
                  activa y continua de sus datos:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Cifrado en reposo:</strong> Todos los datos almacenados en nuestras bases de datos están protegidos con 
                    AES-256, uno de los algoritmos de cifrado más seguros y ampliamente reconocidos en la industria.
                  </li>
                  <li>
                    <strong>Protección continua:</strong> El cifrado AES-256 funciona como una barrera activa de protección que 
                    previene el acceso no autorizado incluso si alguien obtuviera acceso físico a los medios de almacenamiento.
                  </li>
                  <li>
                    <strong>Estándar militar y gubernamental:</strong> AES-256 es el mismo estándar de cifrado utilizado por gobiernos 
                    y organizaciones militares para proteger información clasificada.
                  </li>
                  <li>
                    <strong>Gestión segura de claves:</strong> Las claves de cifrado se gestionan mediante sistemas especializados que 
                    garantizan su rotación periódica y acceso restringido.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">8.2 Protocolo HTTPS/TLS como Protección en Tránsito</h3>
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
                    <strong>Prevención de interceptación:</strong> HTTPS/TLS previene activamente que terceros intercepten, modifiquen 
                    o lean los datos durante la transmisión.
                  </li>
                  <li>
                    <strong>Autenticación de servidor:</strong> Los certificados SSL/TLS garantizan que usted se está comunicando 
                    con nuestros servidores auténticos y no con impostores.
                  </li>
                  <li>
                    <strong>Actualización continua:</strong> Mantenemos los protocolos de seguridad actualizados para protegerse 
                    contra nuevas vulnerabilidades descubiertas.
                  </li>
                </ul>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <p className="font-semibold text-green-900 mb-2">🛡️ Protección Multicapa</p>
                <p className="text-green-800 leading-relaxed">
                  La combinación de cifrado AES-256 en reposo y HTTPS/TLS en tránsito proporciona una protección multicapa que 
                  garantiza la seguridad de sus datos tanto cuando están almacenados como cuando se transmiten, actuando como 
                  medidas de protección activa y continua contra accesos no autorizados.
                </p>
              </div>
            </div>
          </section>

          {/* Limitaciones de Responsabilidad */}
          <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitaciones de Responsabilidad</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                JasiCorporations proporciona el software &quot;tal cual&quot; y no se hace responsable por:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Cálculos financieros:</strong> No nos hacemos responsables por errores en cálculos financieros derivados 
                  de tasas de interés, plazos o configuraciones establecidas incorrectamente por el usuario.
                </li>
                <li>
                  <strong>Decisiones comerciales:</strong> El usuario es el único responsable de sus decisiones comerciales y 
                  de evaluar la viabilidad de los financiamientos que otorga.
                </li>
                <li>
                  <strong>Pérdidas financieras:</strong> JasiCorporations no asume responsabilidad por pérdidas financieras, 
                  impagos, morosidad o cualquier otro resultado negativo relacionado con los préstamos gestionados a través de la plataforma.
                </li>
                <li>
                  <strong>Interrupciones del servicio:</strong> Aunque nos esforzamos por mantener una disponibilidad del 99.9%, 
                  no garantizamos servicio ininterrumpido y no seremos responsables por pérdidas derivadas de interrupciones temporales.
                </li>
                <li>
                  <strong>Pérdida de datos por negligencia del usuario:</strong> Pérdidas de datos resultantes de mala gestión 
                  de credenciales, acceso no autorizado por descuido del usuario, o eliminación accidental de información.
                </li>
              </ul>
            </div>
          </section>

          {/* Cláusulas Comerciales */}
          <section className="bg-gradient-to-br from-primary-50 to-blue-50 p-6 rounded-lg border border-primary-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">10. Cláusulas Comerciales y Tarifas</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Las siguientes cláusulas establecen los términos comerciales asociados a funcionalidades premium y servicios 
              adicionales que potencian su operación con JasiCorporations:
            </p>

            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:border-primary-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-lg shrink-0">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Módulo de WhatsApp</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      El uso del motor de automatización y créditos de WhatsApp está sujeto a un cargo mensual de{' '}
                      <strong className="text-primary-600">$30.00 USD</strong>. Este módulo incluye recordatorios automáticos 
                      de pagos, notificaciones programadas y gestión de conversaciones — en otras palabras, es{' '}
                      <em className="text-gray-600">&quot;el cobrador que nunca duerme, nunca se enferma y nunca olvida una fecha&quot;</em>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:border-primary-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Escalabilidad de Notificaciones</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      Para cuentas que superen los <strong>200 clientes activos</strong>, se aplica un cargo adicional mensual de{' '}
                      <strong className="text-primary-600">$10.00 USD</strong>. Este <em>&quot;Upgrade de Alta Entregabilidad&quot;</em>{' '}
                      garantiza que sus correos masivos lleguen a la bandeja de entrada de sus clientes y no terminen en la carpeta de Spam, 
                      gracias a infraestructura y reputación de dominio optimizadas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:border-primary-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg shrink-0">
                    <Layers className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Límites del Plan Infinito</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      La licencia vitalicia otorga acceso hasta a <strong>3 sucursales</strong>. Cualquier sucursal adicional 
                      que requiera integrarse a la plataforma deberá ser cotizada por separado, permitiéndole escalar su 
                      operación de manera flexible según sus necesidades de crecimiento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:border-primary-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg shrink-0">
                    <RefreshCw className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Tasa de Modernización Tecnológica</h3>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      Para asegurar que tu plataforma siga siendo un <em>&quot;Ferrari tecnológico&quot;</em> y no una pieza de museo, 
                      garantizamos la compatibilidad con las APIs y navegadores del futuro mediante un pago único de{' '}
                      <strong className="text-primary-600">$300.00 USD</strong> cada 5 años para actualizaciones mayores del sistema. 
                      Esta inversión garantiza que su operación mantenga competitividad tecnológica a largo plazo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Modificaciones */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Modificaciones de los Términos</h2>
            <div className="space-y-4 text-gray-700">
              <p className="leading-relaxed">
                JasiCorporations se reserva el derecho de modificar estos términos en cualquier momento para reflejar cambios 
                en nuestros servicios, prácticas legales o por razones operativas. Los cambios significativos serán notificados 
                a los usuarios mediante:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Notificación dentro de la plataforma</li>
                <li>Correo electrónico a la dirección registrada</li>
                <li>Publicación de la fecha de última actualización en esta página</li>
              </ul>
              <p className="leading-relaxed font-semibold">
                El uso continuado de nuestros servicios después de cualquier modificación constituye su aceptación de los nuevos términos. 
                Si no está de acuerdo con las modificaciones, debe cesar el uso de nuestros servicios y solicitar la cancelación de su cuenta.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <section className="bg-primary-50 p-6 rounded-lg border border-primary-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contacto y Soporte</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Si tiene preguntas sobre estos términos de servicio, puede contactarnos a través de:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-700">
              <li>Centro de ayuda dentro de la plataforma</li>
              <li>Correo electrónico de soporte (disponible en su panel de administración)</li>
            </ul>
          </section>

          {/* Aceptación */}
          <section className="border-t-2 border-gray-300 pt-6 mt-8">
            <div className="bg-gray-900 text-white p-6 rounded-lg">
              <p className="font-semibold text-lg mb-2">Aceptación de los Términos</p>
              <p className="leading-relaxed">
                Al utilizar JasiCorporations, usted declara que ha leído, entendido y acepta cumplir con todas las 
                condiciones establecidas en estos términos de servicio. Si no está de acuerdo con alguna parte de estos términos, 
                debe abstenerse de utilizar nuestros servicios.
              </p>
            </div>
          </section>
        </div>

        {/* Enlaces adicionales */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/politica-de-privacidad" className="text-primary-600 hover:text-primary-700 underline">
            Política de Privacidad
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
