# 🛡️ Análisis y Corrección de Incidencias de SonarQube

Este documento recopila de manera estructurada todas las incidencias de **Calidad de Código (Code Smells / Bugs)**, **Confiabilidad (Reliability)** y **Cobertura de Pruebas (Coverage)** detectadas por el análisis de SonarQube Cloud sobre el repositorio Chil.

---

## 1. Incidencias de Calidad y Mantenibilidad (`ISSUES.jpeg` y `RELIABILITY.jpeg`)

### A. Componentes Globales (`src/components/`)
* **`Button.tsx` (L55)**:
  * ⚠️ *Issue*: `Add an explicit "type" attribute to this button.`
  * 🛠️ *Solución*: Asignar `type={type || "button"}` en el `<button>` de `Button.tsx`.
* **`Modal.tsx` (L29, L35, L56)**:
  * ⚠️ *Issue*: `Avoid non-native interactive elements... Visible, non-interactive elements with click handlers must have at least one keyboard listener.` (L29)
  * ⚠️ *Issue*: `Use <dialog> instead of the "dialog" role to ensure accessibility across all devices.` / Accesibilidad de diálogo (L35)
  * ⚠️ *Issue*: `Add an explicit "type" attribute to this button.` (L56)
  * 🛠️ *Solución*: Añadir `role="presentation"`, listener de teclado `onKeyDown` en el backdrop, y `type="button"` en los botones de cierre.
* **`Table.tsx` (L14)**:
  * ⚠️ *Issue*: `Mark the props of the component as read-only.`
  * 🛠️ *Solución*: Añadir modificador `readonly` a las interfaces de props (`Readonly<TableProps>`).

---

### B. Módulo de Lotes (`src/features/batches/`)
* **`api/index.ts` (L393)**:
  * ⚠️ *Issue*: `Prefer 'childNode.remove()' over 'parentNode.removeChild(childNode)'.`
  * 🛠️ *Solución*: Reemplazar `document.body.removeChild(a)` por `a.remove()`.
* **`BatchDetail.tsx` (L51, L77, L199, L206, L216, L228, L232, L237, L246, L257)**:
  * ⚠️ *Issue*: `Prefer 'Number.isNaN' over 'isNaN'.` (L51, L77)
  * ⚠️ *Issue*: `Move this component definition out of the parent component and pass data as props.` (L199, L206, L216, L228, L246, L257) - Evitar definir render helpers / componentes dentro del cuerpo del componente padre.
  * ⚠️ *Issue*: `Ambiguous spacing after previous element span.` (L232, L237)
  * 🛠️ *Solución*: Usar `Number.isNaN`, extraer componentes auxiliares fuera de `BatchDetail`, y arreglar los espacios entre spans (`{' '}`).
* **`BatchList.tsx` (L224, L249, L276, L281, L286, L291, L298, L311, L318, L532)**:
  * ⚠️ *Issue*: `Prefer 'Number.isNaN' over 'isNaN'.` (L224)
  * ⚠️ *Issue*: `Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed.` (L249)
  * ⚠️ *Issue*: `Move this component definition out of the parent component and pass data as props.` (L276-L318)
  * ⚠️ *Issue*: `Extract this nested ternary operation into an independent statement.` (L532)
  * 🛠️ *Solución*: Modularizar columnas y filtros en funciones/hooks independientes, aplanar ternarias anidadas y extraer componentes hijos fuera de la función principal.
* **`NewBatchWizard.tsx` (L178, L243, L436)**:
  * ⚠️ *Issue*: `Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed.` (L178)
  * ⚠️ *Issue*: `Prefer using an optional chain expression instead, as it's more concise and easier to read.` (L243)
  * ⚠️ *Issue*: `Extract this nested ternary operation into an independent statement.` (L436)
  * 🛠️ *Solución*: Simplificar handlers de validación con early returns y encadenamiento opcional (`?.`), simplificar la renderización condicional por pasos.
* **`SuccessPage.tsx` (L125, L138, L148, L164, L174)**:
  * ⚠️ *Issue*: `Move this component definition out of the parent component and pass data as props.`
  * 🛠️ *Solución*: Extraer sub-componentes de tarjetas de resumen fuera del componente `SuccessPage`.

---

### C. Módulo de Reconocimientos (`src/features/recognitions/`)
* **`CertificateDesigner.tsx` (L762 / RELIABILITY.jpeg)**:
  * ⚠️ *Issue*: `Visible, non-interactive elements with click handlers must have at least one keyboard listener.`
  * 🛠️ *Solución*: Agregar `role="button"`, `tabIndex={0}`, y listener de teclado `onKeyDown` para seleccionar campos con Enter / Espacio.

---

## 2. Cobertura de Código a Incrementar (`COVERAGE.jpeg`)

| Archivo | Cobertura Inicial | Meta | Acciones de Prueba Requeridas |
| :--- | :---: | :---: | :--- |
| **`src/features/recognitions/api/index.ts`** | 55.8% | **> 90%** | Probar `processBackgroundImageFile`, errores de Firestore, fallback en canvas, formatos PNG/JPEG/WEBP y `updateRecognitionType`. |
| **`src/features/batches/components/BatchList.tsx`** | 61.9% | **> 85%** | Probar filtros activos (fecha, región, distrito, grupo, reconocimiento), paginación y ordenamiento. |
| **`src/features/recognitions/components/RecognitionDeleteModal.tsx`** | 69.0% | **> 95%** | Probar errores de borrado, deshabilitado de botones durante `deleting`, cierre con backdrop y cancelación. |
| **`src/features/batches/components/BatchDetail.tsx`** | 77.4% | **> 90%** | Probar modal de edición de miembro, descarga individual de diplomas, exportación CSV con diferentes estados de miembros. |
| **`src/features/batches/components/SuccessPage.tsx`** | 77.8% | **> 95%** | Probar descarga de PDF de lote, redirección a `/lotes` y estado con datos de lote cargados. |
| **`src/features/recognitions/components/CertificateDesigner.tsx`** | 80.5% | **> 90%** | Probar subida de fondo con archivo, cambio de colores con input hexadecimal, cambio de coordenadas numéricas manuales y atajos de teclado. |
| **`src/features/recognitions/components/RecognitionFormModal.tsx`** | 80.8% | **> 95%** | Probar captura de errores en `createRecognitionType` / `updateRecognitionType` y reset de formulario. |

---
