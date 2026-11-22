import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchInput } from '../SearchInput';

describe('SearchInput component', () => {
  it('forwards ref, passes value/onChange, and hides clear button when empty or onClear omitted', () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();

    const { rerender } = render(
      <SearchInput
        ref={ref}
        aria-label="Buscar miembro"
        placeholder="Buscar..."
        value=""
        onChange={onChange}
        onClear={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Buscar miembro');
    expect(ref.current).toBe(input);
    expect(input).toHaveClass('bg-primary/5', 'border-primary/70', 'placeholder:text-neutral/75');
    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Ana' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(
      <SearchInput
        aria-label="Buscar miembro"
        value="Ana"
        onChange={onChange}
      />
    );
    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).not.toBeInTheDocument();
  });

  it('renders clear button when value and onClear are present and triggers onClear', () => {
    const onClear = vi.fn();
    render(
      <SearchInput
        aria-label="Búsqueda global"
        value="Carlos"
        onChange={vi.fn()}
        onClear={onClear}
      />
    );

    const clearBtn = screen.getByRole('button', { name: 'Limpiar búsqueda' });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
