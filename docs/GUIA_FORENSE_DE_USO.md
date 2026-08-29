# Guía forense de uso — Zen DevTool

> Manual operativo para Product Design, UX/UI, QA, desarrollo y revisión técnica.
>
> Objetivo: que una persona pueda abrir Zen DevTool, entender exactamente qué está viendo, ejecutar un análisis reproducible y distinguir con claridad **hechos observados**, **inferencias** y **comportamientos no verificables**.

---

# 1. Qué es Zen DevTool

Zen DevTool es una herramienta de observación de producto que se ejecuta dentro de la pestaña activa del navegador.

No intenta adivinar todo lo que hace una aplicación. Su contrato es más estricto:

```text
Página web
│
├── estructura visible
├── controles interactivos
├── ARIA / semántica
├── estados observables
├── interacciones ejecutadas
├── navegación observada
└── red observada de forma sanitizada
        ↓
    Zen DevTool
        ↓
├── Screen Flow
├── Product Functional Flow (PFF)
└── Snapshot JSON
```

## Regla de evidencia

Zen DevTool utiliza tres niveles:

| Marca | Significado | Interpretación |
| --- | --- | --- |
| `✓` | Observado | Ocurrió realmente durante la sesión o está directamente presente en la superficie analizada |
| `≈` | Inferido | La herramienta deduce intención a partir de DOM, ARIA, enlaces, roles o semántica |
| `⊘` | No verificable | La página actual no ofrece evidencia suficiente para afirmar el comportamiento |

Nunca debe leerse una inferencia como si fuese una ejecución confirmada.

---

# 2. Qué NO es

Zen DevTool no es:

- un crawler completo del producto;
- un sustituto de QA;
- un proxy de red;
- un capturador de cookies;
- un lector de tokens;
- una herramienta de pentesting;
- un sistema de autenticación;
- una base de datos de sesiones;
- una garantía de que funciones nunca ejecutadas existan realmente;
- un sustituto de los requisitos de producto.

La precisión depende de **qué superficie se analizó y qué recorridos se ejecutaron**.

---

# 3. Privacidad y frontera de seguridad

La extensión de producción usa únicamente:

```text
activeTab
scripting
```

No utiliza de forma deliberada:

```text
<all_urls>
host_permissions
cookies
telemetría
servidor propio
storage persistente de la sesión
```

## Datos que NO deben entrar al snapshot

- valor escrito en inputs;
- contraseñas;
- tokens;
- cookies;
- headers HTTP;
- request bodies;
- response bodies;
- query strings sensibles;
- hashes de URL sensibles.

Zen DevTool observa **estructura y comportamiento**, no contenido privado de formularios.

---

# 4. Apertura de la herramienta

1. Navega a la página que deseas analizar.
2. Activa Zen DevTool mediante el icono/launcher de la extensión.
3. La herramienta se inyecta exclusivamente en la pestaña activa autorizada por el usuario.
4. Aparece la ventana **Zen DevTool · Product Flow Mapper**.

La ventana no es parte del sitio analizado. Vive en una frontera de UI marcada como DevTool y sus interacciones deben ser ignoradas por Inspector y Recorder como actividad del producto.

---

# 5. La ventana Zen DevTool

## 5.1 Ventana flotante

Zen DevTool no está anclado permanentemente a una esquina.

La barra superior muestra:

```text
ZEN DEVTOOL · v0.3
Product Flow Mapper
Mover · arrastra / Alt+flechas
[Cerrar]
```

### Mover con puntero

1. Coloca el cursor sobre la zona superior que indica `Mover`.
2. Mantén presionado el botón principal.
3. Arrastra la ventana.
4. Suelta cuando esté en la posición deseada.

La ventana se limita automáticamente al viewport para reducir el riesgo de perderla fuera de pantalla.

### Mover con teclado

1. Enfoca la barra de movimiento con Tab o haciendo click sobre ella.
2. Usa:

```text
Alt + ←
Alt + →
Alt + ↑
Alt + ↓
```

Para desplazamientos mayores:

```text
Shift + Alt + flecha
```

### Qué NO hace el movimiento

Mover la ventana:

- no registra una acción del producto;
- no activa Inspector;
- no inicia Recorder;
- no modifica la página;
- no persiste la posición en almacenamiento;
- no cambia el PFF.

---

# 6. Barra de estadísticas

Ejemplo:

