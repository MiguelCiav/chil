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

export const FeatureGridSection: React.FC = () => {
  const features: FeatureCardItem[] = [
    {
      id: 'emision-rapida',
      icon: <Zap className="w-6 h-6 text-amber-600" />,
      badge: '1 Solo Paso',
      title: 'Emisión Rápida',
      description:
        'Galardona individualmente en 1 solo paso con descarga instantánea de diploma en PDF y asignación automática de código verificable.',
      highlights: [
        'Generación de diploma en segundos',
        'Previsualización en tiempo real',
        'Ideal para eventos y entregas urgentes'
      ]
    },
    {
      id: 'lotes-masivos',
      icon: <Package className="w-6 h-6 text-primary" />,
      badge: 'Escalable & Eficiente',
      title: 'Lotes Masivos',
      description:
        'Carga de cédulas, verificación automática en el sistema de registro scout y generación por lotes con folios y códigos únicos.',
      highlights: [
        'Carga masiva de cédulas y homenajeados',
        'Validación en el registro nacional',
        'Descarga consolidada o individual'
      ]
    },
    {
      id: 'disenador-plantillas',
      icon: <Palette className="w-6 h-6 text-blue-600" />,
      badge: 'Visual Drag & Drop',
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
      badge: 'Estructura Scout Completa',
      title: 'Unidades Scouts & No Scout',
      description:
        'Soporte completo para Manada, Tropa, Caminantes, Clan, Adultos Institucionales y Agradecimientos a No Scouts o Aliados.',
      highlights: [
        'Ramas menores y mayores',
        'Dirigencia y consejos de grupo',
        'Agradecimientos a instituciones y aliados'
      ]
    },
    {
      id: 'analitica-territorial',
      icon: <BarChart3 className="w-6 h-6 text-indigo-600" />,
      badge: 'Reportes & Métricas',
      title: 'Analítica Territorial & YoY',
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
      badge: 'Privacidad Garantizada',
      title: 'Aislamiento Multi-Tenant',
      description:
        'Privacidad, seguridad y control total sobre los lotes y datos de cada dirigente, protegiendo la información institucional.',
      highlights: [
        'Aislamiento estricto por usuario y grupo',
        'Reglas de seguridad en base de datos',
        'Trazabilidad y auditoría de emisiones'
      ]
    }
  ];

  return (
    <section id="capacidades" className="py-12 sm:py-16 lg:py-20 bg-white/60 rounded-3xl my-8 border border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            Capacidades del Sistema
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral tracking-tight">
            Todo lo necesario para la gestión de reconocimientos
          </h2>
          <p className="text-sm sm:text-base text-neutral/70">
            Diseñado desde las bases del escultismo para brindar agilidad técnica y rigurosidad institucional en cada diploma otorgado.
          </p>
        </div>

        {/* 6 Capability Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              id={feature.id}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header Icon + Badge */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-primary/10 border border-gray-200/80 group-hover:border-primary/20 flex items-center justify-center transition-colors">
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-neutral/80 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {feature.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-bold text-neutral group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-neutral/70 mt-1.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>

              {/* Highlights List */}
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                {feature.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-neutral/80">
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
