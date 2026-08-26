import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DesignerHeader } from '../DesignerHeader';

describe('DesignerHeader component', () => {
  it('renders title, back button, mode switcher, upload button, and save button', () => {
    const onTogglePreview = vi.fn();
    const onUploadClick = vi.fn();
    const onSave = vi.fn();
    const onBack = vi.fn();

    render(
      <DesignerHeader
        recognitionName="Insignia de Madera"
        isPreviewMode={false}
        isSaving={false}
        isUploadingBg={false}
        hasBackground={false}
        onTogglePreview={onTogglePreview}
        onUploadClick={onUploadClick}
        onSave={onSave}
        onBack={onBack}
      />
    );

    expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();

    const backBtn = screen.getByLabelText('Volver al catálogo');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();

    const previewToggle = screen.getByRole('button', { name: 'Vista previa con datos de prueba' });
    fireEvent.click(previewToggle);
    expect(onTogglePreview).toHaveBeenCalledWith(true);

    const editToggle = screen.getByRole('button', { name: 'Modo Edición' });
    fireEvent.click(editToggle);
    expect(onTogglePreview).toHaveBeenCalledWith(false);

    const uploadBtn = screen.getByRole('button', { name: /Subir Fondo/i });
    fireEvent.click(uploadBtn);
    expect(onUploadClick).toHaveBeenCalled();

    const saveBtn = screen.getByRole('button', { name: /Guardar Plantilla/i });
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalled();
  });

  it('renders WalkthroughHelpButton and invokes onStartTour when clicked', () => {
    const onStartTour = vi.fn();
    const { container } = render(
      <DesignerHeader
        recognitionName="Insignia de Madera"
        isPreviewMode={false}
        isSaving={false}
        isUploadingBg={false}
        hasBackground={false}
        onTogglePreview={vi.fn()}
        onUploadClick={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onStartTour={onStartTour}
      />
    );

    const helpBtn = screen.getByRole('button', { name: 'Ver guía interactiva' });
    expect(helpBtn).toBeInTheDocument();
    fireEvent.click(helpBtn);
    expect(onStartTour).toHaveBeenCalledTimes(1);

    expect(container.querySelector('[data-walkthrough="designer-header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-walkthrough="designer-mode-switch"]')).toBeInTheDocument();
    expect(container.querySelector('[data-walkthrough="designer-background-btn"]')).toBeInTheDocument();
    expect(container.querySelector('[data-walkthrough="designer-save-btn"]')).toBeInTheDocument();
  });

  it('renders loading states for uploading background and saving template', () => {
    render(
      <DesignerHeader
        recognitionName="Insignia de Madera"
        isPreviewMode={false}
        isSaving={true}
        isUploadingBg={true}
        hasBackground={true}
        onTogglePreview={vi.fn()}
        onUploadClick={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Subiendo\.\.\./i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guardando\.\.\./i })).toBeDisabled();
  });
});
