# Privacidad — CyberTray

CyberTray funciona en tu PC y guarda tus datos en tu PC. **No tiene cuenta, telemetría, SDK de analítica ni anuncios.** Nunca envía tu accesos directos, notificaciones o archivos de la bóveda a su autor ni a nadie más.

Todo lo que sabe (accesos directos, notificaciones o archivos de la bóveda) se queda en `%APPDATA%\CyberTray\` (configuración, copias, iconos en caché, notificaciones y `CyberTray_files\`). Las versiones portables usan una carpeta `data` junto al ejecutable. El instalador no elimina los datos de la app; la carpeta se conserva.

## Cuándo CyberTray se conecta a internet

Estas son todas las conexiones que CyberTray hace por su cuenta. Ninguna envía tu accesos directos, notificaciones o archivos de la bóveda. Como en cualquier petición de internet, el servidor ve tu dirección IP.

| Cuándo | Dónde | Para qué | Cómo desactivarlo |
|---|---|---|---|
| 8 segundos después de iniciar | GitHub Releases, con notas desde `api.github.com` | Consultar una versión nueva | `autoUpdate`; las versiones portables desactivan el actualizador |

Un enlace que pulsas dentro de la app o una página web que abres en tu navegador es una acción tuya, no una conexión que la app haga por su cuenta.

## Qué lee CyberTray de tu PC

CyberTray lee los accesos de Escritorio y Menú de inicio, tu biblioteca de Steam, la memoria de la GPU y la información de discos. Esa información se queda en pantalla. Todo lo que cambia el sistema pide confirmación antes y, cuando es posible, guarda una copia para poder deshacerlo.

## Dudas

Abre un issue: https://github.com/CyberGems/CyberTray/issues

Para una pregunta concreta sobre privacidad, usa la [página de contacto](https://cybergems.org/contact). La declaración general de la suite está en [cybergems.org/es/privacy](https://cybergems.org/es/privacy).
