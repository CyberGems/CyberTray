import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import BootLoader from './BootLoader';
import { setLocale } from '../locales';

describe('BootLoader', () => {
  it('se anuncia como estado ocupado para lectores de pantalla', () => {
    setLocale('es');
    const html = renderToString(<BootLoader />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
  });

  it('usa el texto de carga en el idioma activo', () => {
    setLocale('es');
    expect(renderToString(<BootLoader />)).toContain('Iniciando');

    setLocale('en');
    expect(renderToString(<BootLoader />)).toContain('Starting up');
  });

  it('no expone controles interactivos mientras carga', () => {
    setLocale('es');
    const html = renderToString(<BootLoader />);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('tabindex="0"');
  });
});
