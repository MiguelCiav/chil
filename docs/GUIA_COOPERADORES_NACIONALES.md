# Guía de uso de Chil para Cooperadores Nacionales

Esta guía explica cómo usar Chil en el trabajo diario de gestión y emisión de reconocimientos scouts. Está escrita en orden de uso real, desde la configuración inicial hasta la descarga de certificados y reportes.

Si una herramienta de inteligencia artificial utiliza este documento para construir un módulo de ayuda en la web, cada sección de nivel `##` corresponde a un tema independiente y conserva los nombres exactos de rutas y botones de la aplicación.

## Mapa rápido de módulos

| Módulo en el menú lateral | Ruta | Para qué sirve |
|---|---|---|
| Ajustes Scraper | Modal global (pie del menú lateral) | Conectar tu cuenta de Impeesa para verificar cédulas |
| Reconocimientos | `/reconocimientos` | Crear tipos de reconocimiento y diseñar sus plantillas PDF |
| Nuevo Lote | `/lotes/nuevo` | Cargar cédulas, verificar solvencia en Impeesa y emitir un lote |
| Lotes | `/lotes` | Consultar lotes emitidos, fusionar lotes y descargar archivos ZIP |
| Detalle de un lote | `/lotes/:id` | Revisar miembros, corregir datos, re-verificar pendientes y descargar PDF |
| Resumen | `/resumen` | Buscar registros entre todos los lotes y exportar a Excel (CSV) |
| Estadísticas | `/estadisticas` | Consultar totales verificados por territorio, unidad, demografía y mes, y exportar reporte PDF |

---

## 1. Antes de empezar: conectar tu sesión de Impeesa

Chil consulta el Sistema de Registro Impeesa para traer el nombre completo, la solvencia, la unidad y la estructura territorial (región, distrito y grupo) de cada cédula que ingresas. Sin una sesión activa, no podrás verificar miembros nuevos ni re-verificar pendientes.

### Paso a paso

1. Inicia sesión en Chil con tu correo y contraseña.
2. En la parte inferior del menú lateral izquierdo, haz clic en `Ajustes Scraper`.
3. Escribe el correo electrónico y la contraseña que usas en Impeesa.
4. Haz clic en `Conectar Sesión`.
5. Cuando el sistema valide el acceso, verás el aviso de `Sesión activa` y un punto verde sobre el icono de `Ajustes Scraper` en el menú lateral.

### Qué hacer si la sesión expira

Impeesa cierra sesiones tras un tiempo de inactividad. Si al verificar cédulas aparece un aviso de sesión expirada, abre `Ajustes Scraper`, ingresa de nuevo tus credenciales y haz clic en `Actualizar Sesión`. Para cerrar tu conexión en un equipo compartido, usa `Desconectar`.

---

## 2. Crear reconocimientos y diseñar sus plantillas

No puedes emitir un lote si antes no existe al menos un tipo de reconocimiento registrado en el catálogo.

### Crear un tipo de reconocimiento

1. Abre `Reconocimientos` en el menú lateral.
2. Haz clic en `Nuevo Reconocimiento`.
3. Escribe el nombre oficial (por ejemplo, Insignia de Madera o Reconocimiento de Servicio Prolongado) y guarda.

### Diseñar la plantilla del certificado

1. En la tabla de `Reconocimientos`, ubica el reconocimiento que creaste y haz clic en `Plantilla`.
2. Sube el archivo de fondo del certificado. Puedes usar una imagen o un archivo PDF (si el PDF tiene varias páginas, el diseñador toma la primera página).
3. Agrega desde la barra lateral los campos dinámicos que necesites imprimir sobre el diploma (nombre, cédula, código de reconocimiento, fecha, grupo, distrito, región o unidad).
4. Arrastra cada campo sobre el lienzo hasta ubicarlo en su posición. Si necesitas alinear varios textos, mantén activas las guías de ajuste.
5. Selecciona un campo para ajustar su fuente, tamaño, color o alineación en el panel de propiedades.
6. Si borras o mueves algo por error, presiona `Ctrl+Z` (o `Cmd+Z` en Mac) para deshacer.
7. Haz clic en guardar cuando termines. A partir de ese momento, todos los lotes de ese tipo usarán esta plantilla al generar certificados PDF.

