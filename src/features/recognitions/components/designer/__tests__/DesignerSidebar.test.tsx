import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DesignerSidebar } from '../sidebar/DesignerSidebar';
import { CertificateTemplate } from '../../../types';

describe('DesignerSidebar component', () => {
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

  const normalizedDimensions = {
    width: 297,
    height: 210,
    orientation: 'landscape' as const
  };

  it('switches tabs and renders correct subcomponents', () => {
    const onTabChange = vi.fn();
    const onAddField = vi.fn();
    const onRemoveField = vi.fn();

    const { container, rerender } = render(
      <DesignerSidebar
        activeTab="palette"
        onTabChange={onTabChange}
        template={mockTemplate}
        selectedField={mockTemplate.fields[0]}
        normalizedDimensions={normalizedDimensions}
        isUploadingBg={false}
        onAddField={onAddField}
        onRemoveField={onRemoveField}
        onAddAllFields={vi.fn()}
        onResetFields={vi.fn()}
        onSelectField={vi.fn()}
        onUpdateField={vi.fn()}
        onUploadBgClick={vi.fn()}
        onRemoveBg={vi.fn()}
      />
    );

    expect(container.querySelector('[data-walkthrough="designer-sidebar"]')).toBeInTheDocument();
    expect(screen.getByText('Paleta de Campos')).toBeInTheDocument();

    const estiloTab = screen.getByRole('button', { name: /^Estilo$/i });
    fireEvent.click(estiloTab);
    expect(onTabChange).toHaveBeenCalledWith('properties');

    // Rerender in properties tab
    rerender(
      <DesignerSidebar
        activeTab="properties"
        onTabChange={onTabChange}
        template={mockTemplate}
        selectedField={mockTemplate.fields[0]}
        normalizedDimensions={normalizedDimensions}
        isUploadingBg={false}
        onAddField={onAddField}
        onRemoveField={onRemoveField}
        onAddAllFields={vi.fn()}
        onResetFields={vi.fn()}
        onSelectField={vi.fn()}
        onUpdateField={vi.fn()}
        onUploadBgClick={vi.fn()}
        onRemoveBg={vi.fn()}
      />
    );

    expect(screen.getByText('Propiedades del Campo')).toBeInTheDocument();

    // Rerender in format tab
    rerender(
      <DesignerSidebar
        activeTab="format"
        onTabChange={onTabChange}
        template={mockTemplate}
        selectedField={null}
        normalizedDimensions={normalizedDimensions}
        isUploadingBg={false}
        onAddField={onAddField}
        onRemoveField={onRemoveField}
        onAddAllFields={vi.fn()}
        onResetFields={vi.fn()}
        onSelectField={vi.fn()}
        onUpdateField={vi.fn()}
        onUploadBgClick={vi.fn()}
        onRemoveBg={vi.fn()}
      />
    );

    expect(screen.getByText('Información de Formato y Fondo')).toBeInTheDocument();
  });
});
