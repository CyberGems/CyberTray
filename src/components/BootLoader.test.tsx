import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import BootLoader from './BootLoader';
import CyberTrayMark from './CyberTrayMark';
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

  it('dibuja el icono con las cuatro piezas que se animan por separado', () => {
    setLocale('es');
    const html = renderToString(<BootLoader />);
    for (const part of ['tile-top-left', 'tile-top-right', 'tile-bottom-left', 'plus']) {
      expect(html).toContain(`data-part="${part}"`);
    }
  });
});

describe('CyberTrayMark', () => {
  it('es decorativo cuando no recibe etiqueta', () => {
    const html = renderToString(<CyberTrayMark />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
  });

  it('se expone como imagen cuando recibe etiqueta', () => {
    const html = renderToString(<CyberTrayMark label="CyberTray" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="CyberTray"');
    expect(html).toContain('<title>CyberTray</title>');
  });
});

