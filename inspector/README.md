# Zen Inspector

Extensión Manifest V3 para Brave/Chromium que inspecciona el DOM de cualquier página web normal tras un gesto explícito del usuario.

## Instalar en Brave

1. Descarga o clona este repositorio.
2. Abre `brave://extensions/`.
3. Activa **Developer mode**.
4. Pulsa **Load unpacked**.
5. Selecciona `inspector/extension`.
6. Abre una web y pulsa el icono de **Zen Inspector** o `Alt+Shift+Z`.

## Privacidad

- permisos: `activeTab` + `scripting`;
- sin `host_permissions` ni `<all_urls>`;
- sin telemetría ni llamadas de red;
- sin persistencia del contenido inspeccionado;
- valores de formularios y valores `data-*` no se capturan;
- query strings y hashes se eliminan de URLs registradas.

Chromium no permite la inyección normal en páginas protegidas como `brave://`, `chrome://` o Chrome Web Store.
