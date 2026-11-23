# Mantenimiento y Actualización de la Jerarquía Territorial (`regions`, `districts`, `groups`)

Este documento explica cómo agregar o actualizar Regiones, Distritos y Grupos Scouts en Chil.

## 1. Fuente de Verdad: `src/data/hierarchy.json`

Para evitar consumir **282 lecturas de Cloud Firestore** en cada cambio de pantalla, la aplicación sirve la estructura territorial (`regions`, `districts`, `groups`) directamente en memoria desde [`src/data/hierarchy.json`](../src/data/hierarchy.json), que es utilizada tanto por:
- [`getHierarchyData()`](../src/features/batches/api/hierarchyApi.ts) (selectores de filtros, formularios de edición, reportes PDF y estadísticas).
- [`matchHierarchy()`](../src/features/batches/utils/hierarchyMatcher.ts) (emparejamiento automático por nombre o `uuid` de Impeesa durante la verificación de cédulas).

---

## 2. Cómo Agregar un Nuevo Grupo, Distrito o Región

Cuando nazca un nuevo Grupo Scout (o eventualmente un Distrito o Región):

1. Abre [`src/data/hierarchy.json`](../src/data/hierarchy.json).
2. Localiza la sección correspondiente (`"regions"`, `"districts"` o `"groups"`).
3. Agrega el nuevo registro siguiendo el esquema de cada entidad:

### A. Nuevo Grupo Scout (`"groups"`)
Asigna el siguiente `id` numérico disponible y el `district_id` del distrito al que pertenece (y opcionalmente su `uuid` en Impeesa si se conoce):

```json
{
  "id": 200,
  "name": "NOMBRE DEL NUEVO GRUPO",
  "district_id": 15,
  "uuid": "opcional-uuid-de-impeesa"
}
```

### B. Nuevo Distrito (`"districts"`)
Asigna el siguiente `id` numérico disponible y el `region_id` de la región a la que pertenece:

```json
{
  "id": 72,
  "name": "NOMBRE DEL NUEVO DISTRITO",
  "region_id": 4,
  "uuid": "opcional-uuid-de-impeesa"
}
```

### C. Nueva Región (`"regions"`)
Asigna el siguiente `id` numérico disponible:

```json
{
  "id": 13,
  "name": "NOMBRE DE LA NUEVA REGION",
  "uuid": "opcional-uuid-de-impeesa"
}
```

> **Nota sobre `id: 0`**: Mantén siempre el registro `{ "id": 0, "name": "No aplica" }` en cada arreglo, ya que representa miembros institucionales nacionales o registros sin unidad territorial asignada.

---

## 3. Sincronización Opcional con Cloud Firestore (`npm run seed-hierarchy`)

Si deseas mantener las colecciones remotas `regions`, `districts` y `groups` en Cloud Firestore sincronizadas con los cambios realizados en `src/data/hierarchy.json`, ejecuta desde la raíz del repositorio:

```bash
npm run seed-hierarchy
```

Este comando ejecuta [`scripts/seed-hierarchy.mjs`](../scripts/seed-hierarchy.mjs), el cual:
1. Compara [`src/data/hierarchy.json`](../src/data/hierarchy.json) contra las colecciones `regions`, `districts` y `groups` en Firestore.
2. Sube **únicamente** los documentos nuevos o cuyos campos (`name`, `region_id`, `district_id`) hayan cambiado, en bloques (`writeBatch`) de hasta 400 registros.

---

## 4. Despliegue del Cambio

Una vez actualizado [`src/data/hierarchy.json`](../src/data/hierarchy.json):
1. Ejecuta la verificación local:
   ```bash
   npm run lint && npm run build && npm test -- --run
   ```
2. Haz commit y push a `main` para que el pipeline de GitHub Actions despliegue el nuevo bundle en Firebase Hosting.