```text
37 controles · 4 superficies · 12 eventos observados
```

## Controles

Cantidad de controles que Scanner reconoce en la superficie actual.

Puede incluir, según el DOM:

- botones;
- enlaces;
- inputs;
- textarea;
- select;
- toggles;
- submits;
- otros elementos con semántica interactiva reconocible.

No significa “37 funciones de backend”. Significa “37 controles detectados en la superficie observada”.

## Superficies

Representa unidades estructurales detectadas por Scanner para describir la pantalla actual.

No debe interpretarse automáticamente como número de rutas del producto.

## Eventos observados

Cantidad de eventos normalizados acumulados por Recorder en la sesión actual.

La cifra puede crecer al ejecutar interacciones, cambios de estado, navegación o red observable.

---

# 7. Área de salida

La zona central es un textarea readonly.

Aquí aparecen:

- PFF;
- Screen Flow;
- snapshot JSON.

Cambiar el tipo de salida no borra la grabación. Sólo cambia **cómo se representa la misma evidencia disponible**.

---

# 8. Función `[Analizar]`

## Objetivo

Tomar una fotografía semántica de la superficie actual.

## Qué ejecuta

```text
[Analizar]
   ↓
Scanner.scan()
   ↓
DOM visible / semántica
   ↓
ControlDescriptor[]
SurfaceDescriptor[]
   ↓
Snapshot
   ↓
PFF renderizado
```

## Qué detecta

Entre otras señales:

- etiquetas;
- texto accesible;
- `aria-label`;
- `aria-labelledby`;
- roles;
- required;
- disabled;
- checked;
- `aria-expanded`;
- `aria-selected`;
- `aria-pressed`;
- `aria-current`;
- `aria-invalid`;
- estado `<details open>`;
- destinos de enlaces saneados;
- `aria-controls`.

## Cuándo usarlo

Usa `[Analizar]` cuando:

- acabas de abrir una pantalla;
- cambió de forma importante el DOM;
- quieres documentar un estado concreto;
- abriste un modal/drawer;
- cambiaste de vista;
- quieres actualizar el inventario antes de generar PFF.

## Qué NO demuestra

Analizar un botón no demuestra que su función funcione.

Ejemplo:

```text
≈ [Guardar]
```

puede significar “hay un control con semántica de guardar”.

Para convertir comportamiento en evidencia observada debes ejecutar el flujo mediante Recorder.

---

# 9. Función `[Grabar]` / `[Detener]`

## Objetivo

Capturar un recorrido real del usuario.

## Inicio

Al pulsar `[Grabar]`:

```text
Recorder OFF
   ↓
[Grabar]
   ↓
Recorder ON
   ↓
botón cambia a [Detener]
```

El estado visual del botón es parte de DevTool y no debe contarse como evento del producto.

## Durante una grabación

Ejecuta exactamente el recorrido que deseas documentar.

Ejemplo:

```text
[Grabar]
│
├── click [Editar]
├── cambiar (Pilar)
├── abrir [Más detalles]
├── click [Guardar]
└── [Detener]
```

## Señales que puede observar

Recorder puede combinar:

- clicks;
- submits;
- cambios de controles;
- cambios de estado observables;
- navegación SPA/history;
- hash changes;
- fetch;
- XHR;
- mutaciones relevantes normalizadas.

## Page Probe

La instrumentación MAIN-world de navegación/red se instala una sola vez, pero permanece silenciosa si Recorder está OFF.

Recorder activa la emisión local durante la grabación.

## Red observada

Zen DevTool puede registrar metadatos funcionales como:

```text
transport: fetch
method: POST
url: https://ejemplo.test/api/documento
status: 200
ok: true
durationMs: 84
```

No registra body, token ni headers.

## Detener

`[Detener]` congela la captura de nuevos eventos, pero conserva los eventos ya registrados en memoria.

## Inspector y Recorder

Son modos mutuamente excluyentes.

Si activas Inspector mientras Recorder está activo:

```text
Recorder ON
   ↓
[Inspector]
   ↓
Recorder STOP
   ↓
Inspector ON
```

Esto evita contaminar el PFF con clicks cuyo único objetivo era seleccionar elementos para diagnóstico.

---

# 10. Función `[Screen Flow]`

## Objetivo

Representar la estructura navegacional/superficial detectada.

Responde principalmente:

