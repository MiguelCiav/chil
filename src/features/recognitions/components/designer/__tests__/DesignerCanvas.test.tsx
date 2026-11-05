import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DesignerCanvas } from '../DesignerCanvas';
import { CertificateTemplate } from '../../../types';

describe('DesignerCanvas component', () => {
  const mockTemplate: CertificateTemplate = {
    background_url: '',
    page_width: 297,
    page_height: 210,
    aspect_ratio: 297 / 210,
    orientation: 'landscape',
    fields: [
      {
        id: 'field-full_name',
        field_key: 'full_name',
        label: 'Nombre y Apellido',
        x: 50,
        y: 42,
        font_family: 'helvetica',
        font_size: 24,
        font_weight: 'bold',
        color: '#1b7a37',
        align: 'center'
      }
    ]
  };

  it('renders default scout graphic when background_url is empty and shows draggable fields', () => {
    const onSelectField = vi.fn();
    const onPointerDownField = vi.fn();
    const canvasRef = { current: document.createElement('div') };

    const { container } = render(
      <DesignerCanvas
        canvasRef={canvasRef}
        template={mockTemplate}
        selectedFieldId="field-full_name"
        isPreviewMode={false}
        fontScale={1}
        recognitionName="Insignia de Madera"
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onPointerDownField={onPointerDownField}
        onSelectField={onSelectField}
      />
    );

    expect(container.querySelector('[data-walkthrough="designer-canvas"]')).toBeInTheDocument();

    expect(screen.getByText('Fondo Estándar Scout')).toBeInTheDocument();
    expect(screen.getByText('[Nombre y Apellido]')).toBeInTheDocument();
    expect(screen.getByText('1 campos posicionados')).toBeInTheDocument();

    const field = screen.getByText('[Nombre y Apellido]');
    fireEvent.click(field);
    expect(onSelectField).toHaveBeenCalledWith('field-full_name');
  });

  it('renders custom background image when background_url is present', () => {
    const templateWithBg: CertificateTemplate = {
      ...mockTemplate,
      background_url: 'data:image/webp;base64,sample'
    };

    render(
      <DesignerCanvas
        canvasRef={{ current: null }}
        template={templateWithBg}
        selectedFieldId={null}
        isPreviewMode={true}
        fontScale={1}
        recognitionName="Insignia de Madera"
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onPointerDownField={vi.fn()}
        onSelectField={vi.fn()}
      />
    );

    expect(screen.getByAltText('Fondo del Certificado')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo Mendoza')).toBeInTheDocument();
  });

  it('renders horizontal and vertical alignment guides when active in edit mode', () => {
    const activeGuides = [
      {
        orientation: 'horizontal' as const,
        position: 50,
        type: 'canvas-center' as const
      },
      {
        orientation: 'vertical' as const,
        position: 25,
        type: 'field-align' as const,
        targetFieldId: 'field-2'
      }
    ];

    render(
      <DesignerCanvas
        canvasRef={{ current: null }}
        template={mockTemplate}
        selectedFieldId="field-full_name"
        isPreviewMode={false}
        fontScale={1}
        activeGuides={activeGuides}
        recognitionName="Insignia de Madera"
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onPointerDownField={vi.fn()}
        onSelectField={vi.fn()}
      />
    );

    const horizontalGuide = screen.getByTestId('alignment-guide-horizontal');
    const verticalGuide = screen.getByTestId('alignment-guide-vertical');

    expect(horizontalGuide).toBeInTheDocument();
    expect(horizontalGuide).toHaveStyle({ top: '50%' });
    expect(verticalGuide).toBeInTheDocument();
    expect(verticalGuide).toHaveStyle({ left: '25%' });
  });

  it('does not render alignment guides when in preview mode', () => {
    const activeGuides = [
      {
        orientation: 'horizontal' as const,
        position: 50,
        type: 'canvas-center' as const
      }
    ];

    render(
      <DesignerCanvas
        canvasRef={{ current: null }}
        template={mockTemplate}
        selectedFieldId="field-full_name"
        isPreviewMode={true}
        fontScale={1}
        activeGuides={activeGuides}
        recognitionName="Insignia de Madera"
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onPointerDownField={vi.fn()}
        onSelectField={vi.fn()}
      />
    );

    expect(screen.queryByTestId('alignment-guide-horizontal')).not.toBeInTheDocument();
  });

  it('nudges selected field coordinates by ±0.5% with Arrow keys and ±2.5% with Shift+Arrow keys', () => {
    const onUpdateFieldCoordinates = vi.fn();
    const onNudgeField = vi.fn();
    const onSelectField = vi.fn();

    render(
      <DesignerCanvas
        canvasRef={{ current: null }}
        template={mockTemplate}
        selectedFieldId="field-full_name"
        isPreviewMode={false}
        fontScale={1}
        recognitionName="Insignia de Madera"
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onPointerDownField={vi.fn()}
        onSelectField={onSelectField}
        onUpdateFieldCoordinates={onUpdateFieldCoordinates}
        onNudgeField={onNudgeField}
      />
    );

    const fieldBtn = screen.getByRole('button', { name: 'Nombre y Apellido' });

    // ArrowRight -> +0.5% X (50 -> 50.5)
    fireEvent.keyDown(fieldBtn, { key: 'ArrowRight' });
    expect(onNudgeField).toHaveBeenLastCalledWith('field-full_name', 0.5, 0);
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-full_name', 50.5, 42);

    // ArrowLeft -> -0.5% X (50 -> 49.5)
    fireEvent.keyDown(fieldBtn, { key: 'ArrowLeft' });
    expect(onNudgeField).toHaveBeenLastCalledWith('field-full_name', -0.5, 0);
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-full_name', 49.5, 42);

    // ArrowUp -> -0.5% Y (42 -> 41.5)
    fireEvent.keyDown(fieldBtn, { key: 'ArrowUp' });
    expect(onNudgeField).toHaveBeenLastCalledWith('field-full_name', 0, -0.5);
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-full_name', 50, 41.5);

    // Shift + ArrowDown -> +2.5% Y (42 -> 44.5)
    fireEvent.keyDown(fieldBtn, { key: 'ArrowDown', shiftKey: true });
    expect(onNudgeField).toHaveBeenLastCalledWith('field-full_name', 0, 2.5);
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-full_name', 50, 44.5);

    // Shift + ArrowRight -> +2.5% X (50 -> 52.5)
    fireEvent.keyDown(fieldBtn, { key: 'ArrowRight', shiftKey: true });
    expect(onNudgeField).toHaveBeenLastCalledWith('field-full_name', 2.5, 0);
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-full_name', 52.5, 42);
  });

  it('clamps keyboard nudged coordinates within [2, 98]', () => {
    const onUpdateFieldCoordinates = vi.fn();
    const edgeTemplate: CertificateTemplate = {
      ...mockTemplate,
      fields: [
        {
          ...mockTemplate.fields[0],
          x: 97.5,
          y: 2.2
        }
      ]
    };

    render(
      <DesignerCanvas
        canvasRef={{ current: null }}
        template={edgeTemplate}
        selectedFieldId="field-full_name"
        isPreviewMode={false}
        fontScale={1}
        recognitionName="Insignia de Madera"
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        onPointerDownField={vi.fn()}
        onSelectField={vi.fn()}
        onUpdateFieldCoordinates={onUpdateFieldCoordinates}
      />
    );

    const fieldBtn = screen.getByRole('button', { name: 'Nombre y Apellido' });

    // Shift + ArrowRight from 97.5% clamps to 98%
    fireEvent.keyDown(fieldBtn, { key: 'ArrowRight', shiftKey: true });
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-full_name', 98, 2.2);

    // ArrowUp from 2.2% clamps to 2%
    fireEvent.keyDown(fieldBtn, { key: 'ArrowUp' });
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-full_name', 97.5, 2);
  });
});
