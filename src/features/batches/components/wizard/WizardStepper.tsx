import React from 'react';
import { ClipboardList, Users, CheckCircle2 } from 'lucide-react';
import { getStepCircleClasses } from './wizardHelpers';

export interface WizardStepperProps {
  currentStep: 1 | 2 | 3;
  onStepClick: (step: 1 | 2 | 3) => void;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  onStepClick
}) => {
  const steps = [
    {
      step: 1 as const,
      title: 'Organización',
      desc: 'Metadatos del Lote',
      icon: <ClipboardList className="w-5 h-5" />
    },
    {
      step: 2 as const,
      title: 'Miembros',
      desc: 'Verificación y Carga',
      icon: <Users className="w-5 h-5" />
    },
    {
      step: 3 as const,
      title: 'Generación',
      desc: 'Revisión y Cierre',
      icon: <CheckCircle2 className="w-5 h-5" />
    }
  ];

  return (
    <div data-walkthrough="wizard-stepper" className="relative">
      {/* Background connector bar */}
      <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 -translate-y-1/2 rounded-full z-0" />
      <div
        className="absolute top-6 left-6 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 z-0"
        style={{ width: `calc(${(currentStep - 1) / 2} * (100% - 3rem))` }}
      />

      <div className="relative z-10 flex justify-between">
        {steps.map((item) => (
          <button
            type="button"
            key={item.step}
            onClick={() => {
              // Only allow navigating backward to steps already completed
              if (item.step < currentStep) {
                onStepClick(item.step);
              }
            }}
            className="flex flex-col items-center group focus:outline-none"
            disabled={item.step >= currentStep}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${getStepCircleClasses(
                currentStep,
                item.step
              )}`}
            >
              {item.icon}
            </div>
            <span
              className={`mt-2.5 text-sm font-bold transition-colors ${
                currentStep === item.step ? 'text-primary' : 'text-neutral/70'
              }`}
            >
              {item.title}
            </span>
            <span className="text-xs text-neutral/40 font-medium hidden sm:inline">
              {item.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