> ¿Qué superficies y caminos de navegación puede describir la evidencia disponible?

No sustituye el PFF.

## Diferencia con PFF

```text
Screen Flow
└── dónde puede ir el usuario

PFF
└── qué hace una función y qué ocurre alrededor de ella
```

## Úsalo para

- inventario de pantallas;
- IA inicial;
- navegación;
- descubrir enlaces y destinos;
- comparar rutas visibles;
- preparar un mapa de producto.

---

# 11. Función `[PFF]`

## Nombre

**Product Functional Flow — Diagrama Funcional de Producto.**

## Objetivo

Explicar una función de producto de extremo a extremo usando evidencia observable.

Un PFF puede contener:

```text
Trigger
Condición
Acción
Estado
Navegación
Red
Resultado
Error
Nivel de evidencia
```

Ejemplo conceptual:

```text
FUNCIÓN · Guardar metadata
│
├── Trigger
│   └── ✓ [Guardar]
│
├── ✓ <Persistencia observada>
│
├── ✓ {Estado posterior}
│
└── Resultado
    └── ✓ Guardado confirmado
```

Si algo no se ejecutó:

```text
⊘ Resultado no verificado
```

## Regla de lectura

El PFF debe utilizarse como documento de comportamiento, no como prueba absoluta de lógica interna del servidor.

Zen DevTool sólo puede afirmar lo que cruza su frontera observable.

---

# 12. Función `[JSON]`

## Objetivo

Mostrar el snapshot estructurado que sustenta las representaciones humanas.

Es útil para:

- debugging;
- automatización futura;
- auditoría;
- comparar capturas;
- validar redacción de datos;
- integración con herramientas internas.

## Contenido esperado

Según la evidencia disponible puede contener:

- superficies;
- controles;
- roles;
- labels;
- tipo de acción;
- required;
- estados;
- targets saneados;
- eventos normalizados.

## Prueba de privacidad recomendada

Antes de compartir un JSON de una página sensible:

1. escribe un valor identificable en un input;
2. pulsa `[JSON]`;
3. busca ese valor;
4. no debe aparecer.

Si aparece, tratarlo como bug P0 de privacidad.

---

# 13. Función `[Inspector · OFF/ON]`

## Objetivo

Seleccionar visualmente elementos de la página para diagnóstico.

## Activar

```text
[Inspector · OFF]
       ↓
Inspector ON
       ↓
◉ INSPECTOR ACTIVO · Esc para salir
```

## Mientras está activo

Mover el puntero sobre un elemento muestra un highlight y HUD con información resumida.

Un click sobre la página se intercepta para seleccionar el elemento, evitando que la acción normal del sitio se ejecute accidentalmente.

Ese bloqueo es **intencional mientras Inspector está ON**.

## Selección

Al seleccionar un elemento aparece un panel con:

- nombre/label;
- selector;
- `[Copiar selector]`;
- `[Salir de Inspector]`.

## Salidas garantizadas

Puedes salir mediante:

- botón global `Inspector · ON` en Zen DevTool;
- `[Desactivar]` en la banda de Inspector;
- `[Salir de Inspector]` en el panel de selección;
- tecla `Escape`.

## Invariante crítico

Inspector **nunca debe interceptar controles de Zen DevTool**.

Si Inspector ON impide pulsar su propio botón de apagado, eso es una regresión crítica.

## `Escape`

`Escape` tiene prioridad como mecanismo de recuperación.

```text
Inspector ON
    ↓
Escape
    ↓
Inspector OFF
```

---

# 14. Función `[Limpiar]`

## Objetivo

Eliminar los eventos acumulados por Recorder para iniciar una sesión funcional nueva.

```text
Eventos = 18
   ↓
[Limpiar]
   ↓
Eventos = 0
```

Después se vuelve a renderizar el PFF con la evidencia actual de Scanner pero sin el historial de interacciones borrado.

## Cuándo usarlo

- antes de grabar otro happy path;
- antes de un error path;
- cuando mezclaste dos tareas diferentes;
- cuando quieres una sesión reproducible mínima.

## Recomendación forense

No grabes diez funcionalidades distintas en una misma sesión.

Mejor:

```text
Sesión 01 · Login
Sesión 02 · Crear documento
Sesión 03 · Error de validación
Sesión 04 · Publicar
```

---

# 15. Función `[Copiar]`

Copia el contenido visible del área de salida.

