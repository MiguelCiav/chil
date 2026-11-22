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
      payload: { fieldId: string; x: number; y: number; recordHistory?: boolean };
    }
  | {
      type: 'COMMIT_FIELD_MOVE';
      payload: { fieldId: string; initialX: number; initialY: number; x: number; y: number };
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

function handleAddField(
  state: DesignerHistoryState,
  field: RecognitionFieldConfig
): DesignerHistoryState {
  const exists = state.present.fields.some(
    (f) => f.id === field.id || f.field_key === field.field_key
  );
  if (exists) {
    return state;
  }
  return pushHistory(state, {
    ...state.present,
    fields: [...state.present.fields, field]
  });
}

function handleAddFields(
  state: DesignerHistoryState,
  fieldsToAdd: RecognitionFieldConfig[]
): DesignerHistoryState {
  if (fieldsToAdd.length === 0) {
    return state;
  }
  const existingKeys = new Set(state.present.fields.map((f) => f.field_key));
  const newFields = fieldsToAdd.filter((f) => !existingKeys.has(f.field_key));
  if (newFields.length === 0) {
    return state;
  }
  return pushHistory(state, {
    ...state.present,
    fields: [...state.present.fields, ...newFields]
  });
}

function handleRemoveField(
  state: DesignerHistoryState,
  payload: string | { fieldId: string }
): DesignerHistoryState {
  const fieldId = typeof payload === 'string' ? payload : payload.fieldId;
  const nextFields = state.present.fields.filter((f) => f.id !== fieldId);
  if (nextFields.length === state.present.fields.length) {
    return state;
  }
  return pushHistory(state, {
    ...state.present,
    fields: nextFields
  });
}

function handleToggleField(
  state: DesignerHistoryState,
  fieldKey: RecognitionFieldKey
): DesignerHistoryState {
  const exists = state.present.fields.some((f) => f.field_key === fieldKey);
  if (exists) {
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

function handleUpdateFieldProps(
  state: DesignerHistoryState,
  payload: { fieldId: string; patch: Partial<RecognitionFieldConfig> }
): DesignerHistoryState {
  const { fieldId, patch } = payload;
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

function handleMoveFieldCoordinates(
  state: DesignerHistoryState,
  payload: { fieldId: string; x: number; y: number; recordHistory?: boolean }
): DesignerHistoryState {
  const { fieldId, x, y, recordHistory = true } = payload;
  let changed = false;
  const nextFields = state.present.fields.map((f) => {
    if (f.id !== fieldId || (f.x === x && f.y === y)) return f;
    changed = true;
    return { ...f, x, y };
  });
  if (!changed) {
    return state;
  }
  const nextPresent: CertificateTemplate = {
    ...state.present,
    fields: nextFields
  };
  if (!recordHistory) {
    return {
      ...state,
      present: nextPresent
    };
  }
  return pushHistory(state, nextPresent);
}

function handleCommitFieldMove(
  state: DesignerHistoryState,
  payload: { fieldId: string; initialX: number; initialY: number; x: number; y: number }
): DesignerHistoryState {
  const { fieldId, initialX, initialY, x, y } = payload;
  if (initialX === x && initialY === y) {
    return state;
  }
  const targetExists = state.present.fields.some((f) => f.id === fieldId);
  if (!targetExists) {
    return state;
  }
  const previousPresent: CertificateTemplate = {
    ...state.present,
    fields: state.present.fields.map((f) =>
      f.id === fieldId ? { ...f, x: initialX, y: initialY } : f
    )
  };
  const nextPresent: CertificateTemplate = {
    ...state.present,
    fields: state.present.fields.map((f) => (f.id === fieldId ? { ...f, x, y } : f))
  };
  const nextPast = [...state.past, previousPresent].slice(-MAX_DESIGNER_HISTORY);
  return {
    past: nextPast,
    present: nextPresent,
    future: []
  };
}

function handleUndo(state: DesignerHistoryState): DesignerHistoryState {
  const previous = state.past.at(-1);
  if (!previous) {
    return state;
  }
  const nextPast = state.past.slice(0, -1);
  return {
    past: nextPast,
    present: previous,
    future: [state.present, ...state.future]
  };
}

function handleRedo(state: DesignerHistoryState): DesignerHistoryState {
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

export function designerReducer(
  state: DesignerHistoryState,
  action: DesignerAction
): DesignerHistoryState {
  switch (action.type) {
    case 'LOAD_TEMPLATE':
      return { past: [], present: action.payload, future: [] };

    case 'SET_TEMPLATE': {
      const nextPresent =
        typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      return pushHistory(state, nextPresent);
    }

    case 'ADD_FIELD':
      return handleAddField(state, action.payload);

    case 'ADD_FIELDS':
      return handleAddFields(state, action.payload);

    case 'REMOVE_FIELD':
      return handleRemoveField(state, action.payload);

    case 'TOGGLE_FIELD':
      return handleToggleField(state, action.payload);

    case 'UPDATE_FIELD_PROPS':
      return handleUpdateFieldProps(state, action.payload);

    case 'MOVE_FIELD_COORDINATES':
      return handleMoveFieldCoordinates(state, action.payload);

    case 'COMMIT_FIELD_MOVE':
      return handleCommitFieldMove(state, action.payload);

    case 'RESET_FIELDS':
      return pushHistory(state, {
        ...state.present,
        fields: action.payload ?? buildDefaultTemplateFields()
      });

    case 'SET_BACKGROUND':
      return pushHistory(state, {
        ...state.present,
        ...action.payload
      });

    case 'CLEAR_BACKGROUND':
      return pushHistory(state, {
        ...state.present,
        background_url: '',
        page_width: 297,
        page_height: 210,
        aspect_ratio: 297 / 210,
        orientation: 'landscape'
      });

    case 'UNDO':
      return handleUndo(state);

    case 'REDO':
      return handleRedo(state);

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

  const moveFieldCoordinates = useCallback(
    (fieldId: string, x: number, y: number, options?: { recordHistory?: boolean }) => {
      dispatch({
        type: 'MOVE_FIELD_COORDINATES',
        payload: { fieldId, x, y, recordHistory: options?.recordHistory }
      });
    },
    []
  );

  const moveFieldCoordinatesTransient = useCallback((fieldId: string, x: number, y: number) => {
    dispatch({
      type: 'MOVE_FIELD_COORDINATES',
      payload: { fieldId, x, y, recordHistory: false }
    });
  }, []);

  const commitFieldMove = useCallback(
    (fieldId: string, initialX: number, initialY: number, x: number, y: number) => {
      dispatch({
        type: 'COMMIT_FIELD_MOVE',
        payload: { fieldId, initialX, initialY, x, y }
      });
    },
    []
  );

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
    moveFieldCoordinatesTransient,
    commitFieldMove,
    resetFields,
    setBackground,
    clearBackground,
    undo,
    redo
  };
}
