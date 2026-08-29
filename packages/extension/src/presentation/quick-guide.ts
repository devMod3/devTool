export const QUICK_GUIDE = `ZEN DEVTOOL · GUÍA RÁPIDA

OBJETIVO
Documentar lo que una página muestra y lo que realmente ocurre durante un recorrido.

EVIDENCIA
✓ Observado   = ocurrió o está presente directamente.
≈ Inferido    = deducido por DOM, ARIA, rol o destino.
⊘ No verificable = falta evidencia en esta sesión.

RUTINA RECOMENDADA
1. [Limpiar]  → empieza una sesión funcional limpia.
2. [Analizar] → inventaría la superficie actual.
3. [Grabar]   → inicia observación del recorrido real.
4. Ejecuta UNA tarea del producto.
5. [Detener]  → congela nuevos eventos.
6. [PFF]      → genera el Product Functional Flow.
7. Revisa ✓ / ≈ / ⊘ antes de compartir.
8. [JSON]     → auditoría estructurada si la necesitas.
9. [Copiar]   → copia la salida visible.

FUNCIONES
[Analizar]     Escanea controles, superficies, ARIA y estados visibles. No ejecuta acciones.
[Grabar]       Observa clicks/cambios/navegación/red saneada del recorrido real.
[Detener]      Detiene la captura sin borrar lo ya observado.
[Screen Flow]  Muestra estructura de superficies y navegación disponible.
[PFF]          Explica comportamiento funcional con evidencia disponible.
[JSON]         Muestra el snapshot estructurado; no debe contener valores privados de inputs.
[Inspector]    Selecciona elementos para diagnóstico. Mientras está ON bloquea clicks del sitio intencionalmente.
[Limpiar]      Borra eventos de la sesión actual; no modifica la página.
[Copiar]       Copia exactamente la salida visible.
[Cerrar]       Oculta Zen DevTool; no elimina la página.
[Guía]         Vuelve a mostrar esta ayuda.

INSPECTOR · SALIDA GARANTIZADA
- botón [Inspector · ON]
- [Desactivar]
- [Salir de Inspector]
- tecla Escape

VENTANA
- Arrastra la barra superior para moverla.
- Alt + flechas = mover con teclado.
- Shift + Alt + flechas = paso mayor.
- La ventana se mantiene dentro del viewport.

REGLAS FORENSES
- Una sesión = una tarea.
- Inspector OFF durante el flujo funcional real.
- Un HTTP 200 no demuestra por sí solo éxito de negocio.
- Espera el feedback final antes de detener Recorder.
- Nunca conviertas ≈ en ✓ por interpretación manual.
- Si un dato privado aparece en JSON, detén el uso y repórtalo como bug crítico.

MANUAL COMPLETO
Consulta docs/GUIA_FORENSE_DE_USO.md en el repositorio devMod3/devTool.
`;