## Camino principal

Usa Clipboard API.

## Fallback

Si el navegador bloquea clipboard:

- Zen DevTool enfoca el textarea;
- selecciona el contenido;
- muestra el estado `Seleccionado · Ctrl/Cmd+C`.

Después copia manualmente.

---

# 16. Función `[Cerrar]`

Oculta la ventana de Zen DevTool.

No equivale a destruir toda la sesión.

El launcher puede volver a mostrarla mediante el mecanismo de toggle de la extensión.

Cerrar la ventana no debe activar una acción del sitio.

---

# 17. Estados visuales importantes

## Recorder

```text
[Grabar]   = OFF
[Detener]  = ON
```

## Inspector

```text
[Inspector · OFF]
[Inspector · ON]
```

## Status temporal

Ejemplos:

```text
Copiado
Seleccionado · Ctrl/Cmd+C
Ejecuta el flujo real
Grabación detenida
Grabación detenida al activar Inspector
```

Son feedback de DevTool, no estados del producto analizado.

---

# 18. Procedimiento recomendado — Happy Path

Ejemplo: documentar “Editar y guardar”.

```text
1. Abrir pantalla inicial
2. [Limpiar]
3. [Analizar]
4. [Grabar]
5. ejecutar [Editar]
6. cambiar los campos necesarios
7. ejecutar [Guardar]
8. esperar feedback real
9. [Detener]
10. [PFF]
11. revisar ✓ / ≈ / ⊘
12. [JSON] si se necesita auditoría
13. [Copiar]
```

## Preguntas que debes responder al revisar

- ¿Aparece el trigger correcto?
- ¿Se observó navegación?
- ¿Se observó red?
- ¿Existe feedback posterior?
- ¿Algún resultado está marcado como inferido en vez de observado?
- ¿Falta ejecutar un paso?

---

# 19. Procedimiento recomendado — Error Path

No mezclar con el happy path.

```text
1. [Limpiar]
2. volver al estado inicial
3. [Grabar]
4. provocar deliberadamente el error seguro
5. observar mensajes/estados
6. [Detener]
7. [PFF]
```

Ejemplos:

- campo requerido vacío;
- URL inválida;
- acción bloqueada por validación;
- respuesta HTTP de error en fixture controlado;
- estado offline reproducible en entorno de prueba.

No provoques fallos destructivos en producción sólo para aumentar cobertura.

---

# 20. Procedimiento recomendado — Empty State

```text
1. llegar al estado vacío
2. [Analizar]
3. [Grabar] si existe CTA
4. ejecutar CTA
5. [Detener]
6. comparar Screen Flow y PFF
```

Documenta especialmente:

- copy vacío;
- CTA disponible;
- navegación de recuperación;
- ausencia legítima de controles.

---

# 21. Procedimiento recomendado — Inspector forense

Usa Inspector para investigar una anomalía visual o identificar un elemento.

```text
1. asegúrate de que Recorder esté detenido
2. activa Inspector
3. mueve el puntero sobre el área
4. selecciona el elemento
5. copia selector si lo necesita desarrollo
6. Escape
7. confirma Inspector OFF
```

Después, si quieres documentar el comportamiento real del elemento:

```text
[Grabar]
→ ejecutar la acción normalmente
→ [Detener]
→ [PFF]
```

No uses el click de Inspector como prueba de comportamiento funcional porque Inspector cancela ese click intencionalmente.

---

# 22. Cobertura observacional

Una página puede contener funciones que todavía no ejecutaste.

La metodología correcta es pensar en cobertura por escenarios:

```text
Función detectada
│
├── no ejecutada → ≈ / ⊘ según evidencia
│
└── ejecutada
    ├── success
    ├── validation error
    ├── network error
    └── alternate state
```

Para productos importantes crea una matriz externa de cobertura por función y escenario.

---

# 23. Interpretación de navegación

Zen DevTool puede observar cambios mediante History API y eventos relacionados.

Ejemplos:

- `pushState`;
- `replaceState`;
- `popstate`;
- `hashchange`.

Una navegación observada indica cambio de URL/ruta visible, pero no prueba por sí sola que un backend haya completado una transacción.

---

# 24. Interpretación de red

Una request observada significa que la página inició tráfico observable durante Recorder.

No asumir automáticamente:

```text
HTTP 200 = operación de negocio correcta
```

