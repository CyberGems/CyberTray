const DETAILS = /<details\b[^>]*>[\s\S]*?<\/details>/gi;
const TECHNICAL_HEADING = /^#{1,6}\s.*(?:before you install|antes de instalar|downloads|descargas|virustotal|sha256|checksums)/i;
const HIGHLIGHTS_HEADING = /^#{1,6}\s.*(?:highlights|features|what.s new|novedades|cambios)/i;
const BULLET = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/;

export function peekReleaseNotes(body: string | undefined, language: 'en' | 'es'): string[] {
  if (!body) return [];
  let section = body.replace(DETAILS, '');
  if (language === 'es') {
    for (const [details] of body.matchAll(DETAILS)) {
      const summary = details.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
      if (summary && /español|spanish/i.test(summary[1])) {
        section = details.slice(summary.index! + summary[0].length, details.lastIndexOf('</'));
        break;
      }
    }
  }

  const lines = section
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<h[1-6]\b[^>]*>/gi, '\n### ')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>|<\/(?:p|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .split(/\r?\n/)
    .map(line => line.trim());
  const technical = lines.findIndex(line => TECHNICAL_HEADING.test(line));
  const notes = technical < 0 ? lines : lines.slice(0, technical);
  const bullets = (items: string[]) => items
    .filter(line => BULLET.test(line))
    .map(line => cleanText(line.replace(BULLET, '')))
    .filter(Boolean);

  const highlights = notes.findIndex(line => HIGHLIGHTS_HEADING.test(line));
  if (highlights >= 0) {
    const afterHeading = notes.slice(highlights + 1);
    const nextHeading = afterHeading.findIndex(line => /^#{1,6}\s/.test(line));
    const items = bullets(nextHeading < 0 ? afterHeading : afterHeading.slice(0, nextHeading));
    if (items.length) return items;
  }
  const items = bullets(notes);
  if (items.length) return items;

  const summary = notes.find(line =>
    line.length > 14 &&
    !/^(?:[#>|-]|https?:|\[|full changelog)/i.test(line)
  );
  return summary ? [cleanText(summary)] : [];
}

function cleanText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g, '$1$2$3')
    .replace(/\s+/g, ' ')
    .trim();
}
