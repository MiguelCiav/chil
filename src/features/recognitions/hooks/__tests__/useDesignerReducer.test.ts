import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  useDesignerReducer,
  MAX_DESIGNER_HISTORY,
  buildDefaultField,
  buildDefaultTemplateFields,
  normalizeLoadedTemplate,
  getMissingTemplateFields
} from '../useDesignerReducer';
import {
  AVAILABLE_TEMPLATE_FIELDS,
  DEFAULT_CERTIFICATE_TEMPLATE,
  CertificateTemplate
} from '../../types';

describe('useDesignerReducer hook', () => {
  it('initializes with empty past/future and default template', () => {
    const { result } = renderHook(() => useDesignerReducer());

    expect(result.current.template).toEqual(DEFAULT_CERTIFICATE_TEMPLATE);
    expect(result.current.past).toHaveLength(0);
    expect(result.current.future).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('LOAD_TEMPLATE sets present template and clears past/future without pushing to undo history', () => {
    const { result } = renderHook(() => useDesignerReducer());
    const fullNameField = buildDefaultField(AVAILABLE_TEMPLATE_FIELDS[0]);

    act(() => {
      result.current.addField(fullNameField);
    });
    expect(result.current.canUndo).toBe(true);

    const loadedTemplate: CertificateTemplate = {
      background_url: 'data:image/jpeg;base64,loaded',
      page_width: 1920,
      page_height: 1080,
      aspect_ratio: 1920 / 1080,
      orientation: 'landscape',
      fields: [fullNameField]
    };

    act(() => {
      result.current.loadTemplate(loadedTemplate);
    });

    expect(result.current.template).toEqual(loadedTemplate);
    expect(result.current.past).toHaveLength(0);
    expect(result.current.future).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('supports adding, updating, moving, toggling, and removing fields with undo/redo', () => {
    const { result } = renderHook(() => useDesignerReducer());
    const fullNameField = buildDefaultField(AVAILABLE_TEMPLATE_FIELDS[0]);

    // Add field
    act(() => {
      result.current.addField(fullNameField);
    });
    expect(result.current.template.fields).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    // Duplicate add is ignored
    act(() => {
      result.current.addField(fullNameField);
    });
    expect(result.current.past).toHaveLength(1);

    // Move field coordinates
    act(() => {
      result.current.moveFieldCoordinates(fullNameField.id, 65, 35);
    });
    expect(result.current.template.fields[0].x).toBe(65);
    expect(result.current.template.fields[0].y).toBe(35);
    expect(result.current.past).toHaveLength(2);

    // Update field properties
    act(() => {
      result.current.updateFieldProps(fullNameField.id, {
        font_size: 32,
        color: '#003366'
      });
    });
    expect(result.current.template.fields[0].font_size).toBe(32);
    expect(result.current.template.fields[0].color).toBe('#003366');
    expect(result.current.past).toHaveLength(3);

    // Undo property change
    act(() => {
      result.current.undo();
    });
    expect(result.current.template.fields[0].font_size).toBe(fullNameField.font_size);
    expect(result.current.template.fields[0].x).toBe(65);
    expect(result.current.canRedo).toBe(true);

    // Redo property change
    act(() => {
      result.current.redo();
    });
    expect(result.current.template.fields[0].font_size).toBe(32);
    expect(result.current.canRedo).toBe(false);

    // Toggle field (removes since it exists)
    act(() => {
      result.current.toggleField('full_name');
    });
    expect(result.current.template.fields).toHaveLength(0);

    // Toggle field again (adds it back)
    act(() => {
      result.current.toggleField('full_name');
    });
    expect(result.current.template.fields).toHaveLength(1);

    // Remove field explicitly
    act(() => {
      result.current.removeField(fullNameField.id);
    });
    expect(result.current.template.fields).toHaveLength(0);
  });

  it('caps undo history at 20 steps (MAX_DESIGNER_HISTORY)', () => {
    const { result } = renderHook(() =>
      useDesignerReducer({
        ...DEFAULT_CERTIFICATE_TEMPLATE,
        fields: [buildDefaultField(AVAILABLE_TEMPLATE_FIELDS[0])]
      })
    );

    const fieldId = result.current.template.fields[0].id;

    // Perform 25 coordinate updates
    for (let i = 1; i <= 25; i++) {
      act(() => {
        result.current.moveFieldCoordinates(fieldId, 10 + i, 20 + i);
      });
    }

    expect(result.current.past).toHaveLength(MAX_DESIGNER_HISTORY);
    expect(result.current.template.fields[0].x).toBe(35);

    // Undo all 20 available steps
    for (let i = 0; i < MAX_DESIGNER_HISTORY; i++) {
      act(() => {
        result.current.undo();
      });
    }

    expect(result.current.canUndo).toBe(false);
    expect(result.current.past).toHaveLength(0);
    expect(result.current.future).toHaveLength(MAX_DESIGNER_HISTORY);
    // State after 20 undos from step 25 is step 5 (10 + 5 = 15)
    expect(result.current.template.fields[0].x).toBe(15);
  });

  it('clears future history when a new mutation is dispatched after undo', () => {
    const { result } = renderHook(() => useDesignerReducer());
    const field1 = buildDefaultField(AVAILABLE_TEMPLATE_FIELDS[0]);
    const field2 = buildDefaultField(AVAILABLE_TEMPLATE_FIELDS[1]);

    act(() => {
      result.current.addField(field1);
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.addField(field2);
    });
    expect(result.current.canRedo).toBe(false);
    expect(result.current.future).toHaveLength(0);
    expect(result.current.template.fields).toHaveLength(1);
    expect(result.current.template.fields[0].field_key).toBe(field2.field_key);
  });

  it('handles SET_BACKGROUND, CLEAR_BACKGROUND, ADD_FIELDS, and RESET_FIELDS with undo support', () => {
    const { result } = renderHook(() => useDesignerReducer());

    act(() => {
      result.current.setBackground({
        background_url: 'data:image/jpeg;base64,custom',
        page_width: 1920,
        page_height: 1080,
        aspect_ratio: 1.777,
        orientation: 'landscape'
      });
    });
    expect(result.current.template.background_url).toBe('data:image/jpeg;base64,custom');
    expect(result.current.template.page_width).toBe(1920);

    act(() => {
      result.current.clearBackground();
    });
    expect(result.current.template.background_url).toBe('');
    expect(result.current.template.page_width).toBe(297);

    act(() => {
      result.current.undo();
    });
    expect(result.current.template.background_url).toBe('data:image/jpeg;base64,custom');

    const missing = getMissingTemplateFields(result.current.template.fields);
    act(() => {
      result.current.addFields(missing);
    });
    expect(result.current.template.fields).toHaveLength(AVAILABLE_TEMPLATE_FIELDS.length);

    act(() => {
      result.current.moveFieldCoordinates(result.current.template.fields[0].id, 88, 77);
    });
    expect(result.current.template.fields[0].x).toBe(88);

    act(() => {
      result.current.resetFields();
    });
    expect(result.current.template.fields[0].x).toBe(AVAILABLE_TEMPLATE_FIELDS[0].default_x);
  });

  it('normalizes loaded templates and builds default fields accurately', () => {
    const fallback = normalizeLoadedTemplate(null);
    expect(fallback.page_width).toBe(297);
    expect(fallback.page_height).toBe(210);
    expect(fallback.fields).toHaveLength(AVAILABLE_TEMPLATE_FIELDS.length);

    const custom = normalizeLoadedTemplate({
      background_url: 'https://example.com/bg.jpg',
      page_width: 1600,
      page_height: 1200,
      fields: buildDefaultTemplateFields().slice(0, 2)
    });
    expect(custom.aspect_ratio).toBeCloseTo(1600 / 1200, 4);
    expect(custom.fields).toHaveLength(2);
  });
});
