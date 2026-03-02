# 🔧 Comandos Corregidos - Ejecutar Uno por Uno

## Paso 1: Verificar que estás en el directorio correcto
```bash
cd /c/Users/Owner/.cursor
pwd
```
Deberías ver: `/c/Users/Owner/.cursor`

## Paso 2: Verificar el estado de Git
```bash
git status
```

Si Git no está inicializado, ejecuta:
```bash
git init
```

## Paso 3: Configurar Git (si no lo has hecho)
```bash
git config user.name "Tu Nombre"
git config user.email "tu-email@ejemplo.com"
```

## Paso 4: Agregar todos los archivos
```bash
git add .
```

## Paso 5: Hacer el commit inicial
```bash
git commit -m "Initial commit - JasiCorporations Gestión de Préstamos"
```

## Paso 6: Eliminar el remote incorrecto (si existe)
```bash
git remote remove origin
```

## Paso 7: Agregar el remote correcto (UN SOLO COMANDO)
**Ejecuta este comando COMPLETO en una sola línea:**
```bash
git remote add origin https://github.com/jasicorporations-art/jasicorporations-gestion-prestamos.git
```

## Paso 8: Cambiar la rama a main
```bash
git branch -M main
```

## Paso 9: Verificar el remote
```bash
git remote -v
```

Deberías ver:
```
origin  https://github.com/jasicorporations-art/jasicorporations-gestion-prestamos.git (fetch)
origin  https://github.com/jasicorporations-art/jasicorporations-gestion-prestamos.git (push)
```

## Paso 10: Hacer push
```bash
git push -u origin main
```

**IMPORTANTE**: Cuando te pida credenciales:
- **Username**: `jasicorporations-art`
- **Password**: Necesitas un **Personal Access Token** de GitHub (NO tu contraseña)

### Crear Personal Access Token:
1. Ve a: https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Marca **"repo"** (full control)
4. **Generate token**
5. **Copia el token** y úsalo como contraseña









