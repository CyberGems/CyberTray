<p align="center">
  <a href="./README.md">English</a> · Español
</p>

<p align="center">
  <a href="https://cybergems.org/apps/cybertray/">
    <img src="https://cybergems.org/banners/es/cybertray.png" alt="CyberTray: lanzador de bandeja de acceso instantáneo y centro de comandos de escritorio" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/CyberGems/CyberTray/releases/latest"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FCyberGems%2FCyberTray%2Fmain%2Fpackage.json&query=%24.version&prefix=%20Descargar%20CyberTray%20v&suffix=%20&style=for-the-badge&label=&labelColor=0891B2&color=0891B2" alt="Descargar la última versión" /><img src="https://img.shields.io/badge/Windows_10%2F11_(64--bit)-2563EB?style=for-the-badge" alt="Windows 10/11 (64 bits)" /></a>
  &nbsp;<a href="https://github.com/CyberGems/CyberTray/releases"><img src="https://img.shields.io/badge/Todas_las_versiones-30363D?style=for-the-badge&logo=github&logoColor=white" alt="Todas las versiones" /><img src="https://img.shields.io/badge/Notas_de_la_versi%C3%B3n-475569?style=for-the-badge" alt="Notas de la versión" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Licencia-GPL--3.0-1F2428.svg?style=flat-square&color=334155" alt="Licencia" />&nbsp;
  <img src="https://img.shields.io/badge/Plataforma-Windows_10%2F11-1F2428.svg?style=flat-square&color=334155" alt="Plataforma" />&nbsp;
  <img src="https://img.shields.io/badge/Electron-42-1F2428.svg?style=flat-square&logo=electron&logoColor=white&color=334155" alt="Electron" />&nbsp;
  <a href="https://github.com/CyberGems/CyberTray/wiki"><img src="https://img.shields.io/badge/Wiki-Documentaci%C3%B3n-1F2428?style=flat-square&logo=gitbook&logoColor=white&color=334155" alt="Wiki" /></a>
</p>

---

## ¿Qué es CyberTray?

CyberTray es un **lanzador de bandeja de sistema y dock** de alto rendimiento para Windows que mantiene las herramientas de uso frecuente a mano sin saturar la barra de tareas. Organiza, busca y lanza aplicaciones, archivos, carpetas y URLs desde un estante que permanece oculto hasta que lo necesitas. Los atajos globales y los hotspots de esquina de pantalla dan acceso instantáneo, mientras que la monitorización de sistema en tiempo real, los controles de procesos, los diseños personalizables y una bóveda de archivos con PIN convierten la bandeja en un compacto centro de comandos de escritorio.

*Gratuito y de código abierto: sin anuncios, sin rastreo y sin recogida de datos. Solo disfrútalo.*

---

## 🎯 ¿Por qué CyberTray?

Tu escritorio está saturado. El menú Inicio es lento. La barra de tareas está llena. CyberTray te da una **plataforma de lanzamiento dedicada** que se mantiene fuera del camino hasta que la necesitas, desplegándose al instante para lanzar lo que sea en milisegundos.

| Necesidad | Solución |
|---|---|
| Acceso rápido a apps y archivos | Estante de atajos con búsqueda, categorías e importación con arrastrar y soltar |
| Ahorra espacio en la barra de tareas | Icono en la bandeja del sistema + estante con ocultación automática |
| Lanza desde cualquier lugar | Atajo global (`Alt+Shift+T`) y esquinas calientes |
| Monitoriza tu sistema | Telemetría en tiempo real de RAM, CPU, disco y VRAM |
| Gestiona procesos en ejecución | Visor de procesos con función de terminado |
| Protege archivos sensibles | Bóveda protegida con PIN con barrido de escritorio |
| Hazlo tuyo | 5 temas neón, fondos personalizados, diseño en cuadrícula o lista |

---

## ✨ Funciones principales

