type ToastType = 'success' | 'error' | 'warning' | 'info'

function dispatch(message: string, type: ToastType) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('jasi:toast', { detail: { message, type } }))
}

export const toast = {
  success: (message: string) => dispatch(message, 'success'),
  error: (message: string) => dispatch(message, 'error'),
  warning: (message: string) => dispatch(message, 'warning'),
  info: (message: string) => dispatch(message, 'info'),
}
