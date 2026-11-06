import { WalkthroughStep } from '../../../../components/walkthrough';

export const BATCH_LIST_TOUR_STEPS: WalkthroughStep[] = [
  {
    id: 'batch-list-header',
    targetSelector: '[data-walkthrough="batch-list-header"]',
    title: 'Bienvenido al Listado de Lotes',
    content: 'Aquí puedes consultar todos los lotes de reconocimientos emitidos y su estado.',
    placement: 'bottom'
  },
  {
    id: 'batch-list-actions',
    targetSelector: '[data-walkthrough="batch-list-actions"]',
    title: 'Crear Nuevos Lotes',
    content: "Usa '+ Nuevo Lote' para procesar listas masivas con el asistente de 3 pasos, o '⚡ Emisión Rápida' para galardonar a una persona individual al instante.",
    placement: 'bottom'
  },
  {
    id: 'batch-list-filters',
    targetSelector: '[data-walkthrough="batch-list-filters"]',
    title: 'Búsqueda y Filtros Avanzados',
    content: 'Filtra tus lotes por fecha, rango de días, región geográfica o tipo de reconocimiento.',
    placement: 'bottom'
  },
  {
    id: 'batch-list-table',
    targetSelector: '[data-walkthrough="batch-list-table"]',
    title: 'Gestión de Lotes',
    content: 'Haz clic en cualquier lote para ver sus miembros, descargar los reconocimientos oficiales en PDF o administrar los registros.',
    placement: 'top'
  }
];
