import { useReducer, useCallback } from 'react';
import {
  CertificateTemplate,
  RecognitionFieldConfig,
  RecognitionFieldKey,
  TemplateFieldDefinition,
  AVAILABLE_TEMPLATE_FIELDS,
  DEFAULT_CERTIFICATE_TEMPLATE
} from '../types';

export const MAX_DESIGNER_HISTORY = 20;

export function buildDefaultField(def: TemplateFieldDefinition): RecognitionFieldConfig {
  return {
    id: `field-${def.field_key}`,
    field_key: def.field_key,
    label: def.label,
    x: def.default_x,
    y: def.default_y,
    font_family: def.default_font_family,
    font_size: def.default_font_size,
    font_weight: def.default_font_weight,
    color: def.default_color,
    align: def.default_align
  };
}

export function buildDefaultTemplateFields(): RecognitionFieldConfig[] {
  return AVAILABLE_TEMPLATE_FIELDS.map(buildDefaultField);
}

export function normalizeLoadedTemplate(
  template?: Partial<CertificateTemplate> | null
): CertificateTemplate {
  if (template && Array.isArray(template.fields)) {
    const pageWidth = template.page_width || 297;
    const pageHeight = template.page_height || 210;
    const aspectRatio =
      template.aspect_ratio ||
      (template.page_width && template.page_height
        ? template.page_width / template.page_height
        : 297 / 210);

    return {
      ...template,
      background_url: template.background_url || '',
      page_width: pageWidth,
      page_height: pageHeight,
      aspect_ratio: aspectRatio,
      orientation: template.orientation || 'landscape',
      fields: template.fields
    };
  }

  return {
    background_url: '',
    page_width: 297,
    page_height: 210,
    aspect_ratio: 297 / 210,
    orientation: 'landscape',
    fields: buildDefaultTemplateFields()
  };
}

export function getMissingTemplateFields(
  currentFields: RecognitionFieldConfig[]
): RecognitionFieldConfig[] {
  const currentKeys = new Set(currentFields.map((f) => f.field_key));
  return AVAILABLE_TEMPLATE_FIELDS.filter((def) => !currentKeys.has(def.field_key)).map(
    buildDefaultField
  );
}

export interface DesignerHistoryState {
  past: CertificateTemplate[];
  present: CertificateTemplate;
  future: CertificateTemplate[];
}

export type DesignerAction =
  | { type: 'LOAD_TEMPLATE'; payload: CertificateTemplate }
  | {
      type: 'SET_TEMPLATE';
      payload: CertificateTemplate | ((prev: CertificateTemplate) => CertificateTemplate);
    }
  | { type: 'ADD_FIELD'; payload: RecognitionFieldConfig }
  | { type: 'ADD_FIELDS'; payload: RecognitionFieldConfig[] }
  | { type: 'REMOVE_FIELD'; payload: string | { fieldId: string } }
  | { type: 'TOGGLE_FIELD'; payload: RecognitionFieldKey }
  | {
      type: 'UPDATE_FIELD_PROPS';
      payload: { fieldId: string; patch: Partial<RecognitionFieldConfig> };
    }
  | {
      type: 'MOVE_FIELD_COORDINATES';
      payload: { fieldId: string; x: number; y: number };
    }
  | { type: 'RESET_FIELDS'; payload?: RecognitionFieldConfig[] }
  | { type: 'SET_BACKGROUND'; payload: Partial<CertificateTemplate> }
  | { type: 'CLEAR_BACKGROUND' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function pushHistory(
  state: DesignerHistoryState,
  nextPresent: CertificateTemplate
): DesignerHistoryState {
  if (nextPresent === state.present) {
    return state;
  }
  const nextPast = [...state.past, state.present].slice(-MAX_DESIGNER_HISTORY);
  return {
    past: nextPast,
    present: nextPresent,
    future: []
  };
}

export function createInitialDesignerState(
  initialTemplate: CertificateTemplate = DEFAULT_CERTIFICATE_TEMPLATE
): DesignerHistoryState {
  return {
    past: [],
    present: initialTemplate,
    future: []
  };
}

export function designerReducer(
  state: DesignerHistoryState,
  action: DesignerAction
): DesignerHistoryState {
  switch (action.type) {
    case 'LOAD_TEMPLATE': {
      return {
        past: [],
        present: action.payload,
        future: []
      };
    }

    case 'SET_TEMPLATE': {
      const nextPresent =
        typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      return pushHistory(state, nextPresent);
    }

    case 'ADD_FIELD': {
      const exists = state.present.fields.some(
        (f) => f.id === action.payload.id || f.field_key === action.payload.field_key
      );
      if (exists) {
        return state;
      }
      return pushHistory(state, {
        ...state.present,
        fields: [...state.present.fields, action.payload]
      });
    }

    case 'ADD_FIELDS': {
      if (action.payload.length === 0) {
        return state;
      }
      const existingKeys = new Set(state.present.fields.map((f) => f.field_key));
      const newFields = action.payload.filter((f) => !existingKeys.has(f.field_key));
      if (newFields.length === 0) {
        return state;
      }
      return pushHistory(state, {
        ...state.present,
        fields: [...state.present.fields, ...newFields]
      });
    }

    case 'REMOVE_FIELD': {
      const fieldId =
        typeof action.payload === 'string' ? action.payload : action.payload.fieldId;
      const nextFields = state.present.fields.filter((f) => f.id !== fieldId);
      if (nextFields.length === state.present.fields.length) {
        return state;
      }
      return pushHistory(state, {
        ...state.present,
        fields: nextFields
      });
    }

    case 'TOGGLE_FIELD': {
      const fieldKey = action.payload;
      const existing = state.present.fields.find((f) => f.field_key === fieldKey);
      if (existing) {
        return pushHistory(state, {
          ...state.present,
          fields: state.present.fields.filter((f) => f.field_key !== fieldKey)
        });
      }
      const def = AVAILABLE_TEMPLATE_FIELDS.find((d) => d.field_key === fieldKey);
      if (!def) {
        return state;
      }
      return pushHistory(state, {
        ...state.present,
        fields: [...state.present.fields, buildDefaultField(def)]
      });
    }

    case 'UPDATE_FIELD_PROPS': {
      const { fieldId, patch } = action.payload;
      let changed = false;
      const nextFields = state.present.fields.map((f) => {
        if (f.id !== fieldId) return f;
        changed = true;
        return { ...f, ...patch };
      });
      if (!changed) {
        return state;
      }
      return pushHistory(state, {
        ...state.present,
        fields: nextFields
      });
    }

    case 'MOVE_FIELD_COORDINATES': {
      const { fieldId, x, y } = action.payload;
      let changed = false;
      const nextFields = state.present.fields.map((f) => {
        if (f.id !== fieldId) return f;
        if (f.x === x && f.y === y) return f;
        changed = true;
        return { ...f, x, y };
      });
      if (!changed) {
        return state;
      }
      return pushHistory(state, {
        ...state.present,
        fields: nextFields
      });
    }

    case 'RESET_FIELDS': {
      const nextFields = action.payload ?? buildDefaultTemplateFields();
      return pushHistory(state, {
        ...state.present,
        fields: nextFields
      });
    }

    case 'SET_BACKGROUND': {
      return pushHistory(state, {
        ...state.present,
        ...action.payload
      });
    }

    case 'CLEAR_BACKGROUND': {
      return pushHistory(state, {
        ...state.present,
        background_url: '',
        page_width: 297,
        page_height: 210,
        aspect_ratio: 297 / 210,
        orientation: 'landscape'
      });
    }

    case 'UNDO': {
      if (state.past.length === 0) {
        return state;
      }
      const previous = state.past[state.past.length - 1];
      const nextPast = state.past.slice(0, -1);
      return {
        past: nextPast,
        present: previous,
        future: [state.present, ...state.future]
      };
    }

    case 'REDO': {
      if (state.future.length === 0) {
        return state;
      }
      const next = state.future[0];
      const nextFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present].slice(-MAX_DESIGNER_HISTORY),
        present: next,
        future: nextFuture
      };
    }

    default:
      return state;
  }
}

