// Datos de la empresa - Puedes modificar estos valores
export const EMPRESA = {
  nombre: 'JASICORPORATIONS',
  telefono: '(809) 555-1234', // Cambia este número
  direccion: 'Calle Principal #123, Santo Domingo, República Dominicana', // Cambia esta dirección
  email: 'contacto@jasicorporations.com', // Opcional
  rnc: '123-45678-9', // Opcional - Registro Nacional de Contribuyente
}

// Código de registro único - Solo usuarios con este código pueden registrarse
// Puedes cambiarlo o configurarlo desde variables de entorno
// Para mayor seguridad, usa un código largo y aleatorio
export const CODIGO_REGISTRO = process.env.NEXT_PUBLIC_CODIGO_REGISTRO || 'JASICORP-2024-REGISTRO'