### 🚀 Lanzador de atajos
- **Gestión de atajos**: registra, edita y lanza aplicaciones, archivos y URLs
- **Asistente de primer inicio**: elige idioma, importa accesos y define el atajo global en tres pasos. Solo aparece en instalaciones nuevas y se puede reabrir desde Ajustes.
- **Importación y sincronización de Windows**: revisa Escritorio, Menú Inicio, carpetas personalizadas y apps de Microsoft Store antes de importar. Las sincronizaciones posteriores añaden accesos nuevos y actualizan destinos cambiados sin sobrescribir tus carpetas, nombres, iconos, atajos, favoritos ni estadísticas. Los elementos ausentes nunca se eliminan automáticamente y la última importación se puede deshacer.
- **Iconos reales y resolución de Steam**: los accesos importados muestran el logo real de la aplicación hasta 256 px (incluidas las apps de la Store), y los accesos de Steam resuelven al ejecutable real del juego, así la tarjeta muestra una ruta con sentido y se puede abrir la carpeta del juego.
- **Controles rápidos en la barra**: cambia entre cuadrícula y lista, enciende el vigilante y abre la importación sin salir de la barra.
- **Vigilante de elementos nuevos**: vigila el Escritorio, el Menú Inicio y las apps de Microsoft Store y ofrece añadir lo que aparece. El aviso nunca roba el foco, y lo que quede sin decidir espera en el centro de notificaciones hasta que lo añadas o lo descartes. Desactivado por defecto.
- **Categorías y carpetas**: organiza los atajos con soporte de carpetas anidadas
- **Sistema de favoritos**: marca atajos para acceso rápido
- **Lanzamiento por grupos**: lanza todos los atajos de una categoría a la vez
- **Selección múltiple**: borrado por lotes con el modo de selección (`Ctrl+A`, `Escape`)
- **Búsqueda en tiempo real**: filtrado instantáneo en todos los atajos
- **Opciones de ordenación**: alfabético, más usados, añadidos recientemente
- **Tira de recientes**: los últimos atajos lanzados, a un clic
- **Control total por teclado**: recorre el estante con las flechas y lanza con `Enter`
- **Atajo por atajo**: asigna a cada acceso su propio atajo global
- **Directorio de trabajo**: elige la carpeta en la que se inicia un acceso

### 🔲 Hotspots (esquinas de pantalla)
- **Activación por esquina**: activa CyberTray manteniendo el cursor en cualquier esquina de la pantalla
- **Retraso configurable** antes de la activación
- **Guardia del escritorio seguro UAC**: se oculta automáticamente cuando aparece el diálogo UAC

### 📊 Telemetría Neural (monitorización del sistema)
- **Uso de RAM**: barra de progreso en tiempo real con porcentaje
- **Info de CPU**: modelo y recuento de núcleos
- **Espacio en disco**: monitorización por unidad con valores reales (sin WMI)
- **Detección de VRAM**: obtención en segundo plano de la memoria de la GPU
- **Tiempo de actividad del sistema**: desde el último arranque

### ⚙️ Matriz de procesos
- **Procesos en ejecución**: consulta PID, nombre y uso de memoria
- **Terminar procesos**: finaliza directamente desde la lista
- **Búsqueda y ordenación**: encuentra procesos rápidamente

### 🔐 Ciber-Bóveda (archivos seguros)
- **Protección con PIN**: PIN de 4 dígitos para bloquear y desbloquear la bóveda
- **PIN con hash**: el PIN nunca se guarda en claro, ni siquiera en una copia de seguridad
- **Barrido de escritorio**: mueve todos los archivos y carpetas del escritorio a la bóveda segura
- **Bloqueo automático por inactividad**: configurable (inmediato, 1 min, 5 min, 15 min, sesión)
- **Ruta de bóveda personalizada**: guarda los archivos de la bóveda en cualquier ubicación

### 🖱️ Menú contextual
- **Abrir ubicación del archivo**, **abrir la carpeta contenedora** y **abrir una terminal ahí**
- **Copiar la ruta** al portapapeles
- **Mover a carpeta**, **fijar en la barra de tareas**, **añadir a favoritos** y **ejecutar como administrador**

