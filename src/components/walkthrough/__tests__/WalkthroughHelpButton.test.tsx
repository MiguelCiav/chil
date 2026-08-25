import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WalkthroughHelpButton } from '../WalkthroughHelpButton';

describe('WalkthroughHelpButton component', () => {
  it('renders with default tooltip and aria-label and triggers onClick', () => {
    const handleClick = vi.fn();
    render(<WalkthroughHelpButton onClick={handleClick} />);

    const button = screen.getByRole('button', { name: 'Ver guía interactiva' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Ver guía interactiva');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with custom title and custom className', () => {
    const handleClick = vi.fn();
    render(
      <WalkthroughHelpButton
        onClick={handleClick}
        title="Ayuda del módulo"
        className="custom-help-class"
      />
    );

    const button = screen.getByRole('button', { name: 'Ayuda del módulo' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Ayuda del módulo');
    expect(button).toHaveClass('custom-help-class');
  });
});
