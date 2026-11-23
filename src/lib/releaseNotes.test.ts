import { describe, expect, it } from 'vitest';
import { peekReleaseNotes } from './releaseNotes';

describe('release notes preview', () => {
  it('keeps the bilingual highlights and drops installation instructions and checksums', () => {
    const notes = [
      '### What’s new in this release',
      'This release improves the shelf.',
      '### Key Features & Highlights',
      '- **Faster tray** with [keyboard shortcuts](https://example.com).',
      '<details>',
      '<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>',
      '### Novedades de esta versión',
      'Esta versión mejora la estantería.',
      '### Novedades destacadas',
      '- **Bandeja más rápida** con atajos.',
      '### ℹ️ Antes de instalar',
      '- Instrucciones de instalación.',
      '</details>',
      '### ℹ️ Before you install',
      '- Installation details.',
      '### SHA256',
      '- Checksum details.'
    ].join('\n');

    expect(peekReleaseNotes(notes, 'en')).toEqual(['Faster tray with keyboard shortcuts.']);
    expect(peekReleaseNotes(notes, 'es')).toEqual(['Bandeja más rápida con atajos.']);
  });

  it('preserves bullets in HTML feed notes and falls back to the main language for older releases', () => {
    const notes = '<h3>Highlights</h3><ul><li>Faster search.</li><li>New icons.</li></ul>';
    expect(peekReleaseNotes(notes, 'es')).toEqual(['Faster search.', 'New icons.']);
  });
});
