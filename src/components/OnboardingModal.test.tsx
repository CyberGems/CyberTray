import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import OnboardingModal from './OnboardingModal';
import { setLocale } from '../locales';

const noop = () => undefined;

const render = (open: boolean, lang: 'en' | 'es' = 'es') => {
  setLocale(lang);
  return renderToString(
    <OnboardingModal
      open={open}
      langCode={lang}
      shortcut="Alt+Shift+T"
      onSelectLanguage={noop}
      onShortcutChange={noop}
      onFinish={noop}
      playCyberBeep={noop}
    />
  );
};

describe('OnboardingModal', () => {
  it('no renderiza nada cuando está cerrado', () => {
    expect(render(false)).toBe('');
  });

  it('arranca en el paso de bienvenida e idioma', () => {
    const html = render(true);
    expect(html).toContain('Bienvenido a CyberTray');
    expect(html).toContain('IDIOMA');
    expect(html).toContain('Español');
    expect(html).toContain('English');
  });

  it('usa los textos en inglés cuando el idioma activo es inglés', () => {
    const html = render(true, 'en');
    expect(html).toContain('Welcome to CyberTray');
    expect(html).toContain('LANGUAGE');
  });

  it('marca el idioma activo y no muestra los pasos siguientes', () => {
    const html = render(true);
    expect(html).toContain('CONTINUAR');
    expect(html).not.toContain('Trae tus accesos');
    expect(html).not.toContain('Tu atajo global');
  });
});
