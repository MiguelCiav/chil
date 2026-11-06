export interface RecognitionTypeInfo {
  id: string;
  name: string;
  category?: string;
}

export const RECOGNITION_TYPES: RecognitionTypeInfo[] = [
  { id: "sct-wood-badge", name: "Insignia de Madera" },
  { id: "sct-promesa", name: "Promesa Scout" },
  { id: "sct-merit", name: "Medalla al Mérito" },
  { id: "sct-long-service", name: "Servicio Distinguido" },
  { id: "sct-service-prolonged", name: "Servicio Prolongado" },
  { id: "sct-plastic-tide", name: "Embajadores de la Marea de Plástico" },
  { id: "sct-earth-tribe", name: "Tribu de la Tierra" },
  { id: "sct-champions-nature", name: "Campeones por la Naturaleza" },
  { id: "sct-go-solar", name: "Go Solar" }
];

export interface BadgeStyle {
  bg: string;
  text: string;
  border: string;
  pillClass: string;
}

export const BADGE_STYLE_RULES: { keywords: string[]; style: BadgeStyle }[] = [
  {
    keywords: ['plástico', 'plastico', 'marea', 'plastic'],
    style: { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200', pillClass: 'bg-sky-100 text-sky-800 border border-sky-200' }
  },
  {
    keywords: ['tribu', 'tierra', 'earth'],
    style: { bg: 'bg-[#e9e7db]', text: 'text-[#5e5c46]', border: 'border-[#d6d3c2]', pillClass: 'bg-[#e9e7db] text-[#5e5c46] border border-[#d6d3c2]' }
  },
  {
    keywords: ['campeones', 'naturaleza', 'champions'],
    style: { bg: 'bg-[#fee2d8]', text: 'text-[#c2410c]', border: 'border-[#fdba74]', pillClass: 'bg-[#fee2d8] text-[#c2410c] border border-[#fdba74]' }
  },
  {
    keywords: ['solar'],
    style: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', pillClass: 'bg-amber-100 text-amber-800 border border-amber-200' }
  },
  {
    keywords: ['servicio', 'service', 'distinguido', 'prolongado'],
    style: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-200', pillClass: 'bg-amber-100 text-amber-900 border border-amber-200' }
  },
  {
    keywords: ['promesa', 'wood', 'madera'],
    style: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', pillClass: 'bg-blue-100 text-blue-800 border border-blue-200' }
  },
  {
    keywords: ['mérito', 'merito'],
    style: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', pillClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200' }
  }
];

export const DEFAULT_BADGE_STYLE: BadgeStyle = {
  bg: 'bg-primary/10',
  text: 'text-primary',
  border: 'border-primary/20',
  pillClass: 'bg-primary/10 text-primary border border-primary/20'
};

export const EMPTY_BADGE_STYLE: BadgeStyle = {
  bg: 'bg-gray-100',
  text: 'text-gray-700',
  border: 'border-gray-200',
  pillClass: 'bg-gray-100 text-gray-700 border border-gray-200'
};

export function getRecognitionBadgeStyle(recognitionIdOrName?: string): BadgeStyle {
  if (!recognitionIdOrName) return EMPTY_BADGE_STYLE;
  const lower = recognitionIdOrName.toLowerCase();
  for (const rule of BADGE_STYLE_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.style;
    }
  }
  return DEFAULT_BADGE_STYLE;
}

export function getRecognitionName(recognitionIdOrName?: string): string {
  if (!recognitionIdOrName) return '-';
  const found = RECOGNITION_TYPES.find(r => r.id === recognitionIdOrName || r.name.toLowerCase() === recognitionIdOrName.toLowerCase());
  return found ? found.name : recognitionIdOrName;
}
