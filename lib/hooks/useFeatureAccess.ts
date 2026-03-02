import { useState, useEffect } from 'react'
import { subscriptionService } from '@/lib/services/subscription'
import { getPlanLimits, type PlanType } from '@/lib/config/planes'

export type Feature = 
  | 'whatsapp_automatico'
  | 'factura_pdf'
  | 'reportes_ganancias'
  | 'soporte_prioritario'
  | 'panel_admin'

export interface FeatureAccess {
  hasAccess: boolean
  planType: PlanType | null
  requiredPlan: PlanType | null
  message: string
  loading: boolean
}

/**
 * Hook para verificar si el usuario tiene acceso a una característica según su plan
 */
export function useFeatureAccess(feature: Feature): FeatureAccess {
  // Estado inicial: permitir por defecto, no bloquear por carga
  const [access, setAccess] = useState<FeatureAccess>({
    hasAccess: true,
    planType: 'TRIAL',
    requiredPlan: null,
    message: '',
    loading: false,
  })

  useEffect(() => {
    async function checkAccess() {
      try {
        // Para panel_admin, ser más permisivo y no bloquear si hay errores
        const isPanelAdmin = feature === 'panel_admin'
        
        let planType: PlanType | null = null
        let isActive = false
        
        try {
          planType = await subscriptionService.getCurrentPlan()
        } catch (error) {
          console.warn('Error obteniendo plan:', error)
          planType = 'TRIAL'
        }

        console.log('[useFeatureAccess] Plan Detectado:', planType, 'feature:', feature)

        // BYPASS TRIAL: forzar acceso total y retornar sin bloquear
        if (planType === 'TRIAL') {
          setAccess({
            hasAccess: true,
            planType: 'TRIAL',
            requiredPlan: 'TRIAL',
            message: 'Acceso de prueba habilitado',
            loading: false,
          })
          return
        }

        try {
          isActive = await subscriptionService.isActive()
        } catch (error) {
          console.warn('Error verificando suscripción activa:', error)
          // Para panel_admin, asumir activo si hay un plan
          if (isPanelAdmin && planType) {
            isActive = true
          }
        }

        if (isPanelAdmin && planType && !isActive) isActive = true

        if (!isActive && !isPanelAdmin) {
          setAccess({
            hasAccess: false,
            planType: planType || 'BRONCE',
            requiredPlan: 'BRONCE',
            message: 'Tu suscripción no está activa. Por favor, renueva tu suscripción.',
            loading: false,
          })
          return
        }

        if (!planType && !isPanelAdmin) {
          setAccess({
            hasAccess: false,
            planType: null,
            requiredPlan: 'BRONCE',
            message: 'No se pudo determinar tu plan. Por favor, contacta al soporte.',
            loading: false,
          })
          return
        }
        
        // Para panel_admin, si no hay planType, usar BRONCE como fallback
        if (isPanelAdmin && !planType) {
          planType = 'BRONCE'
        }

        // Asegurar que planType no sea null antes de llamar a getPlanLimits
        const finalPlanType: PlanType = planType || 'BRONCE'
        const limits = getPlanLimits(finalPlanType)
        let hasAccess = false
        let requiredPlan: PlanType = 'BRONCE'
        let message = ''

        // TRIAL ya retornó arriba; aquí solo planes pagos
        switch (feature) {
            case 'whatsapp_automatico':
              hasAccess = limits.whatsapp === 'automatico'
              requiredPlan = hasAccess ? finalPlanType : 'PLATA'
              message = hasAccess
                ? 'WhatsApp automático disponible'
                : 'Actualiza a Plan PLATA o ORO para usar WhatsApp automático'
              break

            case 'factura_pdf':
              hasAccess = limits.facturaPDF === true
              requiredPlan = hasAccess ? finalPlanType : 'PLATA'
              message = hasAccess
                ? 'Factura PDF personalizada disponible'
                : 'Actualiza a Plan PLATA o ORO para generar Facturas PDF personalizadas'
              break

            case 'reportes_ganancias':
              hasAccess = limits.reportesGanancias === true
              requiredPlan = hasAccess ? finalPlanType : 'ORO'
              message = hasAccess
                ? 'Reportes de ganancias disponible'
                : 'Actualiza a Plan ORO para acceder a Reportes de Ganancias'
              break

            case 'soporte_prioritario':
              hasAccess = limits.soportePrioritario === true
              requiredPlan = hasAccess ? finalPlanType : 'PLATA'
              message = hasAccess
                ? 'Soporte prioritario disponible'
                : 'Actualiza a Plan PLATA o ORO para soporte prioritario'
              break

            case 'panel_admin':
              // Panel admin disponible para todos los usuarios autenticados
              hasAccess = isActive || (finalPlanType !== null && finalPlanType !== undefined)
              requiredPlan = finalPlanType
              message = hasAccess
                ? 'Panel de administración disponible'
                : 'Tu suscripción no está activa'
              break

            default:
              hasAccess = false
              requiredPlan = 'BRONCE'
              message = 'Característica no disponible'
          }

        setAccess({
          hasAccess,
          planType: finalPlanType,
          requiredPlan,
          message,
          loading: false,
        })
      } catch (error) {
        console.error('Error verificando acceso a característica:', error)
        // Fallback agresivo: mostrar función por defecto (mejor que ocultar por error de carga)
        setAccess({
          hasAccess: true,
          planType: 'TRIAL',
          requiredPlan: 'TRIAL',
          message: 'Acceso de prueba habilitado',
          loading: false,
        })
      }
    }

    checkAccess()
  }, [feature])

  return access
}

