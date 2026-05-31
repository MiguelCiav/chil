## Summary
Pantalla en blanco al navegar a "Nuevo Lote" en el Webview de Tauri v2 (Error de BrowserRouter)

## Environment
- **Product/Service**: Chil Desktop App
- **Version/Milestone**: v0.6.0 (Módulo de Nuevo Lote)
- **Browser/OS**: Linux (Tauri WebView - WebKit2GTK) vs Chrome (Localhost)

## Reproduction Steps
1. Iniciar la aplicación Chil en el entorno de desarrollo de escritorio (`npm run tauri dev`).
2. En la barra de navegación superior, hacer clic en "Nuevo lote" o intentar navegar por código a `/lotes/nuevo`.
3. Observar la pantalla del contenedor de la aplicación.

## Expected Behavior
El asistente de creación de lote (`NewBatchWizard.tsx`) se carga e inicializa correctamente mostrando el Paso 1 (Organización).

## Actual Behavior
El Webview de Tauri se queda completamente en blanco. No se renderiza ningún elemento del DOM y la consola del inspector web de Tauri reporta un fallo de resolución de recurso de ruta. Este comportamiento no ocurre al acceder a la aplicación desde un navegador principal como Google Chrome en `http://localhost:5173/lotes/nuevo`.

## Technical Diagnosis & Root Cause
El problema radica en la utilización de `BrowserRouter` de `react-router-dom` dentro de `src/App.tsx`. 

`BrowserRouter` utiliza la API de Historial de HTML5 (`history.pushState`) para realizar navegación con URLs limpias. Para que esto funcione, el servidor que aloja la aplicación debe estar configurado para redirigir (rewrite) todas las peticiones a subrutas virtuales (como `/lotes/nuevo`) de vuelta al archivo raíz `index.html`, permitiendo al enrutador de React interpretar la ruta del lado del cliente.

En navegadores tradicionales con servidores de desarrollo como Vite (ej. `http://localhost:5173`), esta redirección se maneja automáticamente. Sin embargo, en aplicaciones de escritorio como **Tauri v2** (y Electron), los recursos se empaquetan y se cargan localmente a través de protocolos internos del sistema de archivos (ej. `tauri://localhost/index.html` o `file:///`). Estos protocolos locales de carga de archivos no cuentan con un servidor web que realice fallbacks/redirecciones para rutas virtuales. Como consecuencia, al navegar a `/lotes/nuevo`, el motor Webview busca un archivo o directorio físico con ese nombre, lo cual genera un error de recurso no encontrado y deja la pantalla en blanco.

## Proposed Solution (Fix)
Cambiar el tipo de enrutador en `src/App.tsx` de `BrowserRouter` a **`HashRouter`**. 

`HashRouter` utiliza la porción de hash de la URL para mantener el estado de enrutamiento sincronizado (por ejemplo, `index.html#/lotes/nuevo`). Dado que la porción de la URL a partir del carácter `#` nunca se envía al motor del protocolo del Webview, la aplicación de escritorio siempre carga el archivo `index.html` raíz de forma física y resuelve la ruta a nivel interno de JavaScript. Esta es la solución estándar y recomendada por la documentación oficial de Tauri y Electron para aplicaciones SPA.

## Impact
**Critical** - Bloquea por completo el flujo de creación de nuevos lotes dentro del contenedor oficial de la aplicación de escritorio de Tauri en entornos empaquetados y de desarrollo nativo.

## Additional Context
La solución implica modificar únicamente `src/App.tsx` reemplazando los componentes del enrutador de la siguiente forma:

```diff
-import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
+import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

 function App() {
   return (
-    <BrowserRouter>
+    <HashRouter>
       <MainLayout>
         <Routes>
           ...
         </Routes>
       </MainLayout>
-    </BrowserRouter>
+    </HashRouter>
   );
 }
```