Un `200` puede contener un resultado funcionalmente inválido. Como Zen DevTool no lee bodies, el resultado debe corroborarse con estado visible u otra evidencia del producto.

Mejor conclusión:

```text
✓ POST observado
✓ HTTP 200
✓ UI muestra “Guardado”
```

es más fuerte que:

```text
✓ HTTP 200
```

solo.

---

# 25. Cómo trabajar con SPA

En React/Next/Vue/etc. una acción puede no recargar la página.

Zen DevTool combina:

- DOM;
- history;
- estado;
- Recorder;
- network metadata.

Por eso debes esperar a que el estado visual final se estabilice antes de detener la grabación.

---

# 26. Formularios

Scanner puede registrar que un campo:

- existe;
- es required;
- tiene label;
- tiene rol;
- está disabled;
- tiene estado de validación accesible.

No registra el valor escrito.

Ejemplo correcto:

```text
(Título · required=true)
```

No:

```text
(Título = "Documento secreto")
```

---

# 27. Accesibilidad

Zen DevTool utiliza señales accesibles para entender controles.

Un producto con ARIA y labels correctos suele producir diagramas más claros.

Si aparece un control como:

```text
[action]
button
input
```

sin nombre útil, puede ser una señal de deuda de accesibilidad del producto inspeccionado.

No corregir automáticamente la interpretación inventando un label que no existe.

---

# 28. Qué hacer si el PFF parece incorrecto

Diagnóstico en orden:

```text
1. ¿Analizaste el estado correcto?
2. ¿Limpiaste la sesión anterior?
3. ¿Recorder estaba ON durante el recorrido?
4. ¿Inspector estaba OFF?
5. ¿Esperaste el estado final?
6. ¿La aplicación usa un patrón no observable actualmente?
7. ¿El elemento tiene semántica/ARIA deficiente?
8. ¿El resultado es realmente inferencia y no hecho?
```

Después revisa JSON para separar problema de captura de problema de representación.

---

# 29. Qué hacer si Inspector parece bloquear la aplicación

Primero mira el botón global.

Si dice:

```text
Inspector · ON
```

el bloqueo de clicks de página es esperado.

Sal mediante:

```text
Escape
```

o cualquier control de desactivación.

Si Zen DevTool no permite desactivar Inspector, reportar como regresión P0/P1 de interacción según impacto.

---

# 30. Qué hacer si la ventana molesta

Opciones:

1. arrastrarla a otra zona;
2. moverla con Alt + flechas;
3. usar `[Cerrar]` temporalmente;
4. volver a abrirla mediante el launcher.

No necesitas desplazar la página para “hacer sitio” a Zen DevTool.

---

# 31. Qué hacer si la ventana queda cerca del borde

El controlador limita la posición al viewport.

Si cambias el tamaño de la ventana del navegador, Zen DevTool reajusta una posición explícita para mantenerla accesible.

En pantallas estrechas la ventana ocupa gran parte del viewport por necesidad, pero conserva la misma semántica de ventana flotante.

---

# 32. Protocolo de captura recomendado para UX/UI

Para cada función relevante:

```text
PFF-XX · Nombre
│
├── Estado inicial
├── Happy path
├── Validation path
├── Error path
├── Empty state
├── Alternate state
└── Recovery
```

No es obligatorio que todos existan. Sólo registra escenarios reales del producto.

---

# 33. Protocolo recomendado para Development Handoff

Antes de entregar un PFF a desarrollo:

- separar observado de inferido;
- incluir selector sólo si ayuda;
- identificar estado inicial;
- indicar qué escenario fue ejecutado;
- no presentar HTTP como regla de negocio;
- señalar cualquier `⊘` importante;
- repetir flujo si la sesión contiene eventos no relacionados.

---

# 34. Protocolo recomendado para QA

QA puede usar Zen DevTool para reproducibilidad:

```text
Caso
├── URL inicial
├── precondición
├── grabación
├── PFF
├── JSON sanitizado
└── resultado esperado/real
```

Zen DevTool no sustituye assertions de QA, pero ayuda a conservar evidencia estructurada del recorrido.

---

# 35. Regla de sesiones mínimas

Una sesión debe responder una pregunta concreta.

Mala sesión:

```text
login + editar perfil + buscar + publicar + logout
```

Mejor:

```text
Sesión A · Login correcto
Sesión B · Login incorrecto
Sesión C · Editar perfil
Sesión D · Publicar
```

