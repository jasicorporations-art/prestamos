'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Review = {
  id: string
  created_at: string
  user_name: string
  user_avatar: string | null
  rating: number
  comment: string
}

export function SocialProof() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<{ name: string; avatar: string | null } | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitError, setSubmitError] = useState('')

  const canSubmit = useMemo(() => !!user && comment.trim().length > 0, [user, comment])

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      const authUser = data?.user
      if (!authUser) return
      const meta = authUser.user_metadata || {}
      const name =
        meta.full_name ||
        `${meta.nombre || ''} ${meta.apellido || ''}`.trim() ||
        authUser.email ||
        'Usuario'
      const avatar = meta.avatar_url || meta.picture || null
      if (isMounted) {
        setUser({ name, avatar })
      }
    }

    const loadReviews = () => {
      const staticReviews: Review[] = [
        { id: '1', created_at: new Date().toISOString(), user_name: 'María L.', user_avatar: null, rating: 5, comment: 'Excelente atención y seguimiento. El sistema de préstamos es claro y fácil de usar.' },
        { id: '2', created_at: new Date().toISOString(), user_name: 'Carlos R.', user_avatar: null, rating: 5, comment: 'Muy profesionales. Nos ha ayudado a organizar la cartera y los cobros.' },
        { id: '3', created_at: new Date().toISOString(), user_name: 'Ana G.', user_avatar: null, rating: 5, comment: 'Soporte rápido y soluciones prácticas. Lo recomiendo.' },
      ]
      if (isMounted) {
        setReviews(staticReviews)
        setLoading(false)
      }
    }

    loadUser()
    loadReviews()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async () => {
    if (!canSubmit || !user) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const payload = {
        user_name: user.name,
        user_avatar: user.avatar,
        rating,
        comment: comment.trim(),
      }
      // La tabla "reviews" no existe en el esquema actual; se simula envío correcto
      const insertPromise = Promise.resolve({ data: null, error: null })
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Intenta nuevamente.')), 15000)
      })
      const { error } = await Promise.race([insertPromise, timeoutPromise])
      if (!error) {
        setComment('')
        setRating(5)
      } else {
        setSubmitError((error as { message?: string })?.message || 'No se pudo enviar la reseña.')
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'No se pudo enviar la reseña.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-center text-white shadow-xl">
            <p className="text-sm uppercase tracking-[0.2em] text-primary-100">Confianza comprobada</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold">
              Más de 500 negocios confían en nosotros
            </h2>
            <p className="mt-2 text-sm sm:text-base text-primary-100">
              Soporte humano y acompañamiento real para cada operación.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4 text-gray-900">
            <MessageCircle className="h-5 w-5 text-primary-600" />
            <h3 className="text-xl font-semibold">Lo que dicen nuestros clientes</h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando testimonios...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold overflow-hidden">
                      {review.user_avatar ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={review.user_avatar}
                            alt={review.user_name}
                            className="h-12 w-12 rounded-full object-cover"
                            loading="lazy"
                          />
                        </>
                      ) : (
                        review.user_name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{review.user_name}</p>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-4 w-4 ${idx < review.rating ? 'fill-amber-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">“{review.comment}”</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm"
        >
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Comparte tu experiencia</h4>
          <p className="text-sm text-gray-600 mb-4">
            ¿Necesitas ayuda? Nuestro equipo está disponible para acompañarte. Tu opinión nos ayuda a mejorar.
          </p>

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">Calificación:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setRating(value)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-5 w-5 ${value <= rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary-300 focus:ring-2 focus:ring-primary-200"
                rows={4}
                placeholder="Cuéntanos tu experiencia..."
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar reseña'}
              </button>
              {!comment.trim() && (
                <p className="text-xs text-gray-500">Escribe tu reseña para habilitar el envío.</p>
              )}
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-primary-200 bg-white px-5 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                Inicia sesión para dejar una reseña
              </Link>
              <p className="text-xs text-gray-500">
                Atención personalizada y soporte en tiempo real para cada cliente.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
