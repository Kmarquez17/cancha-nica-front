import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ESTADOS_FUTBOL, EstadoPildora } from '@/shared/ui/estado-pildora';
import { TemaCliente } from '@/shared/ui/tema-cliente';

describe('EstadoPildora', () => {
  it('muestra texto además del color, para los 7 estados', () => {
    render(
      <ul>
        {ESTADOS_FUTBOL.map((e) => (
          <li key={e}>
            <EstadoPildora estado={e} />
          </li>
        ))}
      </ul>,
    );
    for (const t of ['Gol', 'Amarilla', 'Roja', 'En vivo', 'Finalizado', 'Pendiente', 'W.O.']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it('el icono es decorativo y «En vivo» respeta reducir movimiento', () => {
    const { container } = render(<EstadoPildora estado="en-vivo" />);
    const icono = container.querySelector('svg')!;
    expect(icono).toHaveAttribute('aria-hidden', 'true');
    expect(icono.getAttribute('class')).toContain('motion-safe:animate-pulse');
  });

  it('permite cambiar el texto', () => {
    render(<EstadoPildora estado="gol" texto="Gol de Pérez" />);
    expect(screen.getByText('Gol de Pérez')).toBeInTheDocument();
  });
});

describe('TemaCliente', () => {
  it('inyecta las variables del color del cliente', () => {
    const { container } = render(<TemaCliente color="#16A34A" />);
    expect(container.querySelector('style')?.textContent).toContain('--primary:#16A34A');
  });

  it('no renderiza nada con un color inválido (queda la marca)', () => {
    const { container } = render(<TemaCliente color="no-es-color" />);
    expect(container.querySelector('style')).toBeNull();
  });
});
