## Summary
Errores de red en la verificación de miembros debido a falta de autenticación del Scraper

## Environment
- **Product/Service**: Chil Desktop App
- **Version/Milestone**: v0.6.0 (Módulo de Nuevo Lote)
- **Browser/OS**: Tauri Desktop WebView (Todas las plataformas)

## Reproduction Steps
1. Ingresar cédulas en el Paso 2 del asistente en el contenedor de Tauri.
2. Hacer clic en "Verificar".
3. Observar que las filas de verificación asíncronas reportan de inmediato "Error de Red".

## Expected Behavior
El scraper debe consultar el estatus en la web de la ASV y retornar "Activo" o "No Registrado".

## Actual Behavior
Tauri reporta un error de red o fallo de conexión en cada fila de forma sistemática.

## Technical Diagnosis & Root Cause
El backend de Rust en `scraper_service.rs` define que la función de consulta `get_member_status` **asume que el cliente HTTP `reqwest` ya se encuentra autenticado (logeado) con una sesión activa**:

```rust
/// Fetches member status by cedula.
/// Assumes the client is already logged in.
pub async fn get_member_status(client: &Client, cedula: &str) -> Result<MemberDetails, String> { ... }
```

La función `login` requiere credenciales (`email` y `password`) para autenticar la cookie session. 

Sin embargo, al examinar todo el frontend reactivo (`src/`), se descubrió que **el comando IPC `login` nunca es invocado** ni se dispone de una interfaz para capturar o guardar las credenciales del Cooperador para el scraper. En el entorno web simulado en Chrome, este flujo funciona debido a que `isTauri === false` y el frontend retorna inmediatamente datos simulados. En Tauri real, el scraper realiza la petición GET no autenticada a `https://registro.scouts.org.ve/members/status_member_submit`, lo cual genera una redirección 302 hacia la página de sign-in de la ASV, impidiendo que el parser HTML encuentre los selectores de datos y arrojando un error de red/scraping.

## Proposed Solution (Fix)
1.  **Formulario de Credenciales de Scraper (UI)**:
    *   Aprovechar el espacio de "Ruta de Guardado Local" o crear una pestaña de "Ajustes de Cuenta de Scraper" (según el mockup `Lista de Lotes.png` que cuenta con un botón de engrane de ajustes) para permitir al Cooperador ingresar y guardar de forma segura su correo electrónico y contraseña de la ASV.
2.  **Autenticación en Segundo Plano (Tauri Service)**:
    *   Antes de ejecutar las llamadas concurrentes de scraping en el Paso 2, el frontend de React debe comprobar si hay credenciales guardadas en su configuración.
    *   Ejecutar la llamada IPC a `login` para autenticar el tarro de cookies de `reqwest` gestionado en el `AppState` del backend, y solo entonces disparar las consultas de verificación `get_member_status` en paralelo.

## Impact
**High** - Impide por completo el funcionamiento del scraping de registros nacionales en el entorno oficial de escritorio de la aplicación.
