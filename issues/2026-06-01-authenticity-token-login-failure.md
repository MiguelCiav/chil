## Summary
Fallo crítico `Failed to find authenticity_token for login` al realizar múltiples verificaciones consecutivas o procesos repetidos en el scraper.

## Environment
- **Product/Service**: Chil Desktop App
- **Version/Milestone**: v0.6.0 (Módulo de Nuevo Lote)
- **Browser/OS**: Tauri Desktop WebView (Todas las plataformas)

## Reproduction Steps
1. Iniciar la verificación de un lote de cédulas en el asistente de creación en la app de Tauri.
2. Tras finalizar, ingresar una nueva cédula en una línea adicional y hacer clic en "Verificar" nuevamente.
3. Observar la alerta de error o la consola.

## Expected Behavior
El sistema debe realizar la verificación del miembro de manera transparente sin fallas en el inicio de sesión.

## Actual Behavior
El sistema arroja el error crítico `Failed to find authenticity_token for login` bloqueando el proceso.

## Technical Diagnosis & Root Cause
El HTTP client `reqwest` gestionado en el `AppState` de Tauri es persistente durante toda la vida útil de la aplicación.
Cuando el usuario inicia sesión por primera vez, las cookies de sesión se guardan en el tarro de cookies del cliente.
En llamadas posteriores, la función `login` de `scraper_service.rs` intenta realizar un nuevo inicio de sesión:
1. Envía una petición GET a `https://registro.scouts.org.ve/` para obtener la página y extraer el `authenticity_token`.
2. Dado que el cliente **ya se encuentra autenticado**, la web redirige la petición directamente al panel del usuario (*dashboard*).
3. La página de panel no contiene el campo `<input name="authenticity_token">` del formulario de inicio de sesión.
4. El extractor del selector falla al no encontrar el token, arrojando el error `Failed to find authenticity_token for login`.

## Proposed Solution (Fix)
Modificar `login` en `src-tauri/src/services/scraper_service.rs`:
1. Comprobar si el cliente ya está autenticado antes de intentar extraer el token.
2. Al recibir la respuesta de `https://registro.scouts.org.ve/`, comprobar si el URL final no redirige a `/users/sign_in` ni `/login`, y si el HTML de respuesta no contiene los campos típicos del formulario de login (como `user[email]`).
3. Si el usuario ya está autenticado, retornar `Ok(())` de inmediato saltándose el paso de inicio de sesión redundante.

## Impact
**High** - Rompe la usabilidad de reintentos o consultas sucesivas del scraper obligando al usuario a reiniciar la aplicación para poder volver a verificar miembros.
