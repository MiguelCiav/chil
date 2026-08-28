import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecipientFieldsSection } from '../quick/RecipientFieldsSection';

describe('RecipientFieldsSection component', () => {
  const defaultProps = {
    unit: 'manada' as const,
    onUnitChange: vi.fn(),
    memberType: 'young' as const,
    onMemberTypeChange: vi.fn(),
    identity: 'V-12345678',
    onIdentityChange: vi.fn(),
    isSearchingScraper: false,
    onConsult: vi.fn(),
    firstNames: 'Carlos',
    onFirstNamesChange: vi.fn(),
    lastNames: 'Pérez',
    onLastNamesChange: vi.fn(),
    recognitionCode: 'REC-TEST01',
    onRecognitionCodeChange: vi.fn(),
    onRegenerateCode: vi.fn(),
    scraperStatus: 'idle' as const,
    scraperMsg: '',
    errors: {}
  };

  it('renders all recipient form fields including Tipo de Miembro toggle', () => {
    render(<RecipientFieldsSection {...defaultProps} />);

    expect(screen.getByText('2. Datos del Homenajeado')).toBeInTheDocument();
    expect(screen.getByLabelText('Unidad / Categoría')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tipo de Miembro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Joven' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adulto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cédula de Identidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombres')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellidos')).toBeInTheDocument();
    expect(screen.getByLabelText('Código de Reconocimiento')).toBeInTheDocument();
  });

  it('calls onMemberTypeChange when clicking Joven or Adulto', () => {
    render(<RecipientFieldsSection {...defaultProps} memberType="young" />);

    const adultBtn = screen.getByRole('button', { name: 'Adulto' });
    fireEvent.click(adultBtn);
    expect(defaultProps.onMemberTypeChange).toHaveBeenCalledWith('adult');

    const jovenBtn = screen.getByRole('button', { name: 'Joven' });
    fireEvent.click(jovenBtn);
    expect(defaultProps.onMemberTypeChange).toHaveBeenCalledWith('young');
  });

  it('hides Consultar button when unit is no_scout', () => {
    render(<RecipientFieldsSection {...defaultProps} unit="no_scout" />);

    expect(screen.queryByRole('button', { name: /Consultar/i })).not.toBeInTheDocument();
    expect(screen.getByText('(No requiere verificación Sistema de Registro)')).toBeInTheDocument();
  });
});
