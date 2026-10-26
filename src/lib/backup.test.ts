import { describe, expect, it } from 'vitest';
import {
  AUTO_BACKUP_FREQUENCIES_HOURS,
  AUTO_BACKUP_KEEP_OPTIONS,
  BACKUP_FILE_PREFIX,
  DEFAULT_AUTO_BACKUP_HOURS,
  DEFAULT_AUTO_BACKUP_KEEP,
  backupFileName,
  isBackupDue,
  isBackupFile,
  normalizeBackupFolder,
  parseBackupHours,
  parseBackupKeep,
  selectBackupsToPrune,
} from './backup';

describe('backup settings', () => {
  it('expone solo las cantidades de copias acordadas', () => {
    expect([...AUTO_BACKUP_KEEP_OPTIONS]).toEqual([1, 3, 5, 7]);
  });

  it('conserva tres copias por defecto', () => {
    expect(DEFAULT_AUTO_BACKUP_KEEP).toBe(3);
  });

  it('usa 24 horas por defecto', () => {
    expect(DEFAULT_AUTO_BACKUP_HOURS).toBe(24);
    expect([...AUTO_BACKUP_FREQUENCIES_HOURS]).toEqual([6, 12, 24, 168]);
  });
});

describe('parseBackupKeep', () => {
  it('acepta los valores permitidos', () => {
    for (const value of AUTO_BACKUP_KEEP_OPTIONS) {
      expect(parseBackupKeep(value)).toBe(value);
      expect(parseBackupKeep(String(value))).toBe(value);
    }
  });

  it('cae al valor por defecto con cualquier otra cosa', () => {
    expect(parseBackupKeep(0)).toBe(3);
    expect(parseBackupKeep(2)).toBe(3);
    expect(parseBackupKeep(14)).toBe(3);
    expect(parseBackupKeep('muchas')).toBe(3);
    expect(parseBackupKeep(undefined)).toBe(3);
    expect(parseBackupKeep(null)).toBe(3);
  });
});

describe('parseBackupHours', () => {
  it('acepta las frecuencias permitidas', () => {
    expect(parseBackupHours(6)).toBe(6);
    expect(parseBackupHours('12')).toBe(12);
    expect(parseBackupHours(168)).toBe(168);
  });

  it('cae a 24 horas con valores inválidos', () => {
    expect(parseBackupHours(1)).toBe(24);
    expect(parseBackupHours(-5)).toBe(24);
    expect(parseBackupHours('diario')).toBe(24);
    expect(parseBackupHours(undefined)).toBe(24);
  });
});

describe('isBackupDue', () => {
  const now = Date.parse('2026-10-26T12:00:00.000Z');

  it('está pendiente cuando nunca se respaldó', () => {
    expect(isBackupDue(null, now, 24)).toBe(true);
    expect(isBackupDue('', now, 24)).toBe(true);
  });

  it('trata una fecha inválida como pendiente', () => {
    expect(isBackupDue('no-es-fecha', now, 24)).toBe(true);
  });

  it('respeta el intervalo configurado', () => {
    const oneHourAgo = new Date(now - 3_600_000).toISOString();
    expect(isBackupDue(oneHourAgo, now, 24)).toBe(false);
    expect(isBackupDue(oneHourAgo, now, 6)).toBe(false);

    const sevenHoursAgo = new Date(now - 7 * 3_600_000).toISOString();
    expect(isBackupDue(sevenHoursAgo, now, 6)).toBe(true);
    expect(isBackupDue(sevenHoursAgo, now, 12)).toBe(false);
  });

  it('normaliza una frecuencia desconocida antes de comparar', () => {
    const twentyFiveHoursAgo = new Date(now - 25 * 3_600_000).toISOString();
    expect(isBackupDue(twentyFiveHoursAgo, now, 999)).toBe(true);
  });
});

