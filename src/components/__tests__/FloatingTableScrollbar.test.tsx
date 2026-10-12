import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FloatingTableScrollbar, FloatingScrollbarControls } from '../FloatingTableScrollbar';

describe('FloatingTableScrollbar Component', () => {
  it('does not render when table does not overflow (canScroll is false)', () => {
    const mockElement = {
      scrollLeft: 0,
      scrollWidth: 500,
      clientWidth: 500,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    render(<FloatingScrollbarControls targetElement={mockElement} />);
    expect(screen.queryByTestId('floating-table-scrollbar')).not.toBeInTheDocument();
  });

  it('renders floating control pill when table overflows horizontally', () => {
    const mockElement = {
      scrollLeft: 0,
      scrollWidth: 1500,
      clientWidth: 500,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    render(<FloatingScrollbarControls targetElement={mockElement} />);
    expect(screen.getByTestId('floating-table-scrollbar')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByLabelText('Desplazar tabla a la izquierda')).toBeDisabled();
    expect(screen.getByLabelText('Desplazar tabla a la derecha')).not.toBeDisabled();
  });

  it('triggers step scroll when clicking right and left chevron buttons', () => {
    const scrollByMock = vi.fn();
    const mockElement = {
      scrollLeft: 100,
      scrollWidth: 1500,
      clientWidth: 500,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      scrollBy: scrollByMock,
    } as unknown as HTMLElement;

    render(<FloatingScrollbarControls targetElement={mockElement} />);
    
    const rightButton = screen.getByLabelText('Desplazar tabla a la derecha');
    fireEvent.click(rightButton);
    expect(scrollByMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    const leftButton = screen.getByLabelText('Desplazar tabla a la izquierda');
    fireEvent.click(leftButton);
    expect(scrollByMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('triggers scrollTo when clicking on track', () => {
    const scrollToMock = vi.fn();
    const mockElement = {
      scrollLeft: 0,
      scrollWidth: 1500,
      clientWidth: 500,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      scrollTo: scrollToMock,
    } as unknown as HTMLElement;

    render(<FloatingScrollbarControls targetElement={mockElement} />);

    const track = screen.getByRole('scrollbar');
    // Mock getBoundingClientRect for track
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200,
      top: 0,
      bottom: 10,
      right: 300,
      height: 10,
      x: 100,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.click(track, { clientX: 200 });
    expect(scrollToMock).toHaveBeenCalled();
  });

  it('handles mouse dragging on thumb to update scroll position', () => {
    const mockElement = {
      scrollLeft: 0,
      scrollWidth: 2000,
      clientWidth: 500,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    render(<FloatingScrollbarControls targetElement={mockElement} />);

    const track = screen.getByRole('scrollbar');
    vi.spyOn(track, 'clientWidth', 'get').mockReturnValue(200);

    const thumb = track.firstChild as HTMLElement;
    fireEvent.mouseDown(thumb, { clientX: 100 });

    fireEvent.mouseMove(window, { clientX: 150 });
    expect(mockElement.scrollLeft).toBeGreaterThan(0);

    fireEvent.mouseUp(window);
  });

  it('works as a wrapper component around table content', () => {
    const WrapperTest = () => {
      return (
        <FloatingTableScrollbar>
          <table style={{ width: '2000px' }}>
            <tbody>
              <tr>
                <td>Contenido amplio</td>
              </tr>
            </tbody>
          </table>
        </FloatingTableScrollbar>
      );
    };

    const { container } = render(<WrapperTest />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('works with targetRef in standalone mode', () => {
    const StandaloneTest = () => {
      const containerRef = useRef<HTMLDivElement>(null);
      return (
        <div>
          <div ref={containerRef} style={{ overflowX: 'auto', width: '500px' }}>
            <div style={{ width: '2000px' }}>Contenido ancho</div>
          </div>
          <FloatingTableScrollbar targetRef={containerRef} />
        </div>
      );
    };

    const { container } = render(<StandaloneTest />);
    expect(container.textContent).toContain('Contenido ancho');
  });

  it('floats with fixed positioning when table bottom is offscreen', () => {
    const mockElement = {
      scrollLeft: 0,
      scrollWidth: 1500,
      clientWidth: 500,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        top: 100,
        bottom: 1200, // Below viewport
        left: 50,
        width: 600,
        height: 1100,
        right: 650,
      }),
    } as unknown as HTMLElement;

    // Simulate window.innerHeight = 800
    vi.stubGlobal('innerHeight', 800);

    render(<FloatingScrollbarControls targetElement={mockElement} />);
    const scrollbar = screen.getByTestId('floating-table-scrollbar');
    expect(scrollbar).toHaveStyle({ position: 'fixed', left: '50px', width: '600px', bottom: '1rem' });

    vi.unstubAllGlobals();
  });

  it('hides completely when table has scrolled out of viewport', () => {
    const mockElement = {
      scrollLeft: 0,
      scrollWidth: 1500,
      clientWidth: 500,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        top: -1000,
        bottom: -50, // Table is completely scrolled above viewport
        left: 50,
        width: 600,
        height: 950,
        right: 650,
      }),
    } as unknown as HTMLElement;

    render(<FloatingScrollbarControls targetElement={mockElement} />);
    expect(screen.queryByTestId('floating-table-scrollbar')).not.toBeInTheDocument();
  });
});
