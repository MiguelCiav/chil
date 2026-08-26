import React from 'react';
import { Sliders, CheckCircle, Award, ArrowRight } from 'lucide-react';
import { WorkflowStepItem } from '../types';

export const WorkflowSection: React.FC = () => {
  const steps: WorkflowStepItem[] = [
    {
      stepNumber: 1,
      title: '1. Configurar',
      tagline: 'Estructura & Reconocimiento',
      description:
        'Selecciona el tipo de reconocimiento del catálogo oficial y define la región, distrito, grupo o institución.',
      icon: <Sliders className="w-7 h-7 text-primary" />
    },
    {
      stepNumber: 2,
      title: '2. Verificar',
      tagline: 'Validación en Tiempo Real',
      description:
        'Ingresa las cédulas para consultar automáticamente la membresía y estatus oficial en el sistema de registro.',
      icon: <CheckCircle className="w-7 h-7 text-green-600" />
    },
    {
      stepNumber: 3,
      title: '3. Emitir',
      tagline: 'Reconocimientos & Códigos Únicos',
      description:
        'Genera los reconocimientos PDF de alta resolución con códigos únicos para descarga individual o masiva.',
      icon: <Award className="w-7 h-7 text-amber-600" />
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral tracking-tight">
            ¿Cómo funciona Chil?
          </h2>
          <p className="text-sm sm:text-base text-neutral/70">
            Un proceso ágil, intuitivo y estandarizado en solo tres pasos.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => (
            <div
              key={step.stepNumber}
              className="relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs hover:shadow-md hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Step Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <span className="text-3xl sm:text-4xl font-black font-mono text-primary/25 group-hover:text-primary/40 transition-colors select-none">
                    0{step.stepNumber}
                  </span>
                </div>

                {/* Step Info */}
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {step.tagline}
                </span>
                <h3 className="text-xl font-bold text-neutral mt-1.5 mb-2.5 tracking-tight group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-neutral/70 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-end mt-6 text-primary/40 group-hover:text-primary/70 transition-colors">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