---

## 3. Emitir un lote nuevo

El asistente de `Nuevo Lote` funciona en dos pasos: primero cargas y verificas las cédulas; luego revisas la lista, defines los códigos y emites el lote.

### Paso 1: cargar metadatos y cédulas

1. Abre `Nuevo Lote` en el menú lateral.
2. Selecciona una opción en `Tipo de Reconocimiento *`.
3. Escribe un nombre claro en `Título / Comentario del Lote (Opcional)`. Este texto te ayudará a ubicar el lote más adelante.
4. Pega las cédulas en el campo `Cédulas de Identidad *`. Puedes escribir una por línea o separarlas por comas o espacios.
5. Haz clic en `Cargar y Verificar Miembros`. Chil consultará Impeesa y mostrará una barra de progreso mientras procesa la lista.

Ejemplo práctico de carga en el Paso 1:

- Tipo de reconocimiento: Insignia de Madera
- Título / Comentario del Lote: Evento Nacional de Jóvenes 2026 - Primera entrega
- Cédulas de Identidad (ejemplo ficticio):

```text
12345678
23456789
34567890
```

### Paso 2: revisar miembros, asignar códigos y emitir

Al terminar la verificación, pasarás a la pantalla de `Revisión y Confirmación del Lote`. Cada persona aparecerá con uno de estos estatus:

- Activo (Registro Válido): el miembro está solvente en Impeesa y recibirá certificado.
- Pendiente (Registro Inválido): la cédula no figura registrada o no está solvente en Impeesa. No recibe código ni certificado hasta regularizarse o aprobarse como caso excepcional.
- Excepcional: miembro habilitado manualmente con un motivo registrado, por ejemplo por autorización institucional.

Antes de emitir el lote, puedes hacer estos ajustes:

1. Filtra con las pestañas `Todos`, `Válidos` y `Pendientes` para revisar rápidamente quién tiene problemas de registro.
2. Define cómo quieres asignar los códigos de reconocimiento:
   - Modo automático (por defecto): Chil genera códigos únicos de 6 caracteres con formato `REC-XXXXXX` para todos los miembros válidos y excepcionales. Si quieres regenerarlos, haz clic en `Regenerar`.
   - Modo manual: haz clic en `Editar Códigos Manualmente` (o escribe directamente un código personalizado en la casilla de cualquier fila) si tu reconocimiento usa numeración propia, como `SP-2026-001`. Usa `Limpiar` si prefieres vaciar todas las casillas y escribir desde cero.
3. Si necesitas agregar a una persona externa que no pertenece al movimiento scout (agradecimiento institucional), haz clic en `Agregar No Scout`, completa sus datos y guárdala.
4. Para corregir un dato puntual o marcar un caso excepcional, usa el botón de editar en la fila correspondiente. Para sacar a alguien antes de emitir, usa el botón de quitar.
5. Cuando todo esté listo, haz clic en `Emitir Lote`. El sistema guardará el lote y te llevará a su vista de detalle.

---

## 4. Trabajar con un lote ya emitido

Desde `Lotes`, haz clic en cualquier lote para abrir su detalle (`/lotes/:id`). Allí encontrarás los totales del lote, su distribución territorial, la tabla de miembros y las herramientas de mantenimiento posterior a la emisión.

### Descargar certificados y listas

- Para descargar todos los diplomas en un archivo comprimido, haz clic en `Descargar Reconocimientos (ZIP)`. Puedes elegir descargar el lote completo o limitar la descarga a un territorio o grupo específico. Mientras se generan los PDF, verás una barra de progreso con opción para cancelar.
- Para imprimir o archivar la relación del lote, usa la opción de descarga de lista de miembros en PDF en la cabecera.
- Para bajar el diploma de una sola persona, abre el menú de tres puntos de su fila y selecciona `Descargar PDF`.

### Acciones por miembro (menú de tres puntos)

Cada fila tiene un botón de vista rápida (icono de ojo) y un menú de tres puntos con estas acciones:

