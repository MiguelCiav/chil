import { WalkthroughStep } from '../../../../components/walkthrough';

export const BATCH_DETAIL_TOUR_STEPS: WalkthroughStep[] = [
  {
    id: 'batch-detail-header',
    targetSelector: '[data-walkthrough="batch-detail-header"]',
    title: 'Detalle y Acciones del Lote',
    content:
      'Consulta la información completa del lote. Desde la cabecera puedes descargar todos los reconocimientos oficiales en PDF, generar el reporte de lista o eliminar el lote si es necesario.',
    placement: 'bottom'
  },
  {
    id: 'batch-detail-summary-cards',
    targetSelector: '[data-walkthrough="batch-detail-summary-cards"]',
    title: 'Resumen y Observaciones',
    content:
      'Revisa la estructura geográfica, el tipo de reconocimiento otorgado, el desglose demográfico de miembros (Jóvenes y Adultos) y los comentarios u observaciones registradas.',
    placement: 'bottom'
  },
  {
    id: 'batch-detail-members-table',
    targetSelector: '[data-walkthrough="batch-detail-members-table"]',
    title: 'Listado de Homenajeados',
    content:
      'Visualiza todos los miembros del lote con su cédula, nombres, unidad scout (Manada, Tropa, No Scout, etc.), estatus y código oficial de reconocimiento.',
    placement: 'top'
  },
  {
    id: 'batch-detail-table-actions',
    targetSelector: '[data-walkthrough="batch-detail-table-actions"]',
    title: 'Gestión Individual de Miembros',
    content:
      'Desde el menú de 3 puntos en cada fila puedes descargar el reconocimiento individual en PDF, consultar la vista rápida o editar los datos (incluyendo la autorización con justificación para casos excepcionales).',
    placement: 'left'
  }
];
