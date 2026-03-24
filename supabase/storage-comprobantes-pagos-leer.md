# Bucket `comprobantes_pagos` — ver imágenes en el panel

La app guarda en BD la URL pública de Supabase Storage y, además, **firma las URLs** en el servidor para admin/cobrador (bucket público o privado).

1. **Bucket público (recomendado)**  
   En **Storage → `comprobantes_pagos` → Configuration**, marca el bucket como **Public**.  
   Tras cada notificación de pago, la API intenta `updateBucket(..., { public: true })`.

2. **Bucket privado**  
   Sigue funcionando: el GET `/api/admin/pagos-verificar` y `POST /api/admin/sign-comprobante-urls` generan **signed URLs** (7 días) con la service role.

3. **Políticas RLS (si usas políticas en `storage.objects`)**  
   Asegúrate de permitir al menos:
   - **upload** para el service role / flujo que sube el archivo (ya usa service role en `notificar-pago`), y  
   - **read** público si el bucket es público, o confía en las URLs firmadas (no requieren política de lectura anónima).

Si las imágenes siguen en 403, revisa en Supabase que el bucket exista y que la URL en `foto_comprobante` corresponda a tu proyecto (`NEXT_PUBLIC_SUPABASE_URL`).
