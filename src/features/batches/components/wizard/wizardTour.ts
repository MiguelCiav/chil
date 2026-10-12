import { WalkthroughStep } from '../../../../components/walkthrough';

export const NEW_BATCH_WIZARD_TOUR_STEPS: WalkthroughStep[] = [
  {
    id: 'wizard-header',
    targetSelector: '[data-walkthrough="wizard-header"]',
    title: 'Asistente de Creación de Lote',
    content: 'Crea y emite lotes masivos de reconocimientos scouts mediante un proceso guiado y seguro en 3 sencillos pasos.',
    placement: 'bottom'
  },
  {
    id: 'wizard-stepper',
    targetSelector: '[data-walkthrough="wizard-stepper"]',
    title: 'Progreso del Asistente',
    content: 'El flujo se compone de: 1. Configuración del Lote, 2. Carga y Verificación en el Sistema de Registro, y 3. Revisión de Códigos y Emisión Final.',
    placement: 'bottom'
  },
  {
    id: 'wizard-step-container',
    targetSelector: '[data-walkthrough="wizard-step-container"]',
    title: 'Configuración y Alcance de Unidad',
    content: 'Define el tipo de reconocimiento a otorgar, la estructura geográfica (Región, Distrito, Grupo) y el alcance (Lote Mixto o exclusivo de Manada, Tropa, Caminantes, Clan, Institucional o No Scout).',
    placement: 'bottom'
  },
  {
    id: 'wizard-navigation-buttons',
    targetSelector: '[data-walkthrough="wizard-navigation-buttons"]',
    title: 'Avance entre Pasos',
    content: "Usa 'Siguiente paso' para avanzar. En el paso 2 pegarás las cédulas a verificar, y en el paso 3 el sistema inferirá las unidades por edad y generará los códigos oficiales.",
    placement: 'top'
  }
];
