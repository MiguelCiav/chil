# Guía de Referencia y Contexto Visual: Wireframes de Chil

> [!IMPORTANT]
> **PREVALENCIA DE REQUISITOS**: Este directorio contiene los wireframes de referencia visual para la aplicación Chil. La funcionalidad y criterios de aceptación definidos en las **Historias de Usuario (User Stories)** siempre prevalecen sobre el diseño gráfico de estos diagramas. Los wireframes sirven como guía para el flujo de interacción, paleta cromática y maquetación de componentes, pero no limitan ni reemplazan las validaciones técnicas o de negocio especificadas en el backlog.

Este documento ofrece una descripción detallada en palabras de cada imagen para asegurar que cualquier agente o desarrollador que no pueda visualizar directamente los archivos multimedia cuente con el contexto visual completo para su implementación.

---

## 1. PASO 1 - Nuevo lote.png (Asistente: Datos de Organización)
* **Propósito**: Pantalla del primer paso de creación de un lote de reconocimientos, enfocada en la configuración inicial y contexto organizativo.
* **Descripción de la Interfaz**:
  * **Barra de Navegación Superior**: Incluye el logotipo "Chil" en tipografía marrón/óxido en la esquina izquierda. Le siguen las pestañas de navegación "Nuevo lote" (con línea inferior marrón activa) y "Listado de lotes". En el extremo derecho, se aprecian un icono de campana de notificaciones, un engrane de configuración y el avatar circular del usuario.
  * **Título y Subtítulo Central**: "Nuevo lote de reconocimientos" en tipografía sans-serif grande y negrita, con la bajada "Ingrese los datos indicados más abajo para comenzar con este nuevo lote." en gris neutro.
  * **Indicador de Progreso (Stepper)**: Una línea horizontal que une tres pasos:
    1. **Organización**: Círculo marrón oscuro con el número `1`, texto en marrón indicando el paso activo.
    2. **Añadir Miembros**: Círculo gris claro con el número `2`, texto en gris (inactivo).
    3. **Revisar y Generar**: Círculo gris claro con el número `3`, texto en gris (inactivo).
  * **Tarjeta de Formulario**: Contenedor principal de fondo blanco con bordes redondeados y sombra suave, dividido verticalmente en dos columnas:
    * **Columna Izquierda (Datos del Lote)**: Contiene un encabezado con un icono de nodos/estructura organizativa seguido del título "Datos del lote". Presenta tres desplegables (dropdowns) apilados de forma vertical con etiquetas en mayúsculas pequeñas:
      * **REGIÓN**: Selector con placeholder "Seleccione Región".
      * **DISTRITO**: Selector con placeholder "Seleccione Distrito".
      * **GRUPO SCOUT**: Selector con placeholder "Seleccione Grupo".
    * **Columna Derecha (Tipo de Reconocimiento)**: Contiene un encabezado con un icono de medalla/reconocimiento seguido de "Tipo de Reconocimiento". Presenta el texto explicativo: "Elige la plantilla o el premio que deseas otorgar a los miembros en este lote." y abajo un selector:
      * **VARIANTE DE RECONOCIMIENTO**: Selector con placeholder "Seleccione el tipo de reconocimiento".
  * **Barra Inferior de la Tarjeta**: Barra de pie de página gris clara. A la izquierda indica en texto pequeño "Paso 1 de 3: Configuración inicial". A la derecha contiene el botón principal "Siguiente paso →" en color marrón sólido con texto y flecha en blanco.

---