### 🎨 Personalización de apariencia
- **5 colores de acento**: Cian, Púrpura, Ámbar, Carmesí y Esmeralda
- **Tipos de fondo**: color sólido, preajustes de degradado, 4 preajustes de imagen integrados e imagen personalizada
- **Nivel de desenfoque**: intensidad del desenfoque del fondo ajustable
- **Opacidad**: control de transparencia del fondo
- **Tamaño de icono**: tamaño de los iconos de la cuadrícula ajustable
- **Modos de vista**: disposición en cuadrícula o lista

### 🔊 Sistema de sonido
- **Sonido de lanzamiento**: campanada predeterminada al lanzar un atajo
- **Audio personalizado**: soporte de MP3, WAV, OGG, AAC y M4A
- **Sonidos de navegación de carpetas**: retroalimentación de audio al navegar por categorías

### 💾 Gestión de datos
- **Respaldos automáticos**: copias programadas de tu configuración (cada 6 h, 12 h, 24 h o 7 días), conservando 1, 3, 5 o 7 copias — 3 por defecto. Elige cualquier carpeta de destino, restaura cualquier copia en un clic y cada restauración guarda antes el estado actual para poder deshacerla.
- **Copia de seguridad y restauración**: exporta e importa la configuración como JSON (con iconos integrados)
- **Actualizaciones en la app**: comprueba, descarga e instala desde Acerca de mediante GitHub Releases (`electron-updater`). La comprobación automática al arrancar te avisa; la instalación siempre se confirma.
- **Interfaz bilingüe**: interfaz completa en inglés y español
- **Accesible por diseño**: foco visible, diálogos reales, avisos para lectores de pantalla y control total por teclado
---

## 🚀 Primeros pasos

### Instalación (recomendada)

