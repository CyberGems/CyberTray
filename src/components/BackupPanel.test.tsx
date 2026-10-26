import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { setLocale } from '../locales';

// `isElectron` se evalúa al importar `appUtils`, así que el mock debe existir
// antes de cargar el componente: por eso se importa de forma dinámica.
beforeAll(() => {
  (window as any).electronAPI = {
    backup: {
      getStatus: vi.fn(),
      runNow: vi.fn(),
      list: vi.fn(),
      openFolder: vi.fn(),
      selectFolder: vi.fn(),
      restore: vi.fn(),
      remove: vi.fn(),
      onCompleted: vi.fn(() => () => undefined),
    },
  };
});

const noop = () => undefined;

async function render(config: Record<string, unknown>, lang: 'en' | 'es' = 'es') {
  setLocale(lang);
  const { default: BackupPanel } = await import('./BackupPanel');
  return renderToString(
    <BackupPanel
      config={{ autoBackupEnabled: true, autoBackupHours: 24, autoBackupKeep: 3, autoBackupPath: '', ...config }}
      handleUpdateConfigSetting={noop}
      playCyberBeep={noop}
      showAlert={noop}
      showConfirm={noop}
    />,
  );
}

describe('BackupPanel', () => {
  it('muestra las secciones principales en español', async () => {
    const html = await render({});
    expect(html).toContain('Respaldos automáticos de la configuración');
    expect(html).toContain('Carpeta de destino');
    expect(html).toContain('Copias disponibles');
    expect(html).toContain('RESPALDAR AHORA');
  });

  it('traduce la interfaz al inglés', async () => {
    const html = await render({}, 'en');
    expect(html).toContain('Automatic configuration backups');
    expect(html).toContain('BACK UP NOW');
  });

  it('ofrece solo las cantidades acordadas: 1, 3, 5 y 7', async () => {
    const html = await render({});
    expect(html).toContain('>1 copia(s)<');
    expect(html).toContain('>3 copia(s)<');
    expect(html).toContain('>5 copia(s)<');
    expect(html).toContain('>7 copia(s)<');
    expect(html).not.toContain('>14 copia(s)<');
    expect(html).not.toContain('>30 copia(s)<');
  });

  it('marca las tres copias y las 24 horas como valores activos', async () => {
    const html = await render({});
    expect(html).toMatch(/<option value="3" selected="">3 copia\(s\)<\/option>/);
    expect(html).toMatch(/<option value="24" selected="">Cada 24 horas<\/option>/);
  });

  it('avisa cuando no hay copias todavía', async () => {
    const html = await render({});
    expect(html).toContain('Aún no hay respaldos.');
  });

  it('etiqueta la carpeta por defecto y ofrece elegir otra', async () => {
    const html = await render({});
    expect(html).toContain('POR DEFECTO');
    expect(html).toContain('ELEGIR CARPETA');
    // Sin carpeta personalizada no se ofrece volver a la de defecto.
    expect(html).not.toContain('USAR LA DE DEFECTO');
  });

  it('muestra la etiqueta de carpeta personalizada y el botón para revertir', async () => {
    const html = await render({ autoBackupPath: 'D:\\Mis respaldos' });
    expect(html).toContain('PERSONALIZADA');
    expect(html).toContain('USAR LA DE DEFECTO');
  });

  it('indica que nunca se respaldó cuando no hay fecha', async () => {
    const html = await render({});
    expect(html).toContain('Todavía sin respaldos');
  });
});