## 2. PASO 2 - Añadir miembros.png (Asistente: Ingreso de Cédulas y Previsualización)
* **Propósito**: Pantalla del segundo paso donde se introducen en bloque las cédulas de jóvenes y adultos y se previsualiza el estatus del scraping asíncrono.
* **Descripción de la Interfaz**:
  * **Indicador de Progreso (Stepper)**: La línea de progreso ahora muestra el paso `1` ("Organización") completado con un icono de checkmark (`✓`) marrón. El paso `2` ("Añadir Miembros") está activo con el número en círculo marrón y texto marrón. El paso `3` ("Revisión y Generación") sigue gris e inactivo.
  * **Tarjeta de Entrada y Previsualización**:
    * **Entrada de Datos (Top)**: Dos campos de entrada de área de texto multilínea (TextAreas) lado a lado:
      * **CÉDULAS DE JÓVENES** (Izquierda): Área de texto con instrucciones de marcador de posición: "Ingrese las cédulas de los jóvenes, una por línea, sin puntos ni letras: 1234567, 7890123, 4567890...".
      * **CÉDULAS DE ADULTOS** (Derecha): Idéntica al área de jóvenes con instrucciones aplicadas para adultos.
    * **Sección de Previsualización (Bottom)**: Presenta la tabla de resultados del scraper en tiempo real. En la parte derecha del encabezado se muestra un badge gris: "Mostrando los primeros 5 miembros".
      * **Tabla**: Cuenta con las siguientes columnas:
        * **CÉDULA**: Texto marrón formateado con puntos (ej. "1.234.567").
        * **NAME**: Nombre del miembro en negrita oscura (ej. "Juan Pérez Rodríguez").
        * **ESTATUS**: Badge o pastilla redondeada de color:
          * Verde con punto verde para "Registro válido".
          * Rojo con punto rojo para "No registrado".
        * **TIPO DE MIEMBRO**: Selector de tipo interruptor deslizable (segmented control) con las opciones "Adulto" y "Joven". El estado seleccionado ("Adulto") se visualiza en marrón oscuro, mientras que "Joven" permanece gris claro.
  * **Barra Inferior de la Tarjeta**: Contiene a la izquierda un botón de contorno claro "← Volver" y a la derecha el botón principal "Validar y Continuar →" en marrón con texto blanco.

---

## 3. PASO 3 - Revisión.png (Asistente: Revisión de Resultados)
* **Propósito**: Pantalla final de control del asistente previa a la generación en masa de certificados, mostrando la lista depurada.
* **Descripción de la Interfaz**:
  * **Título y Subtítulo Central**: "Revisión de Resultados" y "Verifique la información antes de proceder a la generación final del lote de reconocimientos."
  * **Indicador de Progreso (Stepper)**: Pasos `1` y `2` marcados con checkmark (`✓`) marrón. Paso `3` ("Revisión") en círculo marrón como activo.
  * **Tarjeta de Revisión**:
    * **Filtros e Historial (Top)**: Pestañas para filtrar rápidamente los miembros ingresados:
      * Pestaña "Registros Válidos" (Activa, con línea inferior marrón gruesa y un badge marrón que muestra "145").
      * Pestaña "Registros Pendientes" (Inactiva, con badge rojo que muestra "3").
      * En la esquina derecha superior de la tarjeta se sitúa una barra de búsqueda para filtrar la lista: "Buscar por nombre o cédula".
    * **Lista de Miembros**: Una lista de filas limpias que muestran:
      * Foto o Avatar del usuario en círculo.
      * Nombre en negrita grande y Cédula abajo en gris (ej. "Laura Martínez", "12.345.678").
      * A la derecha, un botón estilizado con icono de lápiz que dice "Modificar" para editar el perfil o corregir estatus del miembro.
  * **Barra Inferior de la Tarjeta**: A la izquierda el botón de contorno "← Volver". En el centro, un bloque de texto explicativo en gris: *"Se generarán 145 reconocimientos. Los miembros pendientes seguirán en el listado, con el comentario de 'registro pendiente'"*. A la derecha, el botón principal de confirmación "Generar lote 🚀" en fondo marrón con icono de cohete.
  * **Pie de Página Externo**: Pequeño texto centrado "ⓘ ¿Necesitas ayuda con los miembros pendientes?" en gris.

---

## 4. Pantalla de exito.png (Confirmación y Descarga)
* **Propósito**: Pantalla de éxito tras pulsar "Generar lote", mostrando estadísticas del lote, alertas sobre casos pendientes y botones de descarga de reportes PDF.
* **Descripción de la Interfaz**:
  * **Encabezado de Éxito**: Un gran círculo marrón con un checkmark blanco en el centro. Debajo, los textos "¡Lote generado con éxito!" (grande y negrita) y "Tus reconocimientos han sido procesados y están listos para ser entregados."
  * **Tarjetas de Estadísticas (Fila Superior)**:
    * **Total de Reconocimientos** (Doble ancho, izquierda): Muestra el número "145" en tipografía marrón de gran tamaño y abajo la etiqueta "✓ Procesado satisfactoriamente".
    * **Jóvenes** (Individual, centro): Indica "120" con una barra de progreso azul debajo.
    * **Adultos** (Individual, derecha): Indica "25" con una barra de progreso marrón debajo.
  * **Banner de Alerta (Centro)**: Una caja de fondo rojo muy claro y bordes suaves que contiene un icono de advertencia triangular rojo, el texto: "Pendientes: 3 registros. Hay 3 miembros que no están registrados o cuya cédula no se encuentra en el sistema." y en el extremo derecho el botón blanco con letras rojas "Ver detalles".
  * **Sección "Resumen del lote" (Bottom)**: 
    * Muestra un listado paginado con los primeros 5 de 145 miembros.
    * Columnas: `Nombre del Miembro` (con avatar circular de iniciales, ej. "AG Alejandro García"), `Código` (código de certificado autogenerado, ej. "SCT-2024-0192"), `Estado` (pastilla verde "Listo" o roja "Pendiente"), y `Acción` (enlace marrón "Vista previa" o "Corregir").
    * Control de paginación inferior: indica "Página 1 de 29" y botones a la derecha "< Anterior" (inactivo) y "Siguiente >" (marrón activo).
  * **Botonera de Acción Final**:
    * Botón Izquierdo (Primario, gran tamaño): "Descargar todos los reconocimientos (PDF)" en fondo marrón sólido con icono de descarga.
    * Botón Central (Secundario): "Descargar listado de reconocimientos" en fondo blanco con icono de documento y borde gris.
    * Botón Derecho (Secundario): "Volver al inicio" en fondo blanco con bordes grises.

