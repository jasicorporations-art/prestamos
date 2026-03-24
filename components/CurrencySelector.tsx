'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCurrency } from '@/lib/contexts/CurrencyContext'
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/lib/utils/currencyDetection'

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const current = SUPPORTED_CURRENCIES.find((c) => c.code === currency)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 w-full min-w-[180px] px-4 py-2.5 text-sm text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Seleccionar moneda"
      >
        <span className="font-medium text-gray-900">
          {current?.symbol ?? '$'} {current?.code ?? currency}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[220px] py-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <li key={c.code} role="option" aria-selected={currency === c.code}>
              <button
                type="button"
                onClick={() => {
                  setCurrency(c.code as CurrencyCode)
                  setOpen(false)
                }}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 ${
                  currency === c.code ? 'bg-primary-50 text-primary-800 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="font-medium">{c.code}</span>
                <span className="text-gray-500 truncate">{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
