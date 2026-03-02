'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { CallBackProps, Step } from 'react-joyride'
import { perfilesService } from '@/lib/services/perfiles'
import { supabase } from '@/lib/supabase'

// Importar react-joyride de forma dinámica para evitar problemas SSR
const Joyride = dynamic(() => import('react-joyride'), { ssr: false })

interface TourGuidedProps {
  run: boolean
  onFinish?: () => void
}

export function TourGuided({ run, onFinish }: TourGuidedProps) {
  const [steps, setSteps] = useState<Step[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Definir los pasos del tour basados en selectores que existan en la página
    const tourSteps: Step[] = [
      {
        target: 'body',
        content: 'Bienvenido a tu panel de control. Aquí verás el resumen de todas tus sucursales.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tour="sucursales"]',
        content: 'Aquí puedes gestionar tus diferentes puntos de venta y sus cajas.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="nuevo-prestamo"]',
        content: 'Haz clic aquí para registrar un vehículo y generar el contrato blindado al instante.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="gestion-mora"]',
        content: 'En esta sección verás quién te debe y cuánto capital tienes en riesgo.',
        placement: 'bottom',
      },
    ]

    // Solo incluir pasos si sus selectores existen en la página actual
    const availableSteps = tourSteps.filter((step) => {
      if (step.target === 'body') return true
      try {
        const element = document.querySelector(step.target as string)
        return element !== null
      } catch {
        return false
      }
    })

    if (availableSteps.length === 1 && availableSteps[0].target === 'body') {
      // Evitar overlay oscuro sin pasos reales en la página
      setSteps([])
      return
    }

    setSteps(availableSteps)
  }, [])

  const handleTourCallback = useCallback(async (data: CallBackProps) => {
    const { status, type } = data

    // Si el tour se completó o se cerró, marcar como completado
    if (status === 'finished' || status === 'skipped') {
      try {
        await perfilesService.marcarTourCompletado()
        if (onFinish) {
          onFinish()
        }
      } catch (error) {
        console.error('Error marcando tour como completado:', error)
      }
    }

    // Log para debugging
    if (type === 'step:after' || type === 'tour:end') {
      console.log('Tour progress:', { status, type })
    }
  }, [onFinish])

  if (!isClient || steps.length === 0) {
    return null
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        options: {
          primaryColor: '#0ea5e9', // primary-500
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: '#0ea5e9',
          color: '#fff',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '600',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      callback={handleTourCallback}
    />
  )
}


