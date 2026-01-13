import { cn } from '@/lib/utils';

describe('Utils Library (cn)', () => {
  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2', 'py-2')).toBe('px-2 py-2');
    expect(cn('px-2 py-2', 'p-4')).toBe('p-4'); // Tailwind merge logic: p-4 overrides px/py
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('should handle undefined and null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('should handle objects for conditional classes', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active');
  });
});