- `Ver Ficha`: muestra la información completa del miembro sin salir del lote.
- `Editar`: permite corregir datos permitidos después de la emisión. Para cuidar la integridad de los diplomas ya entregados, el sistema bloquea la cédula de un scout activo, impide cambiar entre scout y no scout, y bloquea el código una vez asignado.
- `Re-verificar en Impeesa`: aparece solo en miembros `Pendiente` o `Excepcional`. Consulta Impeesa otra vez para comprobar si ya están solventes.
- `Descargar PDF`: descarga el certificado individual (disponible para miembros activos y excepcionales).
- `Eliminar miembro`: abre una confirmación antes de borrar el registro del lote. Si la persona ya tenía un código emitido, el modal te avisa antes de confirmar. No puedes eliminar al último miembro de un lote; para vaciarlo por completo debes usar `Eliminar Lote` en la cabecera.

### Re-verificar miembros pendientes o excepcionales

Este flujo sirve cuando varios participantes regularizan su registro en Impeesa días después de emitido el lote.

1. Si quieres consultar a todos a la vez, haz clic en el botón `Re-verificar Pendientes / Excepcionales (N)` encima de la tabla. Si solo quieres revisar a una persona, usa `Re-verificar en Impeesa` en su menú de tres puntos.
2. Si el lote usa códigos automáticos, Chil actualiza los datos de quienes ahora figuran activos y les asigna un código nuevo automáticamente.
3. Si el lote usa códigos manuales, se abrirá una ventana para que escribas el código de cada miembro activado antes de guardar los cambios.
4. Si una persona pasó de `Excepcional` a `Activo`, Chil exige un código distinto al código excepcional anterior y muestra un aviso recordándote descargar de nuevo su PDF.

Ejemplo práctico de re-verificación:

Un lote emitido el lunes tiene 18 activos y 2 pendientes porque su grupo aún no había cargado el registro anual. El jueves te confirman que ya están solventes. Abres el lote, haces clic en `Re-verificar Pendientes / Excepcionales (2)`, el sistema los marca como activos, les asigna código y ya puedes descargar sus PDF individuales o regenerar el ZIP.

### Agregar un miembro que faltó en el lote

Si olvidaste incluir una cédula al crear el lote, no hace falta crear uno nuevo solo para una persona:

1. Baja hasta la tarjeta `Añadir Miembro al Lote`, debajo de la tabla.
2. Escribe la cédula en `Cédula del miembro` y haz clic en `Verificar en Impeesa`.
3. Revisa la vista previa con los datos devueltos por Impeesa.
   - Si el lote es automático y la persona está activa, verás el código asignado antes de guardar.
   - Si el lote es manual y la persona está activa, escribe su código en `Código de Reconocimiento *`.
   - Si no está registrada o está inactiva, Chil te avisa que entrará como pendiente sin código.
4. Haz clic en `Agregar al lote`.

Si necesitas incorporar varias personas a la vez, la forma recomendada es crear un lote aparte en `Nuevo Lote` y luego fusionarlo con el lote original.

---

## 5. Fusionar lotes

Cuando dos o más lotes del mismo evento o período quedaron separados, puedes consolidarlos en un solo lote desde `Lotes`.

### Paso a paso

1. Abre `Lotes` en el menú lateral.
2. Marca las casillas de los lotes que deseas unir (mínimo 2).
3. Haz clic en `Fusionar Lotes`.
4. En la ventana de confirmación verás el conteo exacto de miembros únicos resultantes. Si hay cédulas repetidas entre los lotes seleccionados, el sistema te indicará cuántos duplicados consolidará.
5. Revisa si aparece alguna advertencia ámbar por códigos manuales repetidos entre personas distintas; puedes continuar si corresponde o cancelar para revisarlo primero.
6. Escribe el título del lote unificado y confirma la fusión.

### Cómo resuelve Chil los duplicados al fusionar

Si una misma cédula aparece en dos lotes seleccionados, Chil conserva un solo registro priorizando siempre el mejor estatus: primero `Activo`, luego `Excepcional` y por último `Pendiente`. Los miembros sin cédula (`S/C`) se conservan todos para evitar perder agradecimientos de personas distintas.

---

