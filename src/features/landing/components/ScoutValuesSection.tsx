import React from 'react';
import { Compass, HeartHandshake, Flame, Award, Shield } from 'lucide-react';
import { ScoutValueItem } from '../types';

export const ScoutValuesSection: React.FC = () => {
  const scoutValues: ScoutValueItem[] = [
    {
      title: 'Promesa y Ley Scout',
      badge: 'Fundamento',
      description:
        'Cada galardón refleja los principios de honor, deber hacia Dios, la patria y el prójimo, promoviendo el crecimiento integral del scout.',
      icon: <Compass className="w-6 h-6 text-primary" />
    },
    {
      title: 'Reconocimiento al Mérito',
      badge: 'Superación',
      description:
        'Valoramos el esfuerzo, la constancia, el servicio desinteresado y el liderazgo de cada beneficiario y adulto voluntario.',
      icon: <Award className="w-6 h-6 text-amber-600" />
    },
    {
      title: 'Hermandad Scout',
      badge: 'Unión',
      description:
        'Conectamos a cada patrulla, clan, grupo y distrito con la gran fraternidad scout nacional y mundial.',
      icon: <HeartHandshake className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'Siempre Listos',
      badge: 'Compromiso',
      description:
        'Innovación tecnológica y herramientas modernas puestas al servicio del escultismo para dejar el mundo en mejores condiciones.',
      icon: <Flame className="w-6 h-6 text-orange-600" />
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-primary/5 via-amber-50/40 to-white rounded-3xl my-8 border border-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Identidad & Tradición</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral tracking-tight">
            Valores que impulsan cada reconocimiento
          </h2>
          <p className="text-sm sm:text-base text-neutral/70">
            Chil honra la trayectoria centenaria del Movimiento Scout, integrando tradición con excelencia técnica.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {scoutValues.map((val) => (
            <div
              key={val.title}
              className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                    {val.icon}
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {val.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral">
                  {val.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral/70 leading-relaxed">
                  {val.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