Esto mejora precisión y legibilidad del PFF.

---

# 36. Señales de una captura de alta calidad

Una buena captura tiene:

- estado inicial claro;
- pocos eventos irrelevantes;
- trigger reconocible;
- resultado visible;
- navegación/red sólo cuando ocurrió;
- `✓` en hechos reales;
- `≈` en semántica inferida;
- `⊘` en fronteras no observables;
- ningún dato privado.

---

# 37. Señales de una captura de baja calidad

- Recorder se dejó ON durante exploración aleatoria;
- Inspector se utilizó como si ejecutara acciones reales;
- se mezclaron varias tareas;
- no se esperó el feedback final;
- se interpreta un botón detectado como función verificada;
- se interpreta `HTTP 200` como éxito de negocio;
- se comparte JSON sin comprobar redacción;
- el producto tiene labels inaccesibles y no se documenta la limitación.

---

# 38. Flujo maestro de uso

```text
ABRIR ZEN DEVTOOL
│
├── mover ventana si estorba
│
├── [Analizar]
│   └── entender superficie
│
├── ? ¿Necesitas observar comportamiento real?
│   ├── No
│   │   ├── [Screen Flow]
│   │   └── [PFF]
│   │
│   └── Sí
│       ├── [Limpiar]
│       ├── [Grabar]
│       ├── ejecutar flujo
│       ├── [Detener]
│       └── [PFF]
│
├── ? ¿Necesitas diagnosticar un elemento?
│   └── [Inspector]
│       ├── seleccionar
│       ├── copiar selector
│       └── Escape
│
├── ? ¿Necesitas evidencia estructurada?
│   └── [JSON]
│
└── [Copiar]
```

---

# 39. Tabla rápida de funciones

| Función | Hace | No hace |
| --- | --- | --- |
| Mover | Reposiciona DevTool | No altera producto ni PFF |
| Analizar | Escanea superficie actual | No ejecuta botones |
| Grabar | Inicia observación del recorrido | No captura valores privados |
| Detener | Finaliza captura | No borra eventos |
| Screen Flow | Representa superficies/navegación | No prueba lógica interna |
| PFF | Representa función/evidencia | No inventa backend |
| JSON | Muestra snapshot estructurado | No añade datos extra |
| Inspector | Selecciona/diagnostica elementos | No debe usarse como click funcional |
| Limpiar | Borra eventos de sesión | No borra la página |
| Copiar | Copia salida | No envía datos a servidor |
| Cerrar | Oculta ventana | No destruye la página |
| Escape | Sale de Inspector | No cierra toda la herramienta |

---

# 40. Checklist antes de compartir una captura

```text
[ ] El escenario tiene nombre.
[ ] La sesión se limpió antes de empezar.
[ ] Inspector estaba OFF durante el flujo real.
[ ] Recorder estuvo ON durante todo el escenario.
[ ] Se esperó el estado final.
[ ] El PFF diferencia ✓ / ≈ / ⊘.
[ ] El JSON no contiene valores privados.
[ ] La salida no mezcla funcionalidades distintas.
[ ] Las limitaciones están documentadas.
[ ] El resultado puede ser reproducido por otra persona.
```

---

# 41. Criterio de confianza

Zen DevTool es más confiable cuanto más fuerte sea la cadena de evidencia:

```text
DOM semántico
    +
acción ejecutada
    +
cambio de estado
    +
navegación/red observada
    +
resultado visible
```

Pero incluso con toda esa evidencia debe mantenerse una frontera conceptual:

> Zen DevTool describe lo que el navegador puede observar. No afirma conocer código interno o reglas privadas que nunca cruzaron esa frontera.

---

# 42. Resumen operativo

Si sólo recuerdas una rutina, usa ésta:

```text
[Limpiar]
   ↓
[Analizar]
   ↓
[Grabar]
   ↓
ejecuta UNA tarea real
   ↓
[Detener]
   ↓
[PFF]
   ↓
revisa ✓ / ≈ / ⊘
   ↓
[JSON] si necesitas auditoría
   ↓
[Copiar]
```

Y para diagnosticar elementos:

```text
Inspector ON
   ↓
selecciona
   ↓
obtén selector
   ↓
Escape
```

Esta disciplina evita que el usuario se pierda y mantiene cada salida vinculada a evidencia concreta.
