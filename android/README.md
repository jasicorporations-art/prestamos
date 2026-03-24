# Android — Edge-to-edge (Google Play)

En este repositorio **no** existía un proyecto Android; se añadieron archivos de **referencia** para que los copies en tu app (Bubblewrap, Capacitor, Android Studio, etc.).

## 1. Dependencia Gradle (módulo `app`)

En `app/build.gradle` o `app/build.gradle.kts`:

**Groovy**

```gradle
dependencies {
    implementation "androidx.activity:activity-ktx:1.9.3"
    // Si usas AppCompatActivity:
    implementation "androidx.appcompat:appcompat:1.7.0"
    // Si usas Theme.Material3 en themes.xml:
    implementation "com.google.android.material:material:1.12.0"
}
```

**Kotlin DSL**

```kotlin
dependencies {
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
```

## 2. MainActivity

- Copia `app/src/main/java/com/jasicorporations/prestamos/MainActivity.kt` a tu paquete real.
- Cambia la primera línea `package ...` para que coincida con tu `namespace` / `applicationId`.
- En `onCreate`, llama **`enableEdgeToEdge()` justo después de `super.onCreate()`** (como en el archivo de ejemplo).

## 3. Tema transparente

- Copia `res/values/themes.xml` y `res/values-v29/themes.xml`.
- En **AndroidManifest.xml**, en `<application>` o en tu `<activity>` principal, usa el mismo nombre de estilo, por ejemplo:

  `android:theme="@style/Theme.Prestamos"`

- Si ya tienes un tema (p. ej. `AppTheme`), **mezcla** solo los `<item>` de `statusBarColor`, `navigationBarColor`, `windowDrawsSystemBarBackgrounds`, `windowLayoutInDisplayCutoutMode` y, en v29, `enforceNavigationBarContrast` / `enforceStatusBarContrast`.

## 4. PWA / Trusted Web Activity

Si la actividad lanzadora es `LauncherActivity` de **android-browser-helper** y no `MainActivity`, el **tema transparente** sigue siendo necesario; para `enableEdgeToEdge()` habría que ver si tu versión expone hooks o una actividad propia. En muchos casos basta tema + `windowSoftInputMode` y políticas de WebView documentadas por Google.

## 5. Contenido web (CSS)

Para que la PWA no quede bajo las barras del sistema, en tu web usa `viewport-fit=cover` y `env(safe-area-inset-*)` en CSS (ya recomendado para iOS / PWA).

## 6. AndroidManifest — orientación y pantallas grandes (Google Play)

- En **cada** `<activity>` (sobre todo la principal / `MAIN`): **no** uses `android:screenOrientation="portrait"` ni otra orientación fija, salvo excepciones muy justificadas.
- Añade **`android:resizeableActivity="true"`** en la actividad principal para buen comportamiento en tablets y dispositivos plegables.

Ejemplo en este repo: `app/src/main/AndroidManifest.xml`. Si usas **Trusted Web Activity**, edita el `<activity>` que declare `LauncherActivity` en tu manifiesto generado (Bubblewrap, etc.) con los mismos criterios.
