# 🔧 Solución de Error en Vercel

## ❌ Error Detectado

```
TypeError: Headers.append: "Bearer import { Resend } from 'resend';
const resend = new Resend('re_xxxxxxxxx');
...
```

Este error indica que una variable de entorno contiene **código de ejemplo** en lugar de un valor real.

## 🔍 Causa

Probablemente en Vercel, alguna variable de entorno (como `RESEND_API_KEY`) tiene código de ejemplo en lugar de la clave real.

## ✅ Solución

### Paso 1: Verificar Variables en Vercel

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Selecciona tu proyecto**
3. **Settings → Environment Variables**
4. **Revisa cada variable** y asegúrate de que:
   - ✅ **NO contenga código de ejemplo**
   - ✅ **Solo contenga el valor real** (la clave, el secreto, etc.)
   - ✅ **No tenga espacios extra** antes o después

### Paso 2: Variables que Deben Revisarse

#### RESEND_API_KEY
- ❌ **INCORRECTO**: 
  ```
  import { Resend } from 'resend';
  const resend = new Resend('re_xxxxxxxxx');
  ```
- ✅ **CORRECTO**: 
  ```
  re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
  (Solo la clave, sin código)

#### STRIPE_SECRET_KEY
- ❌ **INCORRECTO**: Cualquier código o texto adicional
- ✅ **CORRECTO**: `sk_test_...` o `sk_live_...` (solo la clave)

#### STRIPE_WEBHOOK_SECRET
- ❌ **INCORRECTO**: Cualquier código o texto adicional
- ✅ **CORRECTO**: `whsec_...` (solo el secreto)

### Paso 3: Corregir Variables

1. **Edita cada variable** en Vercel
2. **Elimina cualquier código de ejemplo**
3. **Deja solo el valor real** (la clave, el secreto, etc.)
4. **Guarda los cambios**

### Paso 4: Redesplegar

Después de corregir las variables:

1. **Ve a Deployments**
2. **Haz clic en los 3 puntos** (⋯) del último deployment
3. **Selecciona "Redeploy"**
4. **Espera a que termine**

## 📋 Checklist

- [ ] `RESEND_API_KEY` contiene solo la clave (ej: `re_...`)
- [ ] `STRIPE_SECRET_KEY` contiene solo la clave (ej: `sk_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` contiene solo el secreto (ej: `whsec_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` contiene solo la clave (ej: `pk_...`)
- [ ] Ninguna variable tiene código de ejemplo
- [ ] Ninguna variable tiene espacios extra
- [ ] Se ha redesplegado después de corregir

## 🎯 Formato Correcto de Variables

### RESEND_API_KEY
```
re_AbCdEfGhIjKlMnOpQrStUvWxYz123456789
```

### STRIPE_SECRET_KEY
```
sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz123456789
```

### STRIPE_WEBHOOK_SECRET
```
whsec_AbCdEfGhIjKlMnOpQrStUvWxYz123456789
```

### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```
pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz123456789
```

### NEXT_PUBLIC_APP_URL
```
https://sisi-seven.vercel.app
```

## ⚠️ Importante

- **NUNCA** pongas código de ejemplo en las variables de entorno
- **Solo** el valor real (clave, secreto, URL, etc.)
- **Sin espacios** antes o después del valor
- **Sin comillas** alrededor del valor

