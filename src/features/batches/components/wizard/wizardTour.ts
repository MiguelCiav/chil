import { WalkthroughStep } from '../../../../components/walkthrough';

export const NEW_BATCH_WIZARD_TOUR_STEPS: WalkthroughStep[] = [
  {
    id: 'wizard-header',
    targetSelector: '[data-walkthrough="wizard-header"]',
    title: 'Asistente de Creación de Lote',
    content: 'Crea y emite lotes masivos de reconocimientos scouts mediante un proceso guiado y seguro en 2 sencillos pasos.',
    placement: 'bottom'
  },
  {
    id: 'wizard-stepper',
    targetSelector: '[data-walkthrough="wizard-stepper"]',
    title: 'Progreso del Asistente',
    content: 'El flujo se compone de: 1. Carga de Datos y Verificación en el Sistema de Registro, y 2. Edición, Códigos y Confirmación Final.',
    placement: 'bottom'
  },
  {
    id: 'wizard-step-container',
    targetSelector: '[data-walkthrough="wizard-step-container"]',
    title: 'Carga y Verificación Unificada',
    content: 'Selecciona el tipo de reconocimiento e ingresa las cédulas. La estructura territorial (Región, Distrito, Grupo) y las unidades se auto-detectarán.',
    placement: 'bottom'
  },
  {
    id: 'wizard-navigation-buttons',
    targetSelector: '[data-walkthrough="wizard-navigation-buttons"]',
    title: 'Avance entre Pasos',
    content: "Usa 'Cargar y Verificar Miembros' para procesar las cédulas con Impeesa y continuar a la revisión final de códigos y emisión.",
    placement: 'top'
  }
];
