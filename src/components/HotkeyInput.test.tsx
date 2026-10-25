import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import HotkeyInput from './HotkeyInput';
import { setLocale } from '../locales';

const noop = () => undefined;

describe('HotkeyInput', () => {
  it('ofrece grabar, restablecer y limpiar el atajo', () => {
    setLocale('es');
    const html = renderToString(<HotkeyInput value="Ctrl+Shift+K" onChange={noop} />);
    expect(html).toContain('GRABAR NUEVO');
    expect(html).toContain('RESTABLECER');
    expect(html).toContain('LIMPIAR');
    expect(html).toContain('Ctrl+Shift+K');
  });

  it('avisa cuando el atajo está desactivado', () => {
    setLocale('es');
    const html = renderToString(<HotkeyInput value="" onChange={noop} />);
    expect(html).toContain('Sin atajo');
    expect(html).toContain('Atajo global desactivado');
  });

  it('traduce las acciones al inglés', () => {
    setLocale('en');
    const html = renderToString(<HotkeyInput value="Alt+Shift+T" onChange={noop} />);
    expect(html).toContain('RESET');
    expect(html).toContain('CLEAR');
    expect(html).toContain('RECORD NEW');
  });
});
