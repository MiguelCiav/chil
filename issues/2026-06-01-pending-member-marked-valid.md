## Summary
El listado de verificación en el asistente marca incorrectamente a los miembros con estatus "pendiente" como "Registro válido", en lugar de mostrarlos como "No registrado" o pendientes.

## Environment
- **Product/Service**: Chil Desktop App
- **Version/Milestone**: v0.6.0 (Módulo de Nuevo Lote)
- **Browser/OS**: Tauri Desktop WebView (Todas las plataformas)

## Reproduction Steps
1. Ingresar la cédula de un miembro registrado cuyo estatus en la ASV sea "pendiente" (ej. el cooperador actual).
2. Hacer clic en "Verificar".
3. Observar la fila en la tabla de verificación.

## Expected Behavior
La fila del miembro debe marcarse con una advertencia visual (etiqueta en color amarillo/rojo) como "No registrado" o inactivo, y guardarse localmente con estatus "pending" en SQLite, impidiendo su selección para la generación de reconocimientos. El nombre completo debe cargarse correctamente.

## Actual Behavior
La aplicación marca al miembro con la etiqueta verde de "Registro válido" y lo guarda como activo en la base de datos local, a pesar de que su estatus en el registro nacional es "pendiente".

## Technical Diagnosis & Root Cause
En `NewBatchWizard.tsx` (`verifyCedula`):
```typescript
const res = await getMemberStatus(cedula);
// Success! Update list with results
setVerificationList(prev => prev.map(item => 
  item.cedula === cedula 
    ? { 
        cedula, 
        name: res.nombre_completo, 
        status: 'Registro válido', 
        type, 
        details: res 
      } 
    : item
));
```
El frontend asume incondicionalmente que cualquier respuesta exitosa (`getMemberStatus` resuelta con éxito) representa un "Registro válido" (activo). No inspecciona el valor de `res.status` devuelto por el scraper de Rust.

## Proposed Solution (Fix)
Modificar `NewBatchWizard.tsx` en la función `verifyCedula`:
1. Comprobar si `res.status.toLowerCase() === 'activo'`.
2. Si es activo, establecer el estado de la fila a `'Registro válido'` y guardar en SQLite con `status: 'active'`.
3. Si es pendiente o cualquier otro valor, establecer el estado a `'No registrado'` (para que el componente de la tabla lo dibuje en rojo/naranja) y guardar en SQLite con `status: 'pending'`.

## Impact
**Medium** - Permite la inclusión errónea de miembros pendientes/inactivos en el lote final de reconocimientos oficiales, violando la regla de negocio de que solo miembros activos pueden recibir reconocimientos.