1. Descarga el instalador más reciente desde [Releases](https://github.com/CyberGems/CyberTray/releases/latest)
2. Ejecuta el instalador `.exe` y sigue el asistente de instalación
3. Inicia CyberTray y pulsa `Alt+Shift+T` para mostrar u ocultar el estante desde cualquier lugar. No necesitas ningún otro requisito: **no** necesitas Node.js ni npm

### 🛡️ Windows SmartScreen

Windows puede mostrar un aviso de SmartScreen la primera vez que ejecutas el instalador de CyberTray: esta es una app de hobby sin firmar, así que Windows aún no ha construido reputación para el archivo. Esto es esperado; el código fuente es público para que puedas inspeccionar exactamente qué hace.

Para continuar:

<details>
<summary><strong>Cómo ejecutar el instalador (paso a paso)</strong></summary>

Windows muestra este aviso para cualquier instalador sin un certificado de firma de código de pago; no significa que el archivo sea inseguro. No hagas clic en "No ejecutar":

1. Ejecuta el instalador `CyberTray-Setup.exe`. Windows puede mostrar el diálogo azul "Windows protegió tu PC".

![Aviso de Windows SmartScreen](https://cybergems.org/branding/smartscreen-warning.svg)

2. Haz clic en el pequeño enlace **Más información**. El diálogo expandido muestra tu instalador: `CyberTray-Setup.exe`.

![Diálogo de SmartScreen tras Más información](https://cybergems.org/branding/smartscreen-runanyway.svg)

3. Haz clic en **Ejecutar de todos modos**. El instalador arranca con normalidad.

Puedes verificar el archivo de forma independiente: compara el SHA con el release de GitHub, escanéalo en VirusTotal o compila desde el código fuente. Más detalles: [guía de SmartScreen en el sitio web](https://cybergems.org/download#smartscreen).

</details>
---

## 🛠️ Stack tecnológico y arquitectura

- **Plataforma:** Windows 10 / 11
- **Framework:** Electron 42 + React 19 + TypeScript
- **Bundler:** Vite 6
- **Estilos:** propiedades CSS personalizadas con efectos de glassmorphism
- **Arquitectura:** ventana única de estante con integración a la bandeja del sistema

```
CyberTray/
├── electron/
│   ├── main.ts           Proceso principal (ventanas, bandeja, IPC, hotspots, iconos)
│   ├── preload.ts        Puente de contexto (API IPC)
│   └── updater.ts        Actualización automática mediante GitHub Releases
├── src/
│   ├── App.tsx           Componente principal de la aplicación
│   ├── main.tsx          Punto de entrada de React
│   ├── locales.ts        i18n (inglés / español)
│   ├── lib/
│   │   ├── appUtils.ts        Utilidades de carpetas y accesos
│   │   ├── configDefaults.ts  Configuración por defecto compartida
│   │   ├── pin.ts             Derivación del PIN de la bóveda (PBKDF2)
│   │   ├── iconSrc.ts         Utilidades de URL de recursos locales
│   │   └── useModalAccessibility.ts  Foco y teclado de los diálogos
│   ├── components/
│   │   ├── ShortcutGrid.tsx      Cuadrícula principal de accesos
│   │   ├── ShortcutFormModal.tsx Diálogo para añadir/editar accesos
│   │   ├── SettingsPanel.tsx     Modal de configuración
│   │   ├── TelemetryBar.tsx      Métricas del sistema en el pie
│   │   ├── ProcessMatrixModal.tsx Visor/terminador de procesos
│   │   ├── VaultPanel.tsx        Ajustes de la bóveda de archivos
│   │   ├── PinPadModal.tsx       Entrada de PIN para la bóveda
│   │   ├── AboutModal.tsx        Información de versión y actualizaciones
│   │   ├── FolderTree.tsx        Navegación de categorías/carpetas
│   │   ├── ToastStack.tsx        Avisos emergentes
│   │   └── CyberTrayLogo.tsx     Logo animado
├── public/               Recursos estáticos e iconos
├── vite.config.ts        Configuración de Vite
└── vitest.config.ts      Configuración de las pruebas
```

### Arquitectura de ventanas

| Ventana | Propósito | Comportamiento |
|---|---|---|
| **Shelf** | Panel principal de accesos | Redimensionable, siempre visible, despliegue instantáneo |

La comunicación entre frontend y backend usa Electron IPC mediante `contextBridge`. La sondeo de hotspots se ejecuta en intervalos de 100 ms. La guardia UAC vigila `consent.exe` para ocultarse automáticamente durante sesiones de escritorio seguro.

### Compilar desde el código fuente (desarrolladores)

Solo necesario si quieres modificar CyberTray o compilarlo tú mismo; los usuarios normales pueden omitir esta sección.

#### Requisitos previos

- [Node.js](https://nodejs.org/) v22+
- npm
- Windows con el compilador C# de .NET Framework incluido en Windows 10/11 (solo para recompilar el activador de apps de Microsoft Store)

#### Desarrollo

```bash
git clone https://github.com/CyberGems/CyberTray.git
cd CyberTray
npm install
npm run dev
```

#### Compilación para producción

```bash
npm run build
npm run build:electron
```

El instalador quedará en el directorio `release/`.

#### Pruebas

```bash
npm run lint   # comprobación de tipos (TypeScript, modo estricto)
npm test       # pruebas unitarias (Vitest)
---

## ⌨️ Atajos de teclado

| Tecla | Acción | Ámbito |
|---|---|---|
| `Alt+Shift+T` (predeterminado) | Alternar el estante de CyberTray | Global |
| `Ctrl+Alt+…` | Atajo por acceso (configurable en el formulario del acceso) | Global |
| `↓` / `Esc` | Llevar el foco del buscador a la cuadrícula | Aplicación |
| `←` `→` `↑` `↓` | Moverse entre accesos | Aplicación |
| `Inicio` / `Fin` | Ir al primer o al último acceso | Aplicación |
| `Enter` | Lanzar el acceso enfocado | Aplicación |
| `Supr` | Eliminar el acceso enfocado (pide confirmación) | Aplicación |
| `A-Z` | Ir al acceso que empieza por lo que escribes | Aplicación |
| `Esc` | Cerrar un diálogo o el menú contextual | Aplicación |
| `Escape` | Salir del modo de selección | Aplicación |
| `Ctrl+A` | Seleccionar todos los accesos | Modo de selección |

---

## ❤️ Donar

Tras incontables horas construyendo y perfeccionando **CyberTray** para mi propio uso, decidí recientemente compartirlo con el mundo junto a mis otras herramientas de código abierto en [CyberGems](https://github.com/CyberGems#-all-apps--repositories).

Si te gustaría apoyar las futuras actualizaciones, te lo agradecería de verdad. Tu donación ayuda a mantener el desarrollo, lanzar nuevas funciones, acelerar la resolución de actualizaciones y errores, y mejorar la calidad de la documentación. También puedes mostrar tu apoyo [poniendo una estrella al repo en GitHub](https://github.com/CyberGems/CyberTray). ¡Gracias! 🙏

<p align="center">
  <a href="https://www.paypal.com/donate/?hosted_button_id=M4PY3UPJA5Y6Q"><img src="https://img.shields.io/badge/Donar-PayPal-0070BA?style=for-the-badge&logo=paypal" alt="Donar con PayPal" /></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/cybergems"><img src="https://img.shields.io/badge/Apóyame_en_Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Apóyame en Ko-fi" /></a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/cybergems"><img src="https://img.shields.io/badge/Invítame_a_un_café-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Invítame a un café" /></a>
</p>

<div align="center">

<details>
<summary><b>Donaciones cripto (BTC, ETH, USDT, LTC): haz clic para ver las direcciones</b></summary>

<div align="left">

| Activo | Red | Dirección | QR |
|---|---|---|---|
| <img src="docs/donate/btc.svg" width="18" height="18" valign="middle" alt="BTC" /> **BTC** | Bitcoin | `bc1q5mxzz05nmvsheqzx7970euswta3fksxzcfzag4` | ![QR de BTC](docs/donate/qr-btc.png) |
| <img src="docs/donate/eth.svg" width="18" height="18" valign="middle" alt="ETH" /> **ETH** | Ethereum (ERC20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![QR de ETH](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | Ethereum (ERC20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![QR de USDT ERC20](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | BNB Smart Chain (BEP20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![QR de USDT BEP20](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | Tron (TRC20) | `TSVbSk1HSyZ1NprCnAYiw56ECwXgH887mD` | ![QR de USDT TRC20](docs/donate/qr-usdt-tron.png) |
| <img src="docs/donate/ltc.svg" width="18" height="18" valign="middle" alt="LTC" /> **LTC** | Litecoin | `LWGnEHgcFCE2BRkzLnsdPDD8Y8ZeDK577X` | ![QR de LTC](docs/donate/qr-ltc.png) |

> ⚠️ Envía solo el activo seleccionado en la red indicada. Usar la red incorrecta provocará la pérdida permanente de fondos.

</div>

</details>

</div>
---

## 📄 Licencia

CyberTray se distribuye bajo los términos de la Licencia Pública General GNU v3.0. Consulta [LICENSE](LICENSE) para el texto completo de la licencia.

Copyright (C) 2026 CyberGems

---

## ❓ Preguntas frecuentes

Para preguntas frecuentes, guías de solución de problemas e instrucciones detalladas de configuración, visita las [Preguntas frecuentes](https://github.com/CyberGems/CyberTray/wiki/FAQ) o la [documentación en línea](https://cybergems.org/docs/cybertray/FAQ).

---

<div align="center" style="background:#0D0F17; border:1px solid rgba(0,255,255,0.12); border-radius:12px; padding:28px 20px; margin-top:32px;">

### ¡Gracias por usar CyberTray! 🎉

Creado por [**CyberGems**](https://cybergems.org)

</div>
<p align="center">
  <a href="https://www.reddit.com/submit?url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcybertray%2F&title=CyberTray%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows"><img src="https://img.shields.io/badge/Compartir_en_Reddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white" alt="Compartir en Reddit" /></a>
  &nbsp;<a href="https://twitter.com/intent/tweet?text=CyberTray%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows&url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcybertray%2F"><img src="https://img.shields.io/badge/Compartir_en_X-1DA1F2?style=for-the-badge&logo=x&logoColor=white" alt="Compartir en X" /></a>
  &nbsp;<a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcybergems.org%2Fapps%2Fcybertray%2F"><img src="https://img.shields.io/badge/Compartir_en_Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Compartir en Facebook" /></a>
  &nbsp;<a href="mailto:?subject=CyberTray%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows&body=CyberTray%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows%20https%3A%2F%2Fcybergems.org%2Fapps%2Fcybertray%2F"><img src="https://img.shields.io/badge/Compartir_por_Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Compartir por correo" /></a>
  &nbsp;<a href="https://t.me/share/url?url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcybertray%2F&text=CyberTray%3A%20herramienta%20de%20escritorio%20gratuita%20y%20de%20c%C3%B3digo%20abierto%20para%20Windows"><img src="https://img.shields.io/badge/Compartir_en_Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Compartir en Telegram" /></a>
  &nbsp;<a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fcybergems.org%2Fapps%2Fcybertray%2F"><img src="https://img.shields.io/badge/Compartir_en_LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="Compartir en LinkedIn" /></a>
</p>

---

## 🔗 Ver también

Más aplicaciones gratuitas, de código abierto y con la privacidad primero de [**CyberGems**](https://github.com/CyberGems):

| App | Descripción |
|:---:|---|
| 🕐&nbsp;[**CyberClock**](https://github.com/CyberGems/CyberClock#readme) | Reloj de escritorio con analógico y digital, calendario, temporizador, cronómetro y módulo de relajación. |
| 📢&nbsp;[**CyberFeeds**](https://github.com/CyberGems/CyberFeeds#readme) | Lector RSS y Atom de alto rendimiento y local-first, creado para la velocidad, la privacidad y la lectura limpia. |
| 🚀&nbsp;[**CyberLauncher**](https://github.com/CyberGems/CyberLauncher#readme) | Lanzador de aplicaciones de Windows con esquinas calientes, programador, monitor de sistema y terminal integrada. |
| 💻&nbsp;[**CyberManager**](https://github.com/CyberGems/CyberManager#readme) | Gestor de tareas ligero y de alto rendimiento, virtualizado y nativo de NT, una potente alternativa al Administrador de Tareas. |
| 📝&nbsp;[**CyberNotes**](https://github.com/CyberGems/CyberNotes#readme) | App de notas centrada en la privacidad con texto enriquecido, carpetas, pestañas y almacenamiento local protegido con bcrypt. |
| ⚡&nbsp;[**CyberPaste**](https://github.com/CyberGems/CyberPaste#readme) | Gestor de portapapeles con la privacidad primero para texto, código, imágenes, HTML y archivos. |
| 📸&nbsp;[**CyberSnap**](https://github.com/CyberGems/CyberSnap#readme) | Suite de captura y anotación de pantalla con herramientas vectoriales, OCR de alta velocidad, grabación de pantalla y selector de color. |
| 💫&nbsp;[**CyberViewer**](https://github.com/CyberGems/CyberViewer#readme) | Visor y editor de imágenes completo diseñado para usuarios casuales y avanzados. |
| 🛡️&nbsp;[**CyberWall**](https://github.com/CyberGems/CyberWall#readme) | Cortafuegos de Windows fácil de usar con reglas por aplicación en tiempo real gracias al motor kernel WFP. |

➡️ **[Todas las aplicaciones en cybergems.org](https://cybergems.org)**

## Iconos de la suite en Acerca de

Acerca de muestra cinco apps de CyberGems por apertura, con iconos locales, descripciones y enlaces a sus páginas. La compilación de cada release actualiza los iconos desde los repositorios oficiales mediante `.github/about-icons.json` y el sincronizador compartido de CyberSnap. Si falta una fuente o el PNG no es válido, la preparación se detiene. La verificación de GitHub Actions comprueba la sincronización sin publicar un release.
