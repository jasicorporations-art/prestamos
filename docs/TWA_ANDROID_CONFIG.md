# Configuración TWA (Trusted Web Activity) – Android

## 1. manifest.json (web) – ✅ Correcto

En **public/manifest.json** tienes:

```json
"display": "standalone"
```

Con `display: "standalone"` la PWA se abre sin la barra de direcciones de Chrome cuando se usa desde un TWA, que es lo que necesitas.

---

## 2. assetlinks.json (web) – ✅ Configurado

- **Ruta:** `public/.well-known/assetlinks.json`
- **Package TWA:** `com.jasicorporations.prestamos.twa`
- **Relación:** `delegate_permission/common.handle_all_urls`

El fingerprint SHA-256 del assetlinks debe coincidir con el certificado con el que firmas la app TWA (release o el que uses para la app instalada). Si usas otro keystore (por ejemplo el que te da Bubblewrap), actualiza `sha256_cert_fingerprints` en assetlinks con ese fingerprint.

**Comprobar que se sirve bien:**

- URL: `https://tu-dominio.com/.well-known/assetlinks.json`
- Debe responder con `Content-Type: application/json` (ya configurado en next.config.js).

---

## 3. AndroidManifest.xml (proyecto Android/TWA)

En este repositorio **no hay proyecto Android**; el TWA suele estar en otro repo o generado con Bubblewrap. La actividad principal del TWA debe tener algo equivalente a lo siguiente.

### 3.1 Activity principal con `android:autoVerify="true"`

La actividad que abre la URL de tu web debe declarar **intent-filter** para `https` con **android:autoVerify="true"** y el host que sirve tu PWA y el assetlinks:

```xml
<activity
    android:name=".LauncherActivity"
    android:launchMode="singleTask"
    android:theme="@android:style/Theme.Translucent.NoTitleBar"
    android:configChanges="orientation|screenSize|smallestScreenSize|screenLayout"
    android:exported="true">

    <!-- TWA: verificación automática con assetlinks.json -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="TU_DOMINIO_AQUI"
            android:pathPrefix="/"
            android:pathPattern="/.*" />
    </intent-filter>

</activity>
```

Sustituye **TU_DOMINIO_AQUI** por el dominio real (ej: `prestamos.jasicorporations.com`), **sin** `https://` ni barra final.

### 3.2 Puntos importantes

- **android:autoVerify="true"** en los intent-filter que abren tu dominio para que Android compruebe `https://TU_DOMINIO/.well-known/assetlinks.json`.
- **android:host** debe ser exactamente el dominio donde está la PWA y el assetlinks.
- **android:pathPrefix="/"** y **android:pathPattern="/.*"** hacen que esa actividad capture todo el sitio (recomendado para TWA de una sola app).
- Si usas **Bubblewrap**, suele generar esto por ti; solo verifica que el host coincida con tu dominio y que `autoVerify="true"` esté presente.

### 3.3 Ejemplo con dominio concreto

Para `prestamos.jasicorporations.com`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="prestamos.jasicorporations.com"
        android:pathPrefix="/"
        android:pathPattern="/.*" />
</intent-filter>
```

---

## 4. Resumen de comprobaciones

| Elemento | Dónde | Estado |
|----------|--------|--------|
| **display: standalone** | public/manifest.json | ✅ |
| **assetlinks.json** | public/.well-known/assetlinks.json | ✅ package `com.jasicorporations.prestamos.twa` |
| **Headers assetlinks** | next.config.js | ✅ Content-Type: application/json |
| **AndroidManifest.xml** | Proyecto Android (fuera de este repo) | Revisar en tu proyecto: intent-filter con autoVerify="true" y host correcto |

Si tras desplegar la web y la app TWA la verificación falla, revisa:

1. Que `https://TU_DOMINIO/.well-known/assetlinks.json` sea accesible y devuelva el JSON correcto.
2. Que el SHA-256 del assetlinks sea el del certificado con el que firmas la app TWA.
3. Que en AndroidManifest el `android:host` sea exactamente ese dominio.

---

## 5. La barra del navegador sigue viéndose

Si la barra de Chrome sigue visible, **Android no está abriendo la app como TWA verificado**: está abriendo la URL en Chrome o en Custom Tab, y ahí la barra se muestra. El manifest con `display: standalone` solo quita la barra **cuando la app se abre como TWA**.

### Comprobar paso a paso

1. **¿Se sirve assetlinks en tu dominio?**  
   Abre en el navegador: `https://TU_DOMINIO_REAL/.well-known/assetlinks.json`  
   Debe cargar el JSON. Si da 404, la verificación falla.

2. **¿El SHA-256 es el correcto?**  
   El fingerprint en assetlinks debe ser el del certificado con el que **firmas la APK/AAB**.  
   Ver fingerprint: `keytool -list -v -keystore tu-release.keystore -alias tu-alias`  
   Copia el SHA256 en formato `AA:BB:CC:...` en assetlinks.

3. **¿La app TWA tiene el intent-filter correcto?**  
   En el proyecto Android: Activity con `<intent-filter android:autoVerify="true">` y `<data android:scheme="https" android:host="TU_DOMINIO" ... />`.  
   `android:host` = dominio exacto (ej: `prestamos.jasicorporations.com`), sin `https://` ni `/`.

4. **Reinstalar la app**  
   Desinstala la app TWA, vuelve a instalar la versión firmada con el certificado del paso 2. La re-verificación puede tardar un poco.

5. **Herramienta de Google**  
   [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator): introduce tu dominio y el package `com.jasicorporations.prestamos.twa` y revisa que no haya errores.

Cuando la verificación sea correcta, Android abrirá la URL en el TWA y `display: standalone` quitará la barra.