---

## 5. Lista de Lotes.png (Pantalla Principal de Historial)
* **Propósito**: Tablero principal de la aplicación que muestra el historial de lotes emitidos, estadísticas globales y configuración de la ruta de guardado.
* **Descripción de la Interfaz**:
  * **Barra de Navegación**: "Listado de lotes" está activo con la barra inferior marrón.
  * **Tarjetas de Estadísticas Globales**:
    * **Total Generado**: "1,284 Certificados" con icono de certificado.
    * **Reconocimiento más común**: "Go Solar" con icono de estrella.
  * **Ruta de Guardado Local**: Una franja horizontal gris clara que contiene a la izquierda un icono de carpeta y la etiqueta "RUTA DE GUARDADO LOCAL", en el centro un campo de texto mostrando la ruta física: `C:\Usuarios\Admin\Documentos\Certificados_2024` y a la derecha el botón de acción "Cambiar ubicación" en letras marrones.
  * **Sección de Filtros Activos**:
    * Chips o etiquetas con botón de cruz para eliminar: "Fecha: Este Año", "Región: Distrito Capital", "Distrito: Ávila", "Grupo: Don Bosco", "Unidad: Tropa". A la derecha el botón "+ Añadir Filtro".
  * **Tabla de Lotes**:
    * Columnas: `FECHA DE EMISIÓN`, `REGIÓN`, `DISTRITO`, `GRUPO`, `RECONOCIMIENTO`, `CANTIDAD`, `ACCIONES`.
    * Las celdas de reconocimientos usan badges de colores suaves (azul para "Embajadores de la Marea de Plástico", crema para "Tribu de la Tierra", naranja para "Campeones por la Naturaleza").
    * Columna acciones: Botón gris "Acciones", icono de lista e icono de descarga individual.

---

## 6. Detalle de lote.png (Visualización e Información del Lote Seleccionado)
* **Propósito**: Panel detallado de un lote específico que permite auditar las estadísticas de sus miembros y descargar los entregables correspondientes de forma unificada.
* **Descripción de la Interfaz**:
  * **Encabezado**: "Detalle de Lote #LT-2024-089" (con subtítulo "Revisión y gestión de reconocimientos del lote actual."). A la derecha, dos botones: "Descargar lista" (secundario) y "Descargar todos (PDF)" (primario, marrón).
  * **Fila de Tarjetas Informativas**:
    * **Detalles del Lote**: Muestra la jerarquía del lote actual: Región (`Norte`), Distrito (`Metropolitano`), y Grupo (`Scouts 45`).
    * **Tipo de Reconocimiento**: Texto grande que indica la variante otorgada en este lote: "Servicio Prolongado. 5 años".
    * **Resumen de Miembros**: Muestra la métrica total del lote ("145 Total"), con subsegmentos para "Adultos" (25), "Jóvenes" (110) y un banner inferior en rojo claro que indica "Sin registrar: 10".
  * **Tabla "Miembros del Lote"**:
    * Incluye barra de búsqueda en la parte superior derecha: "Buscar miembro...".
    * Columnas: `CÉDULA`, `NOMBRE` (en negrita), `TIPO`, `ESTATUS` (con pastilla verde "Registro Válido" o roja "Registro Inválido"), `CÓDIGO REC.` (código asignado o guion en caso de error) y `ACCIONES` (icono de ojo de visualización rápida e icono de tres puntos de menú de opciones).
    * Paginación en la parte inferior derecha: `< 1 2 3 ... >` con la página 1 activa en color marrón.
