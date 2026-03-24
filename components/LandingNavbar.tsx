'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'

type LandingNavbarProps = { variant?: 'light' | 'dark' }

export function LandingNavbar({ variant = 'light' }: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const isDark = variant === 'dark'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-md'
          : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex flex-col items-start">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              JasiCorporations
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#funciones"
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById('funciones')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className={`transition-colors font-medium cursor-pointer ${
                isDark ? 'text-zinc-300 hover:text-primary-400' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Funciones
            </a>
            <a
              href="#precios"
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById('precios')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className={`transition-colors font-medium cursor-pointer ${
                isDark ? 'text-zinc-300 hover:text-primary-400' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Precios
            </a>
            <Link
              href="/login"
              className={`transition-colors font-medium ${
                isDark ? 'text-zinc-300 hover:text-primary-400' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Iniciar Sesión
            </Link>
            <button
              onClick={() => router.push('/register')}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium shadow-lg hover:shadow-xl"
            >
              Prueba Gratis
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
            <div className="flex flex-col space-y-4">
              <a
                href="#funciones"
                onClick={(e) => {
                  e.preventDefault()
                  setIsMobileMenuOpen(false)
                  setTimeout(() => {
                    const element = document.getElementById('funciones')
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
                className={`transition-colors font-medium cursor-pointer ${
                  isDark ? 'text-zinc-300 hover:text-primary-400' : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                Funciones
              </a>
              <a
                href="#precios"
                onClick={(e) => {
                  e.preventDefault()
                  setIsMobileMenuOpen(false)
                  setTimeout(() => {
                    const element = document.getElementById('precios')
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
                className={`transition-colors font-medium cursor-pointer ${
                  isDark ? 'text-zinc-300 hover:text-primary-400' : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                Precios
              </a>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`transition-colors font-medium ${
                  isDark ? 'text-zinc-300 hover:text-primary-400' : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                Iniciar Sesión
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  router.push('/register')
                }}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium text-center"
              >
                Prueba Gratis
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

