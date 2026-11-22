import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardBody } from '../Card';

describe('Card component', () => {
  it('defaults to overflow-hidden and supports overflow="visible"', () => {
    render(
      <>
        <Card data-testid="card-default">Contenido</Card>
        <Card data-testid="card-visible" overflow="visible">Menú</Card>
      </>
    );

    expect(screen.getByTestId('card-default')).toHaveClass('overflow-hidden');
    expect(screen.getByTestId('card-visible')).toHaveClass('overflow-visible');
  });

  it('supports md, sm, and none padding variants on CardBody', () => {
    render(
      <>
        <CardBody data-testid="body-md">Default</CardBody>
        <CardBody data-testid="body-sm" padding="sm">Small</CardBody>
        <CardBody data-testid="body-none" padding="none">None</CardBody>
      </>
    );

    expect(screen.getByTestId('body-md')).toHaveClass('p-6');
    expect(screen.getByTestId('body-sm')).toHaveClass('p-4');
    expect(screen.getByTestId('body-none')).toHaveClass('p-0');
  });
});
