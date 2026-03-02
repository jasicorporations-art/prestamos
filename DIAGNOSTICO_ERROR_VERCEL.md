# 🔍 Diagnóstico de Errores en Vercel

## ⚠️ Problema Identificado

El webhook de Stripe está usando `supabase.auth.admin` que requiere permisos de administrador. Esto puede fallar en Vercel si:

1. **No se está usando el Service Role Key** de Supabase
2. **El cliente de Supabase no tiene permisos de admin**

## 🔧 Solución

### Problema 1: Falta Service Role Key

El webhook necesita usar el **Service Role Key** de Supabase (no el anon key) para poder usar `auth.admin`.

**Pasos para solucionar:**

1. **Obtener Service Role Key de Supabase:**
   - Ve a [Supabase Dashboard](https://app.supabase.com/)
   - Selecciona tu proyecto
   - Ve a **Settings > API**
   - Copia el **"service_role" key** (⚠️ NUNCA lo expongas en el cliente)

2. **Agregar a Vercel:**
   - Ve a Vercel Dashboard > Settings > Environment Variables
   - Agrega: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Tu service role key
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - **NO marques** "Expose to Browser" (debe ser solo server-side)

3. **Actualizar código** para usar service role key en el webhook

### Problema 2: Variables de Stripe Faltantes

Como vimos antes, las variables de Stripe no están configuradas. Esto causa errores cuando se intenta crear checkout sessions.

**Solución:** Ver `SOLUCIONAR_VARIABLES_STRIPE.md`

## 📋 Checklist de Verificación

- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurada en Vercel
- [ ] `STRIPE_SECRET_KEY` está configurada
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está configurada
- [ ] `STRIPE_WEBHOOK_SECRET` está configurada
- [ ] `NEXT_PUBLIC_APP_URL` está configurada
- [ ] Todas las variables están marcadas para Production
- [ ] Se ha redesplegado después de agregar variables

## 🐛 Errores Comunes

### Error: "Permission denied" o "Insufficient permissions"

**Causa:** No se está usando el service role key

**Solución:** 
1. Agregar `SUPABASE_SERVICE_ROLE_KEY` en Vercel
2. Actualizar el código del webhook para usar este key

### Error: "STRIPE_SECRET_KEY no está configurada"

**Causa:** Variable no configurada o no redesplegada

**Solución:**
1. Verificar en Vercel Dashboard
2. Redesplegar después de agregar

### Error: "Webhook Error: Invalid signature"

**Causa:** `STRIPE_WEBHOOK_SECRET` no coincide

**Solución:**
1. Verificar que el secreto en Vercel coincida con el de Stripe Dashboard
2. Redesplegar

