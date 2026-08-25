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

    render(
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
});
