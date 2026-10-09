import { describe, expect, it } from 'vitest';
import { pinDebil } from '@/shared/lib/pin';

describe('pinDebil', () => {
  it.each(['000000', '777777', '123456', '234567', '654321', '121212', '123123', '120120'])(
    '%s es débil',
    (p) => expect(pinDebil(p)).toBe(true),
  );
  it.each(['890123', '482915', '135792', '101010'.replace('101010', '104729')])(
    '%s no es débil',
    (p) => expect(pinDebil(p)).toBe(false),
  );
  it('el nuevo no puede ser igual al actual', () => {
    expect(pinDebil('482915', '482915')).toBe(true);
    expect(pinDebil('482915', '111112')).toBe(false);
  });
});
