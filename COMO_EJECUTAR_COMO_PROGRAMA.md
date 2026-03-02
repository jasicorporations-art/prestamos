# 🚀 Ejecutar la Aplicación como un Programa

## ✅ Scripts Creados

He creado 3 formas fáciles de ejecutar la aplicación:

### 1. 📄 iniciar-servidor.bat (Más Fácil)

**Para usar:**
1. Haz **doble clic** en el archivo `iniciar-servidor.bat`
2. Se abrirá una ventana que inicia el servidor
3. Espera a ver "Ready"
4. Abre `http://localhost:3000` en tu navegador

**Ventajas:**
- ✅ Solo doble clic
- ✅ No necesitas escribir comandos
- ✅ Funciona en cualquier Windows

### 2. 📄 iniciar-servidor.ps1 (PowerShell)

**Para usar:**
1. Haz **clic derecho** en `iniciar-servidor.ps1`
2. Selecciona **"Ejecutar con PowerShell"**
3. Si aparece un error de política, ejecuta primero:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

**Ventajas:**
- ✅ Más información durante el inicio
- ✅ Mejor manejo de errores

### 3. 📄 compilar-y-ejecutar.bat (Producción)

**Para usar:**
1. Haz **doble clic** en `compilar-y-ejecutar.bat`
2. Compila la aplicación (tarda más la primera vez)
3. Inicia el servidor en modo producción

**Ventajas:**
- ✅ Versión optimizada
- ✅ Más rápida una vez compilada

## 🎯 Crear un Acceso Directo en el Escritorio

### Opción 1: Acceso Directo al Script

1. **Clic derecho** en `iniciar-servidor.bat`
2. Selecciona **"Crear acceso directo"**
3. **Arrastra** el acceso directo al escritorio
4. **Renombra** a "Inversiones Nazaret Reynoso"
5. (Opcional) **Cambia el icono**: Clic derecho > Propiedades > Cambiar icono

### Opción 2: Acceso Directo que Abre el Navegador

1. **Clic derecho** en el escritorio > **Nuevo** > **Acceso directo**
2. **Ubicación:**
   ```
   cmd.exe /c "cd /d C:\Users\Owner\.cursor && start http://localhost:3000 && iniciar-servidor.bat"
   ```
3. **Nombre:** "Inversiones Nazaret Reynoso"
4. **Listo** - Al hacer doble clic, iniciará el servidor y abrirá el navegador

## 🔧 Configurar para Inicio Automático (Opcional)

Si quieres que se inicie automáticamente al encender la computadora:

1. Presiona `Win + R`
2. Escribe: `shell:startup`
3. Presiona Enter
4. **Crea un acceso directo** a `iniciar-servidor.bat` en esa carpeta
5. Ahora se iniciará automáticamente al encender la PC

## 📋 Uso Diario

**Forma más fácil:**
1. Haz **doble clic** en `iniciar-servidor.bat`
2. Espera a ver "Ready" en la ventana
3. Abre `http://localhost:3000` en tu navegador
4. ¡Listo! Ya puedes usar la aplicación

## ⚠️ Importante

- **NO cierres la ventana** donde está corriendo el servidor
- Si la cierras, la aplicación dejará de funcionar
- Para detener el servidor, presiona `Ctrl + C` en la ventana

## 🆘 Si No Funciona

### Error: "Node.js no encontrado"
- Verifica que Node.js está instalado
- Reinstala Node.js desde https://nodejs.org/

### Error: "npm no se reconoce"
- El script debería agregar Node.js al PATH automáticamente
- Si no funciona, verifica que Node.js está en `C:\Program Files\nodejs`

### El servidor no inicia
- Verifica que no hay otra aplicación usando el puerto 3000
- Cierra otras ventanas de PowerShell/CMD que puedan estar corriendo

---

**¡Ahora puedes ejecutar la aplicación con solo un doble clic!** 🎉