## 6. Buscar en el histórico y exportar a Excel (Resumen)

La sección `Resumen` (`/resumen`) reúne en una sola tabla todos los miembros de todos los lotes emitidos. Es la herramienta indicada cuando necesitas responder preguntas puntuales como si una persona ya recibió un reconocimiento o descargar una base de datos filtrada.

### Paso a paso

1. Abre `Resumen` en el menú lateral.
2. Usa el buscador para localizar por nombre, apellido, cédula o código de reconocimiento.
3. Abre los filtros si quieres acotar por período de fechas, tipo de reconocimiento, región, distrito, grupo, tipo de miembro (jóvenes o adultos) o estatus.
4. Cuando la tabla muestre exactamente lo que necesitas, haz clic en el botón de exportar para descargar el archivo CSV compatible con Excel (`Resumen_Reconocimientos_YYYY-MM-DD.csv`).

Ejemplo práctico:

Un comisionado regional pide el listado de todos los adultos de su región que recibieron un reconocimiento este año. En `Resumen`, filtras por período `Este Año`, eliges la región en el selector de territorio, seleccionas `Adultos` y exportas el CSV.

---

## 7. Consultar indicadores y descargar reporte ejecutivo (Estadísticas)

La sección `Estadísticas` (`/estadisticas`) muestra el resumen consolidado de reconocimientos entregados.

### Qué incluye la pantalla

- Reconocimientos entregados por Región
- Reconocimientos entregados por Distrito
- Reconocimientos entregados por Grupo Scout
- Reconocimientos entregados por Unidad Scout (Manada, Tropa, Caminantes, Clan, Institucional y No scout)
- Resumen de reconocimientos entregados a Jóvenes y Adultos (gráfico circular y tabla)
- Resumen Mensual de Reconocimientos (tabla y gráfico de barras)

### Reglas que conviene conocer al leer los números

- Solo cuentan los registros verificados (`Activo` y `Excepcional`). Los miembros en estado `Pendiente` no se suman porque todavía no tienen reconocimiento emitido. Así, el total de jóvenes y adultos coincide con el total de reconocimientos del período.
- Cuando existen datos del año anterior para los filtros activos, las tablas de Región, Distrito, Grupo Scout, Unidad, Jóvenes/Adultos y Resumen Mensual muestran automáticamente las columnas de año actual, año anterior y variación porcentual, además del total dividido por año al pie de cada sección.

### Cómo filtrar y exportar el reporte en PDF

1. Abre `Estadísticas` en el menú lateral.
2. Si necesitas un corte específico, usa la barra de búsqueda o abre `Filtros` para seleccionar período, tipo de reconocimiento, región, distrito o tipo de miembro.
3. Haz clic en `Exportar todo` en la esquina superior derecha para descargar el reporte en formato PDF (`Reporte_Estadistico_Chil_YYYYMMDD.pdf`) con los filtros aplicados.

---

## 8. Guías interactivas dentro de la aplicación

En pantallas con varios pasos o controles, como `Nuevo Lote`, el detalle de un lote y el diseñador de plantillas, verás un botón con icono de signo de interrogación (`Ver guía interactiva`) junto al título. Al hacer clic, la aplicación resalta cada zona de la pantalla y explica brevemente su función. Puedes repetir el recorrido tantas veces como necesites.

---

## Notas de estructura para implementación en un módulo de ayuda web

Esta sección sirve como referencia técnica si el documento se transforma en una vista de ayuda dentro de Chil:

- Cada encabezado `##` numerado del 1 al 8 puede renderizarse como una sección colapsable, pestaña o ruta independiente de ayuda.
- Los nombres entre comillas invertidas corresponden a etiquetas literales presentes en la interfaz actual en español (botones, campos, pestañas y rutas).
- Los ejemplos numéricos (cédulas como `12345678` o el caso de 18 activos y 2 pendientes) son escenarios ilustrativos de capacitación, no métricas reales del sistema; deben mostrarse claramente como ejemplos.
- No se incluyen credenciales, URLs internas ni capturas; si el módulo web añade capturas, conviene tomarlas directamente sobre las rutas indicadas en el mapa rápido.
