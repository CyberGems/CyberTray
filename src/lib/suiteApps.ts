// Published sister apps shown in About. Icons are bundled for offline use.
export const suiteApps = [
  { slug: 'cyberclock', name: 'CyberClock', pitchKey: 'about_suite_cyberclock', site: 'https://cybergems.org/apps/cyberclock/' },
  { slug: 'cyberfeeds', name: 'CyberFeeds', pitchKey: 'about_suite_cyberfeeds', site: 'https://cybergems.org/apps/cyberfeeds/' },
  { slug: 'cyberlauncher', name: 'CyberLauncher', pitchKey: 'about_suite_cyberlauncher', site: 'https://cybergems.org/apps/cyberlauncher/' },
  { slug: 'cybermanager', name: 'CyberManager', pitchKey: 'about_suite_cybermanager', site: 'https://cybergems.org/apps/cybermanager/' },
  { slug: 'cybernotes', name: 'CyberNotes', pitchKey: 'about_suite_cybernotes', site: 'https://cybergems.org/apps/cybernotes/' },
  { slug: 'cyberpaste', name: 'CyberPaste', pitchKey: 'about_suite_cyberpaste', site: 'https://cybergems.org/apps/cyberpaste/' },
  { slug: 'cybersnap', name: 'CyberSnap', pitchKey: 'about_suite_cybersnap', site: 'https://cybergems.org/apps/cybersnap/' },
  { slug: 'cyberviewer', name: 'CyberViewer', pitchKey: 'about_suite_cyberviewer', site: 'https://cybergems.org/apps/cyberviewer/' },
  { slug: 'cyberwall', name: 'CyberWall', pitchKey: 'about_suite_cyberwall', site: 'https://cybergems.org/apps/cyberwall/' },
] as const;

export function pickSuiteApps(count = 5) {
  const pool = [...suiteApps];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
