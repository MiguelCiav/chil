import React from 'react';
import {
  Zap,
  Package,
  Palette,
  ShieldCheck,
  BarChart3,
  Lock,
  Check
} from 'lucide-react';
import { FeatureCardItem } from '../types';

interface ExtendedFeatureItem extends FeatureCardItem {
  iconContainerClass: string;
  badgeClass: string;
}

export const FeatureGridSection: React.FC = () => {
  const features: ExtendedFeatureItem[] = [
    {
      id: 'emision-rapida',
      icon: <Zap className="w-6 h-6 text-amber-600" />,
      iconContainerClass: 'bg-amber-100/80 text-amber-700 border-amber-200/80',
      badge: '1 Solo Paso',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200/80',
      title: 'Emisión Rápida',
      description:
        'Reconoce individualmente en 1 solo paso con descarga instantánea de diploma en PDF y asignación automática de código verificable.',
      highlights: [
        'Generación de diploma en segundos',
        'Previsualización en tiempo real',
        'Ideal para entregas urgentes'
      ]
    },
    {
      id: 'lotes-masivos',
      icon: <Package className="w-6 h-6 text-primary" />,
      iconContainerClass: 'bg-primary/10 text-primary border-primary/20',
      badge: 'Escalable & Eficiente',
      badgeClass: 'bg-primary/10 text-primary border-primary/20',
      title: 'Lotes Masivos',
      description:
        'Carga de cédulas, verificación automática en el sistema de registro scout y generación por lotes con códigos únicos.',
      highlights: [
        'Carga masiva de cédulas',
        'Validación en el registro nacional',
        'Descarga consolidada o individual'
      ]
    },
    {
      id: 'disenador-plantillas',
      icon: <Palette className="w-6 h-6 text-blue-600" />,
      iconContainerClass: 'bg-blue-100/80 text-blue-700 border-blue-200/80',
      badge: 'Visual Drag & Drop',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200/80',
      title: 'Diseñador de Plantillas',
      description:
        'Editor visual interactivo adaptado a cualquier dimensión de diploma (horizontal, vertical, A4, carta) con posicionamiento preciso de campos.',
      highlights: [
        'Campos dinámicos de nombres y cédulas',
        'Ajuste milimétrico y tipografías',
        'Exportación con alta fidelidad gráfica'
      ]
    },
    {
      id: 'unidades-scouts',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      iconContainerClass: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/80',
      badge: 'Estructura Scout Completa',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200/80',
      title: 'Unidades Scouts & No Scout',
      description:
        'Soporte completo para Manada, Tropa, Caminantes, Clan, Adultos Institucionales y Agradecimientos a No Scouts.',
      highlights: [
        'Ramas menores y mayores',
        'Agradecimientos a instituciones y aliados'
      ]
    },
    {
      id: 'analitica-territorial',
      icon: <BarChart3 className="w-6 h-6 text-indigo-600" />,
      iconContainerClass: 'bg-indigo-100/80 text-indigo-700 border-indigo-200/80',
      badge: 'Reportes & Métricas',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200/80',
      title: 'Analítica Territorial',
      description:
        'Métricas interanuales (Year-over-Year), distribución geográfica por región y distrito, y exportación ejecutiva en PDF y Excel.',
      highlights: [
        'Comparativas de crecimiento interanual',
        'Desglose por región, distrito y grupo',
        'Reporte estadístico descargable'
      ]
    },
    {
      id: 'seguridad-multi-tenant',
      icon: <Lock className="w-6 h-6 text-neutral" />,
      iconContainerClass: 'bg-slate-100 text-neutral border-slate-200/80',
      badge: 'Privacidad Garantizada',
      badgeClass: 'bg-slate-100 text-neutral border-slate-200/80',
      title: 'Aislamiento y Seguridad',
      description:
        'Privacidad, seguridad y control total sobre los lotes y datos de cada usuario.',
      highlights: [
        'Aislamiento estricto por usuario y grupo',
        'Reglas de seguridad en base de datos',
        'Trazabilidad y auditoría de emisiones'
      ]
    }
  ];

  return (
    <section id="capacidades" className="py-12 sm:py-16 lg:py-20 bg-white/70 backdrop-blur-xs rounded-3xl my-8 sm:my-12 border border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral tracking-tight">
            Todo lo necesario para la gestión de reconocimientos
          </h2>
        </div>

        {/* 6 Capability Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              id={feature.id}
              className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-gray-200/80 hover:border-primary/40 hover:-translate-y-1.5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header Icon + Badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${feature.iconContainerClass}`}
                  >
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${feature.badgeClass}`}
                    >
                      {feature.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-bold text-neutral group-hover:text-primary transition-colors tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-neutral/70 mt-2 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>

              {/* Highlights List */}
              <div className="mt-6 pt-4 border-t border-gray-100/90 space-y-2">
                {feature.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-center gap-2.5 text-xs text-neutral/80">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