export function useDesignerReducer(
  initialTemplate: CertificateTemplate = DEFAULT_CERTIFICATE_TEMPLATE
) {
  const [state, dispatch] = useReducer(
    designerReducer,
    initialTemplate,
    createInitialDesignerState
  );

  const loadTemplate = useCallback((template: CertificateTemplate) => {
    dispatch({ type: 'LOAD_TEMPLATE', payload: template });
  }, []);

  const setTemplate = useCallback(
    (updater: CertificateTemplate | ((prev: CertificateTemplate) => CertificateTemplate)) => {
      dispatch({ type: 'SET_TEMPLATE', payload: updater });
    },
    []
  );

  const addField = useCallback((field: RecognitionFieldConfig) => {
    dispatch({ type: 'ADD_FIELD', payload: field });
  }, []);

  const addFields = useCallback((fields: RecognitionFieldConfig[]) => {
    dispatch({ type: 'ADD_FIELDS', payload: fields });
  }, []);

  const removeField = useCallback((fieldId: string) => {
    dispatch({ type: 'REMOVE_FIELD', payload: fieldId });
  }, []);

  const toggleField = useCallback((fieldKey: RecognitionFieldKey) => {
    dispatch({ type: 'TOGGLE_FIELD', payload: fieldKey });
  }, []);

  const updateFieldProps = useCallback(
    (fieldId: string, patch: Partial<RecognitionFieldConfig>) => {
      dispatch({ type: 'UPDATE_FIELD_PROPS', payload: { fieldId, patch } });
    },
    []
  );

  const moveFieldCoordinates = useCallback((fieldId: string, x: number, y: number) => {
    dispatch({ type: 'MOVE_FIELD_COORDINATES', payload: { fieldId, x, y } });
  }, []);

  const resetFields = useCallback((fields?: RecognitionFieldConfig[]) => {
    dispatch({ type: 'RESET_FIELDS', payload: fields });
  }, []);

  const setBackground = useCallback((patch: Partial<CertificateTemplate>) => {
    dispatch({ type: 'SET_BACKGROUND', payload: patch });
  }, []);

  const clearBackground = useCallback(() => {
    dispatch({ type: 'CLEAR_BACKGROUND' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  return {
    state,
    template: state.present,
    past: state.past,
    present: state.present,
    future: state.future,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    dispatch,
    loadTemplate,
    setTemplate,
    addField,
    addFields,
    removeField,
    toggleField,
    updateFieldProps,
    moveFieldCoordinates,
    resetFields,
    setBackground,
    clearBackground,
    undo,
    redo
  };
}
