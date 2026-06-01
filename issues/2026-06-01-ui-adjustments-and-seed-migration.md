## Summary
Ajustes visuales de la interfaz de usuario (Cards, Fields y Selector de Pasos) y migración de semilla desde base de datos externa reconocimientos.db.

## Environment
- **Product/Service**: Chil Desktop App
- **Version/Milestone**: v0.6.0 (Módulo de Nuevo Lote)
- **Browser/OS**: Tauri Desktop WebView (Todas las plataformas)

## Description of Requirements

### 1. Ajuste de altura de campos de texto y selección
*   **Problema**: Los campos de texto y selección de listas desplegables en el formulario del asistente tienen un relleno (`padding`) muy alto (`p-4`), lo que hace que los controles se vean demasiado gigantes y toscos en la interfaz de la aplicación de escritorio.
*   **Solución**: Cambiar el relleno a `py-2.5 px-4` en la clase base de los inputs (`Field.tsx`) y en los campos `<select>` de `NewBatchWizard.tsx` para hacerlos más compactos y profesionales.

### 2. Layout horizontal en los headers de las Cards
*   **Problema**: Los headers de las Cards envuelven todo su contenido en un `div` de bloque vertical único (`text-lg font-semibold`), lo que fuerza a que elementos como iconos + texto, o inputs de búsqueda + texto, se ubiquen en columnas (uno encima del otro) en lugar de alinearse horizontalmente de forma limpia.
*   **Solución**: Cambiar `CardHeader` en `Card.tsx` para usar flexbox horizontal (`flex flex-row items-center justify-between gap-4`) y eliminar la envoltura en un bloque único para que los elementos hijos se distribuyan horizontalmente en un solo renglón.

### 3. Ordenamiento y visualización de campos inhabilitados en el Paso 1
*   **Problema**:
    1.  Los campos de selección jerárquica no están ordenados lógicamente (Región, Distrito y Grupo deben ir secuencialmente de arriba a abajo o de izquierda a derecha en primer plano).
    2.  Los selectores inhabilitados (Distrito y Grupo cuando no hay padre seleccionado) no se distinguen claramente visualmente de los activos, ya que conservan el mismo fondo y color de texto.
*   **Solución**:
    1.  Reordenar los inputs en el grid del Paso 1: colocar Región Scout, Distrito Scout y Grupo Scout secuencialmente en la columna izquierda, y Nombre de Lote e Tipo de Reconocimiento en la columna derecha.
    2.  Agregar clases dinámicas `disabled:bg-gray-100 disabled:text-neutral/30 disabled:border-gray-200 disabled:cursor-not-allowed` a los selectores para que se opaquen y muestren claramente inactivos cuando no están disponibles.

### 4. Centrado de la línea conductora de pasos del asistente
*   **Problema**:
    1.  La barra/línea conductora de color gris y verde se dibuja por debajo de los círculos con iconos, en lugar de pasar exactamente por el medio, debido a que está centrada respecto al alto total del botón contenedor (que incluye el texto del título y descripción debajo del círculo).
    2.  La línea se desborda (`left-0 right-0`) saliendo por fuera del primer y último círculo.
*   **Solución**:
    1.  Centrar la línea verticalmente en el círculo superior (alto exacto 48px, w-12 h-12) utilizando la clase `top-6 -translate-y-1/2` en lugar de `top-1/2`.
    2.  Hacer que comience exactamente en el centro del primer círculo y termine en el centro del último cambiando `left-0 right-0` a `left-6 right-6`.

### 5. Carga de semilla de base de datos externa reconocimientos.db
*   **Problema**: Los desplegables solo muestran las dos regiones y distritos precargados de prueba del código inicial. El usuario proporciona una base de datos local llamada `reconocimientos.db` que contiene los datos reales de 9 regiones, 42 distritos y 151 grupos.
*   **Solución**:
    1.  Desarrollar una función de semilla en el backend de Rust (`src-tauri/src/db/mod.rs`) que, al inicializar la base de datos de la app y verificar si las regiones están vacías (o bajas en conteo), localice y cargue el archivo `reconocimientos.db` de la raíz del proyecto.
    2.  Usar la directiva SQLite `ATTACH DATABASE` para copiar en un solo comando atómico los datos de `regiones` a `region`, `distritos` a `district`, y `grupos` a `scout_group` de forma óptima.

## Impact
**High** - Mejora significativamente el pulido estético y de experiencia de usuario de la aplicación de escritorio a la vez que carga la base de datos real del negocio en producción.
