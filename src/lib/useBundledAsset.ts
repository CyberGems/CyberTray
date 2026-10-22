import { useEffect, useState } from 'react';
import { isElectron } from './appUtils';

/**
 * URL de un recurso empaquetado (logo, fondos, sonidos...).
 *
 * En producción la app se sirve por `file://`, donde una ruta absoluta
 * ("/icon.png") apunta a la raíz de la unidad y no al directorio `dist`: el
 * recurso no se encuentra. El protocolo `local-resource://` sí resuelve bien
 * y además entrega el Content-Type correcto.
 */
export function useBundledAssetUrl(relativePath: string): string {
  const [url, setUrl] = useState(relativePath);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.getBundledAssetUrl) return;
    let cancelled = false;
    window.electronAPI.getBundledAssetUrl(relativePath)
      .then((resolved) => {
        if (!cancelled && resolved) setUrl(resolved);
      })
      .catch(() => {
        // Se mantiene la ruta relativa como reserva.
      });
    return () => { cancelled = true; };
  }, [relativePath]);

  return url;
}
