'use client'

import { X, ArrowUp, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PLANES, type PlanType } from '@/lib/config/planes'

type ResourceTypeModal = 'clientes' | 'prestamos' | 'sucursales' | 'vendedores'

interface LimitReachedModalProps {
  isOpen: boolean
  onClose: () => void
  planType: PlanType | null
  resourceType: ResourceTypeModal
  currentUsage: number
  limit: number | 'ilimitado'
}

export function LimitReachedModal({
  isOpen,
  onClose,
  planType,
  resourceType,
  currentUsage,
  limit,
}: LimitReachedModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const resourceLabels: Record<ResourceTypeModal, { plural: string; pluralCap: string }> = {
    clientes: { plural: 'clientes', pluralCap: 'Clientes' },
    prestamos: { plural: 'préstamos', pluralCap: 'Préstamos' },
    sucursales: { plural: 'sucursales', pluralCap: 'Sucursales' },
    vendedores: { plural: 'vendedores', pluralCap: 'Vendedores' },
  }
  const { plural: resourceName, pluralCap: resourceNameCapitalized } = resourceLabels[resourceType]

  // Determinar planes recomendados para upgrade
  const recommendedPlans: PlanType[] = []
  if (planType === 'INICIAL') {
    recommendedPlans.push('BRONCE', 'INFINITO')
  } else if (planType === 'BRONCE') {
    recommendedPlans.push('PLATA', 'INFINITO')
  } else if (planType === 'PLATA') {
    recommendedPlans.push('ORO', 'INFINITO')
  } else if (planType === 'ORO') {
    recommendedPlans.push('INFINITO')
  }

  const handleUpgrade = (targetPlan: PlanType) => {
    onClose()
    router.push(`/precios?plan=${targetPlan}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <ArrowUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  ¡Tu negocio está creciendo!
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Has llegado al límite de tu plan actual
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mensaje principal - amable y motivador */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md mb-6">
            <p className="text-gray-800 font-medium">
              ¡Felicitaciones! Estás haciendo muy bien con tu <strong>Plan {planType}</strong>.
            </p>
            <p className="text-gray-700 text-sm mt-2">
              {planType === 'PLATA' && resourceType === 'clientes' ? (
                <>Has creado <strong>{currentUsage}</strong> clientes en total (límite: {limit}). Este es un límite histórico: aunque borres clientes, no podrás crear más hasta que actualices tu plan.</>
              ) : (
                <>Ya tienes <strong>{currentUsage}</strong> {resourceName} (límite: {limit === 'ilimitado' ? 'ilimitados' : limit}).</>
              )}
            </p>
            <p className="text-gray-700 text-sm mt-2">
              Te invitamos cordialmente a actualizar tu plan para seguir expandiendo tu negocio sin límites. ¡Estaremos encantados de apoyarte!
            </p>
          </div>

          {/* Planes recomendados */}
          {recommendedPlans.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Planes Recomendados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedPlans.map((recPlan) => {
                  const plan = PLANES[recPlan]
                  const isInfinito = recPlan === 'INFINITO'
                  return (
                    <div
                      key={recPlan}
                      className={`border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
                        isInfinito
                          ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-rose-50'
                          : 'border-gray-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">{plan.nombre}</h4>
                          {isInfinito && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full mt-1">
                              <Sparkles className="w-3 h-3" />
                              Vitalicio
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            ${plan.precio}
                          </div>
                          <div className="text-xs text-gray-600">
                            {plan.periodo === 'pago_unico' ? 'pago único' : `/${plan.periodo}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {(resourceType === 'sucursales' || resourceType === 'vendedores')
                          ? (plan.limites.clientes === 'ilimitado' ? (
                            <span className="font-semibold text-green-600">Más capacidad</span>
                          ) : (
                            <span>Mayor capacidad de {resourceName}</span>
                          ))
                          : (plan.limites[resourceType as 'clientes' | 'prestamos'] === 'ilimitado' ? (
                            <span className="font-semibold text-green-600">
                              {resourceNameCapitalized} ilimitados
                            </span>
                          ) : (
                            <span>
                              Hasta {plan.limites[resourceType as 'clientes' | 'prestamos']} {resourceName}
                            </span>
                          ))
                        }
                      </div>
                      <button
                        onClick={() => handleUpgrade(recPlan)}
                        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                          isInfinito
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {isInfinito ? 'Adquirir Plan Infinito' : `Actualizar a ${plan.nombre}`}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => handleUpgrade('INFINITO')}
              className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-md hover:from-amber-600 hover:to-rose-600 font-medium transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Ver Plan Infinito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

