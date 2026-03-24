package com.jasicorporations.prestamos

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity

/**
 * Copia este archivo a tu módulo `app` y ajusta el `package` al de tu aplicación
 * (el mismo que `applicationId` / namespace en build.gradle).
 *
 * Si usas Trusted Web Activity y tu launcher es [com.google.androidbrowserhelper.trusted.LauncherActivity],
 * no sustituyas ese flujo: aplica edge-to-edge vía tema (themes.xml) y, si hace falta,
 * consulta la documentación de android-browser-helper para personalizar la Activity.
 */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Edge-to-edge (Google Play / Android 15+): tras super.onCreate (recomendación Android).
        enableEdgeToEdge()
        // setContentView(R.layout.activity_main) // descomenta si usas layout nativo
    }
}