describe('backupFileName', () => {
  it('genera un nombre con el prefijo propio, ordenable y con milisegundos', () => {
    const name = backupFileName(new Date(2026, 9, 26, 8, 5, 9, 42));
    expect(name).toBe(`${BACKUP_FILE_PREFIX}2026-10-26T08-05-09-042.json`);
  });

  it('ordena cronológicamente como texto', () => {
    const first = backupFileName(new Date(2026, 0, 1, 0, 0, 0, 0));
    const second = backupFileName(new Date(2026, 0, 1, 0, 0, 0, 1));
    expect([second, first].sort()).toEqual([first, second]);
  });

  it('no colisiona si se respalda dos veces en el mismo segundo', () => {
    const a = backupFileName(new Date(2026, 5, 1, 10, 0, 0, 100));
    const b = backupFileName(new Date(2026, 5, 1, 10, 0, 0, 900));
    expect(a).not.toBe(b);
  });
});

describe('isBackupFile', () => {
  it('acepta solo archivos propios', () => {
    expect(isBackupFile(`${BACKUP_FILE_PREFIX}2026-10-26T08-05-09-042.json`)).toBe(true);
    expect(isBackupFile('config.json')).toBe(false);
    expect(isBackupFile(`${BACKUP_FILE_PREFIX}../evil.json`)).toBe(false);
    expect(isBackupFile('cybertray-backup-2026.json.txt')).toBe(false);
    expect(isBackupFile(undefined)).toBe(false);
  });
});

describe('selectBackupsToPrune', () => {
  const make = (day: number) => `${BACKUP_FILE_PREFIX}2026-10-${String(day).padStart(2, '0')}T00-00-00-000.json`;

  it('no poda nada mientras no se supere el límite', () => {
    expect(selectBackupsToPrune([make(1), make(2)], 3)).toEqual([]);
  });

  it('elimina las más antiguas al llegar al límite', () => {
    const files = [make(4), make(1), make(3), make(2), make(5)];
    expect(selectBackupsToPrune(files, 3)).toEqual([make(1), make(2)]);
  });

  it('con una sola copia conserva solo la más reciente', () => {
    const files = [make(1), make(2), make(3)];
    expect(selectBackupsToPrune(files, 1)).toEqual([make(1), make(2)]);
  });

  it('ignora archivos ajenos a CyberTray', () => {
    const files = [make(1), make(2), 'notas.txt', 'otra-cosa.json'];
    expect(selectBackupsToPrune(files, 1)).toEqual([make(1)]);
  });

  it('normaliza una cantidad no permitida', () => {
    const files = [make(1), make(2), make(3), make(4)];
    // 4 copias no es una opción válida: se aplica el valor por defecto (3).
    expect(selectBackupsToPrune(files, 4)).toEqual([make(1)]);
  });
});

describe('normalizeBackupFolder', () => {
  it('acepta rutas absolutas de Windows y quita el separador final', () => {
    expect(normalizeBackupFolder('C:\\Respaldos')).toBe('C:\\Respaldos');
    expect(normalizeBackupFolder('C:\\Respaldos\\')).toBe('C:\\Respaldos');
    expect(normalizeBackupFolder('D:/Copias/')).toBe('D:/Copias');
    expect(normalizeBackupFolder('  "C:\\Respaldos"  ')).toBe('C:\\Respaldos');
  });

  it('conserva la raíz de una unidad', () => {
    expect(normalizeBackupFolder('C:\\')).toBe('C:\\');
    expect(normalizeBackupFolder('C:/')).toBe('C:\\');
  });

  it('acepta rutas de red', () => {
    expect(normalizeBackupFolder('\\\\servidor\\copias')).toBe('\\\\servidor\\copias');
  });

  it('descarta rutas relativas o vacías', () => {
    expect(normalizeBackupFolder('')).toBe('');
    expect(normalizeBackupFolder('   ')).toBe('');
    expect(normalizeBackupFolder('Respaldos\\sub')).toBe('');
    expect(normalizeBackupFolder(undefined)).toBe('');
    expect(normalizeBackupFolder(42)).toBe('');
  });
});
