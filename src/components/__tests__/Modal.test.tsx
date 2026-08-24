import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../Modal';

describe('Modal component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('renders modal dialog container with max-h-[90vh], flex flex-col, and proper layout', () => {
    const handleClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalHeader onClose={handleClose}>Título del Modal</ModalHeader>
        <ModalBody>
          <p>Contenido del cuerpo del modal</p>
        </ModalBody>
        <ModalFooter>
          <button type="button">Cancelar</button>
          <button type="button">Guardar</button>
        </ModalFooter>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Título del Modal')).toBeInTheDocument();
    expect(screen.getByText('Contenido del cuerpo del modal')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('flex');
    expect(dialog).toHaveClass('flex-col');
    expect(dialog).toHaveClass('max-h-[90vh]');
  });

  it('sets document.body.style.overflow to hidden when open and resets to unset when unmounted', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Open Modal</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  it('calls onClose when clicking the backdrop overlay or pressing Escape key', () => {
    const handleClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalHeader onClose={handleClose}>Modal</ModalHeader>
        <ModalBody>Body</ModalBody>
      </Modal>
    );

    const overlay = screen.getByRole('presentation');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when clicking close button in ModalHeader', () => {
    const handleClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalHeader onClose={handleClose}>Header Title</ModalHeader>
      </Modal>
    );

    const closeBtn = screen.getByLabelText('Cerrar modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders ModalHeader with flex-shrink-0 class', () => {
    const { container } = render(
      <ModalHeader>Header Title</ModalHeader>
    );

    const header = container.firstElementChild;
    expect(header).toHaveClass('flex-shrink-0');
  });

  it('renders ModalBody with flex-1, overflow-y-auto and pr-1 classes', () => {
    const { container } = render(
      <ModalBody>Scrollable Body</ModalBody>
    );

    const body = container.firstElementChild;
    expect(body).toHaveClass('flex-1');
    expect(body).toHaveClass('overflow-y-auto');
    expect(body).toHaveClass('pr-1');
  });

  it('renders ModalFooter with flex-shrink-0, sticky, bottom-0, bg-white, and border-t classes', () => {
    const { container } = render(
      <ModalFooter>
        <button type="button">Action</button>
      </ModalFooter>
    );

    const footer = container.firstElementChild;
    expect(footer).toHaveClass('flex-shrink-0');
    expect(footer).toHaveClass('sticky');
    expect(footer).toHaveClass('bottom-0');
    expect(footer).toHaveClass('bg-white');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('border-gray-100');
    expect(footer).toHaveClass('z-10');
  });
});
