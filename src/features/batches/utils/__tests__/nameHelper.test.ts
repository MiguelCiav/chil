import { describe, it, expect } from 'vitest';
import { splitFullName } from '../nameHelper';

describe('splitFullName helper function', () => {
  it('handles 4 or more parts', () => {
    expect(splitFullName('Juan Carlos Perez Rodriguez')).toEqual({
      first_names: 'Juan Carlos',
      last_names: 'Perez Rodriguez'
    });
  });

  it('handles 3 parts', () => {
    expect(splitFullName('Maria Elena Gonzalez')).toEqual({
      first_names: 'Maria',
      last_names: 'Elena Gonzalez'
    });
  });

  it('handles 2 parts', () => {
    expect(splitFullName('Carlos Mendoza')).toEqual({
      first_names: 'Carlos',
      last_names: 'Mendoza'
    });
  });

  it('handles single name', () => {
    expect(splitFullName('Madonna')).toEqual({
      first_names: 'Madonna',
      last_names: ''
    });
  });
});
