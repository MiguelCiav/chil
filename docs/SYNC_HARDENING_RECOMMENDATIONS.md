# Recomendaciones para Blindar la Sincronización y Cuota de Firestore a Futuro

Este documento resume las mejoras recomendadas para reducir aún más el riesgo de picos de lecturas en Cloud Firestore (especialmente durante eventos nacionales con 8–10 coordinadores concurrentes) sobre la arquitectura actual de **caché persistente de 24h en IndexedDB** (`src/lib/persistentCache.ts`) y **carga perezosa del scraper** (`src/context/ScraperSettingsContext.tsx`).

---

## 1. Estado Actual (Base Implementada)

- **Navegación y recargas (`F5`):** `0` lecturas en `batches`, `scout_members`, `recognition_types` y `recognition_templates` mientras la caché IndexedDB de 24h esté vigente.
- **Jerarquía territorial:** `src/data/hierarchy.json` empaquetado localmente (`0` lecturas siempre).
- **Creación / edición / fusión / eliminación de lotes:** actualizaciones *write-through* a RAM + IndexedDB (`0` lecturas tras emitir o editar).
- **Sesión Impeesa:** estado cacheado 60 min en `localStorage` y 2 min en `sessionStore.js` (Firebase Functions y Vercel `scraper-api`), con consulta perezosa solo al abrir Ajustes o verificar cédulas.
- **Único multiplicador actual:** el botón manual **"Sincronizar datos"** en `Sidebar.tsx`, que limpia la caché local del `uid` y fuerza una re-descarga completa ($B + M + R$ documentos) desde Firestore.

---

## 2. Recomendaciones Priorizadas

### Prioridad Alta — Cooldown y confirmación en `"Sincronizar datos"`
- **Problema:** Si un usuario ansioso pulsa **"Sincronizar datos"** 3 o 4 veces seguidas, repite $3\text{–}4 \times (B + M + R)$ lecturas completas (por ejemplo, ~14k–19k lecturas para una cuenta con 4,700 documentos).
- **Solución:**
  1. Guardar en `localStorage` la marca `chil_last_manual_sync_${uid}` al completar la sincronización o carga inicial desde servidor.
  2. Aplicar un **cooldown de 5–10 minutos** (deshabilitando el botón con tooltip `"Sincronizado recientemente"` o mostrando un diálogo de confirmación si se solicita antes de tiempo).
  3. Mostrar la hora de la última sincronización en el tooltip para dar tranquilidad visual al usuario sin necesidad de re-sincronizar.

### Prioridad Alta — Plan Blaze con Alerta de Presupuesto para Eventos Nacionales
- **Problema:** El plan Spark gratuito impone un corte duro en **50,000 lecturas/día** y **20,000 escrituras/día**; al cruzar ese umbral Firestore devuelve `8 RESOURCE_EXHAUSTED` y bloquea la app para todos los usuarios.
- **Solución:**
  - Activar **Firebase Blaze** únicamente como seguro anti-bloqueo con una alerta de presupuesto baja (ej. **$1–$2 USD/mes**).
  - Los primeros 50,000 reads/día y 20,000 writes/día siguen siendo **gratuitos**; cada 100,000 lecturas extra cuesta ~$0.06 USD, evitando caídas en días pico.

### Prioridad Media — Sincronización Incremental / Delta (`updated_at > lastSyncAt`)
- **Problema:** Al expirar el TTL de 24h o pulsar **"Sincronizar datos"**, `getAllBatches(uid)` y `getAllMembers(uid)` descargan todo el histórico del usuario, incluyendo lotes antiguos que nunca cambian.
- **Solución:**
  1. Agregar `updated_at` (ISO string o `serverTimestamp()`) en todas las escrituras de `batches`, `scout_members`, `recognition_types` y `recognition_templates`.
  2. Persistir `lastSyncAt` en IndexedDB junto con el snapshot del usuario.
  3. Cuando exista un snapshot previo, consultar únicamente `where('user_id', '==', uid)` + `where('updated_at', '>', lastSyncAt)` y hacer *merge* incremental sobre IndexedDB.
  4. **Consideración obligatoria para borrados:** si un mismo usuario opera desde dos dispositivos distintos, los borrados físicos (`deleteDoc`) no aparecen en queries `updated_at > lastSyncAt`; requerirían *soft-delete* (`deleted_at`) o mantener el botón manual de resincronización completa para limpiezas excepcionales.
- **Impacto esperado:** una sincronización o arranque tras 24h pasa de ~$B + M$ lecturas (~4,700) a **`0–20` lecturas** en días normales.

### Prioridad Media — Endurecer `firestore.rules` con `request.auth`
- **Problema:** Actualmente las colecciones `batches`, `scout_members`, `recognition_types`, `recognition_templates`, `regions`, `districts` y `groups` tienen `allow read, write: if true;` en `firestore.rules`. Cualquier petición externa con el `projectId` público podría consumir cuota de lecturas sin pasar por la SPA.
- **Solución:**
  - Restringir lecturas y escrituras a usuarios autenticados propietarios (`request.auth != null && resource.data.user_id == request.auth.uid` en lectura/update/delete y `request.resource.data.user_id == request.auth.uid` en creación).
  - Bloquear lectura/escritura cliente sobre `regions`, `districts` y `groups` (`allow read, write: if false;`), ya que la SPA las consume exclusivamente desde `src/data/hierarchy.json`.
  - *(Nota: requiere migrar los scripts CLI en `scripts/` para usar `firebase-admin` en lugar del SDK cliente).*

### Prioridad Baja — Archivado o Ventana Temporal por Defecto en Listados Históricos
- **Problema:** A medida que pasen los años, el histórico de `scout_members` por coordinador seguirá creciendo linealmente.
- **Solución:** Si una cuenta supera varios miles de miembros históricos, ofrecer carga inicial filtrada al último año o lotes activos y un botón explícito **"Cargar histórico completo"** para `/resumen` y `/estadisticas`.
