import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CertificateDesigner } from '../CertificateDesigner';
import * as api from '../../api';
import { RecognitionType } from '../../types';

const mockNavigate = vi.fn();
let mockParams: { id?: string } = { id: 'sct-wood-badge' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams
}));

vi.mock('../../api', () => ({
  getRecognitionTypeById: vi.fn(),
  saveCertificateTemplate: vi.fn(),
  processBackgroundImageFile: vi.fn()
}));

const mockRecognition: RecognitionType = {
  id: 'sct-wood-badge',
  name: 'Insignia de Madera',
  created_at: '2026-01-01T00:00:00.000Z'
};

const mockRecognitionWithTemplate: RecognitionType = {
  ...mockRecognition,
  template: {
    background_url: 'data:image/webp;base64,sampleimage',
    page_width: 1920,
    page_height: 1080,
    aspect_ratio: 1.777,
    orientation: 'landscape',
    fields: [
      {
        id: 'field-full_name',
        field_key: 'full_name',
        label: 'Nombre y Apellido',
        x: 50,
        y: 42,
        font_family: 'helvetica',
        font_size: 26,
        font_weight: 'bold',
        color: '#1b7a37',
        align: 'center'
      }
    ]
  }
};

describe('CertificateDesigner component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'sct-wood-badge' };
  });

  it('renders loading state initially and then renders clean header and default template with format badge', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognition);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // Clean title - no prefix
    expect(screen.queryByText(/Diseñador de Plantilla:/i)).not.toBeInTheDocument();

    // Default tab is palette
    expect(screen.getByText('Paleta de Campos')).toBeInTheDocument();

    // Icon-only mode switcher with accessible titles/aria-labels
    expect(screen.getByRole('button', { name: 'Modo Edición' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vista previa con datos de prueba' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar Plantilla/i })).toBeInTheDocument();
    expect(screen.getAllByText('Formato: 297 × 210 mm').length).toBeGreaterThan(0);
  });

  it('renders not-found state when recognition does not exist', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(null);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByText('Reconocimiento no encontrado')).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /Volver al Catálogo/i });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/reconocimientos');
  });

  it('navigates back to /reconocimientos when Volver button is clicked in header', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognition);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const backBtn = screen.getByLabelText('Volver al catálogo');
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/reconocimientos');
  });

  it('loads existing template fields, custom aspect ratio and format badge', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    expect(screen.getByText('[Nombre y Apellido]')).toBeInTheDocument();
    expect(screen.getByAltText('Fondo del Certificado')).toBeInTheDocument();
    expect(screen.getAllByText('Formato: 1920 × 1080 (16:9)').length).toBeGreaterThan(0);
  });

  it('adds a field from palette to the canvas, selects it, and auto-switches to properties tab', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // In mockRecognitionWithTemplate, only 'full_name' is placed. 'identity' is not placed.
    const addIdentityBtn = screen.getByLabelText('Añadir Cédula de Identidad');
    fireEvent.click(addIdentityBtn);

    expect(screen.getByText('[Cédula de Identidad]')).toBeInTheDocument();
    expect(screen.getByText('Propiedades del Campo')).toBeInTheDocument();
    expect(screen.getByText('Campo "Cédula de Identidad" añadido a la plantilla.')).toBeInTheDocument();
  });

  it('removes a field from palette remove button', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const removeBtn = screen.getByLabelText('Eliminar campo Nombre y Apellido');
    fireEvent.click(removeBtn);

    expect(screen.queryByText('[Nombre y Apellido]')).not.toBeInTheDocument();
    expect(screen.getByText('Campo "Nombre y Apellido" eliminado.')).toBeInTheDocument();
  });

  it('adds all missing fields when "Añadir todos los campos" is clicked', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const addAllBtn = screen.getByText('Añadir todos los campos');
    fireEvent.click(addAllBtn);

    expect(screen.getByText('[Cédula de Identidad]')).toBeInTheDocument();
    expect(screen.getByText('[Región Scout]')).toBeInTheDocument();
    expect(screen.getByText('[Distrito Scout]')).toBeInTheDocument();
    expect(screen.getByText('[Grupo Scout]')).toBeInTheDocument();
  });

  it('resets fields to standard positions when "Restablecer posiciones" is clicked', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const resetBtn = screen.getByText('Restablecer posiciones');
    fireEvent.click(resetBtn);

    expect(screen.getByText('Campos restablecidos a las posiciones estándar.')).toBeInTheDocument();
  });

  it('updates selected field typography (font family, font size, weight, color, alignment, coordinates)', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // Switch to Estilo tab to edit properties
    const estiloTabBtn = screen.getByRole('button', { name: /^Estilo$/i });
    fireEvent.click(estiloTabBtn);

    // Change font family to Times
    const timesBtn = screen.getByRole('button', { name: 'Times' });
    fireEvent.click(timesBtn);

    // Change font size
    const fontSizeSlider = screen.getByLabelText('Tamaño de fuente');
    fireEvent.change(fontSizeSlider, { target: { value: '36' } });
    expect(screen.getByText('36 pt')).toBeInTheDocument();

    // Change font style to Italic
    const italicBtn = screen.getByRole('button', { name: 'Cursiva' });
    fireEvent.click(italicBtn);

    // Change color using preset
    const blueColorBtn = screen.getByLabelText('Color Azul Marino');
    fireEvent.click(blueColorBtn);

    // Change custom hex color input
    const customColorInput = screen.getByLabelText('Selector de color personalizado');
    fireEvent.change(customColorInput, { target: { value: '#ff5500' } });

    // Change alignment to Right
    const alignRightBtn = screen.getByLabelText('Alineación Derecha');
    fireEvent.click(alignRightBtn);

    // Change coordinates X, Y
    const inputX = screen.getByLabelText('Coordenada X');
    const inputY = screen.getByLabelText('Coordenada Y');
    fireEvent.change(inputX, { target: { value: '60' } });
    fireEvent.change(inputY, { target: { value: '55' } });

    expect(inputX).toHaveValue(60);
    expect(inputY).toHaveValue(55);
  });

  it('deletes selected field from properties panel and switches back to palette', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // Switch to Estilo tab
    const estiloTabBtn = screen.getByRole('button', { name: /^Estilo$/i });
    fireEvent.click(estiloTabBtn);

    const deleteBtn = screen.getByLabelText('Eliminar campo del certificado');
    fireEvent.click(deleteBtn);

    expect(screen.queryByText('[Nombre y Apellido]')).not.toBeInTheDocument();
  });

  it('toggles between edit mode and mock data preview mode with icon buttons', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // In Edit Mode
    expect(screen.getByText('[Nombre y Apellido]')).toBeInTheDocument();

    // Switch to Preview Mode
    const previewToggle = screen.getByRole('button', { name: 'Vista previa con datos de prueba' });
    fireEvent.click(previewToggle);

    // In Preview Mode, realistic scout mock data should be displayed
    expect(screen.getByText('Carlos Eduardo Mendoza')).toBeInTheDocument();
    expect(screen.queryByText('[Nombre y Apellido]')).not.toBeInTheDocument();

    // Switch back to Edit Mode
    const editToggle = screen.getByRole('button', { name: 'Modo Edición' });
    fireEvent.click(editToggle);

    expect(screen.getByText('[Nombre y Apellido]')).toBeInTheDocument();
  });

  it('handles background image upload with dynamic aspect ratio and removal from format tab', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognition);
    vi.mocked(api.processBackgroundImageFile).mockResolvedValue({
      dataUrl: 'data:image/webp;base64,newuploadedbg',
      width: 1920,
      height: 1080,
      naturalWidth: 1920,
      naturalHeight: 1080,
      normalizedWidth: 297,
      normalizedHeight: 167.14,
      aspectRatio: 1.777,
      orientation: 'landscape'
    });

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText('Subir imagen de fondo');
    const testFile = new File(['fake-image-bytes'], 'bg.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(api.processBackgroundImageFile).toHaveBeenCalledWith(testFile);
      expect(screen.getByText('Imagen de fondo cargada y optimizada exitosamente.')).toBeInTheDocument();
      expect(screen.getAllByText('Formato: 1920 × 1080 (16:9)').length).toBeGreaterThan(0);
    });

    // Switch to Fondo tab to remove background
    const fondoTabBtn = screen.getByRole('button', { name: /^Fondo$/i });
    fireEvent.click(fondoTabBtn);

    const removeBgBtn = screen.getByRole('button', { name: /Quitar/i });
    fireEvent.click(removeBgBtn);

    expect(screen.getByText('Fondo personalizado eliminado.')).toBeInTheDocument();
  });

  it('switches sidebar tabs between only 3 options: Campos, Estilo, and Fondo (no Todos tab)', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // Verify "Todos" tab does not exist
    expect(screen.queryByRole('button', { name: /^Todos$/i })).not.toBeInTheDocument();

    // Default tab is Campos
    expect(screen.getByText('Paleta de Campos')).toBeInTheDocument();
    expect(screen.queryByText('Propiedades del Campo')).not.toBeInTheDocument();
    expect(screen.queryByText('Información de Formato y Fondo')).not.toBeInTheDocument();

    // Click Estilo tab
    const estiloTabBtn = screen.getByRole('button', { name: /^Estilo$/i });
    fireEvent.click(estiloTabBtn);
    expect(screen.getByText('Propiedades del Campo')).toBeInTheDocument();
    expect(screen.queryByText('Paleta de Campos')).not.toBeInTheDocument();
    expect(screen.queryByText('Información de Formato y Fondo')).not.toBeInTheDocument();

    // Click Fondo tab
    const fondoTabBtn = screen.getByRole('button', { name: /^Fondo$/i });
    fireEvent.click(fondoTabBtn);
    expect(screen.getByText('Información de Formato y Fondo')).toBeInTheDocument();
    expect(screen.queryByText('Paleta de Campos')).not.toBeInTheDocument();
    expect(screen.queryByText('Propiedades del Campo')).not.toBeInTheDocument();

    // Click Campos tab
    const camposTabBtn = screen.getByRole('button', { name: /^Campos$/i });
    fireEvent.click(camposTabBtn);
    expect(screen.getByText('Paleta de Campos')).toBeInTheDocument();
    expect(screen.queryByText('Información de Formato y Fondo')).not.toBeInTheDocument();
  });

  it('auto-opens properties tab when clicking a field on the canvas', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // Initially on Campos palette tab
    expect(screen.getByText('Paleta de Campos')).toBeInTheDocument();
    expect(screen.queryByText('Propiedades del Campo')).not.toBeInTheDocument();

    // Click field on canvas
    const fieldElement = screen.getByText('[Nombre y Apellido]');
    fireEvent.click(fieldElement);

    // Auto-switched to Estilo (properties) tab
    expect(screen.getByText('Propiedades del Campo')).toBeInTheDocument();
    expect(screen.queryByText('Paleta de Campos')).not.toBeInTheDocument();
  });

  it('handles pointer dragging to update field coordinates', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const fieldElement = screen.getByText('[Nombre y Apellido]');

    // Mock setPointerCapture and releasePointerCapture
    fieldElement.setPointerCapture = vi.fn();
    fieldElement.releasePointerCapture = vi.fn();

    // Pointer down on field
    fireEvent.pointerDown(fieldElement, {
      clientX: 100,
      clientY: 100,
      pointerId: 1
    });

    // Pointer move on canvas container
    const canvas = fieldElement.parentElement;
    if (canvas) {
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 700,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 700,
        x: 0,
        y: 0,
        toJSON: () => {}
      });

      fireEvent.pointerMove(canvas, {
        clientX: 150,
        clientY: 170,
        pointerId: 1
      });

      fireEvent.pointerUp(canvas, {
        pointerId: 1
      });
    }

    expect(fieldElement).toBeInTheDocument();
  });

  it('saves certificate template to Firestore and shows notification', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);
    vi.mocked(api.saveCertificateTemplate).mockResolvedValue();

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Guardar Plantilla/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.saveCertificateTemplate).toHaveBeenCalledWith(
        'sct-wood-badge',
        expect.objectContaining({
          page_width: 1920,
          page_height: 1080,
          aspect_ratio: 1.777,
          orientation: 'landscape',
          fields: expect.any(Array)
        })
      );
      expect(screen.getByText('Plantilla de certificado guardada exitosamente.')).toBeInTheDocument();
    });
  });

  it('shows error toast when saving template fails', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);
    vi.mocked(api.saveCertificateTemplate).mockRejectedValue(new Error('Network error'));

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Guardar Plantilla/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Error al guardar la plantilla en el servidor.')).toBeInTheDocument();
    });
  });

  it('displays normalized physical print dimensions in the format tab and scales font proportionally', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognitionWithTemplate);

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    // Switch to Fondo tab
    const fondoTabBtn = screen.getByRole('button', { name: /^Fondo$/i });
    fireEvent.click(fondoTabBtn);

    // Check that normalized print dimensions (297 x 167.14 mm for 16:9 1920x1080) are displayed
    expect(screen.getByText('Dimensiones de Impresión:')).toBeInTheDocument();
    expect(screen.getByText(/297 × 167\.14 mm/)).toBeInTheDocument();
  });

  it('handles high resolution portrait upload (2657 x 3438) and displays normalized portrait print dimensions', async () => {
    vi.mocked(api.getRecognitionTypeById).mockResolvedValue(mockRecognition);
    vi.mocked(api.processBackgroundImageFile).mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,highresportrait',
      width: 2657,
      height: 3438,
      naturalWidth: 2657,
      naturalHeight: 3438,
      normalizedWidth: 229.53,
      normalizedHeight: 297,
      aspectRatio: 2657 / 3438,
      orientation: 'portrait'
    });

    render(<CertificateDesigner />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Insignia de Madera' })).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText('Subir imagen de fondo');
    const testFile = new File(['fake-highres-bytes'], 'certificate_portrait.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText('Imagen de fondo cargada y optimizada exitosamente.')).toBeInTheDocument();
      expect(screen.getAllByText('Formato: 2657 × 3438 (0.77:1)').length).toBeGreaterThan(0);
    });

    // Switch to Fondo tab
    const fondoTabBtn = screen.getByRole('button', { name: /^Fondo$/i });
    fireEvent.click(fondoTabBtn);

    // Verify normalized print dimensions: 229.53 x 297 mm
    expect(screen.getByText('Dimensiones de Impresión:')).toBeInTheDocument();
    expect(screen.getByText(/229\.53 × 297 mm/)).toBeInTheDocument();
  });
});
