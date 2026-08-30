# ResurrecciónLLM

Motor central de continuidad para reconstruir el estado verificable de cualquier repositorio sin acoplar la herramienta al proyecto observado.

## Componentes

- `CONTINUITY_STATE.json`: registro multi-proyecto. Separa evidencia automática (`snapshot`, `drift`, `history`) de continuidad mantenida por el agente (`continuity`).
- `.github/workflows/continuity-snapshot.yml`: workflow ejecutable. GitHub Actions exige que los workflows activos vivan bajo `.github/workflows/`; por eso el launcher no puede residir dentro de esta carpeta.
- `GUIA_DE_USO.txt`: procedimiento autosuficiente para preparar el borrado de un chat, ejecutar snapshots y resucitar un proyecto en una conversación nueva.
- `ENTORNO_VIBE_CODING.txt`: mapa operativo desde el chat y el conector GitHub hasta CI, build, deployment y página publicada.

## Regla de separación

ResurrecciónLLM pertenece a `devTool`, no al repositorio observado. Un proyecto objetivo no necesita ni debe copiar `CONTINUITY_STATE.json`, harnesses de continuidad o workflows de ResurrecciónLLM en su raíz para ser observado.

La continuidad central evita que una herramienta transversal modifique la frontera arquitectónica del producto que está inspeccionando.

## Qué hace el snapshot

A partir de un `owner/repo` y un ref opcional:

1. resuelve el HEAD exacto;
2. consulta PRs abiertos y valida hints de rama/PR;
3. recoge check-runs y workflow-runs ligados a ese SHA;
4. consulta el deployment más reciente ligado a ese SHA;
5. compara el resultado con el snapshot anterior;
6. marca la continuidad del agente como `FRESH`, `STALE`, `UNBOUND` o `INITIAL`;
7. preserva intactos `bottleneck`, `open_items`, `next_action` y notas del agente;
8. actualiza el registro central;
9. genera `CONTINUITY_REPORTE.md` como artifact y Job Summary.

## Ejecución

Desde **Actions → ResurrecciónLLM — Continuity Snapshot → Run workflow**.

Entrada mínima:

- `target_repo`: `owner/repo`.

Entradas opcionales:

- `target_ref`: branch, tag o SHA; vacío usa la rama por defecto del repositorio objetivo.
- `working_branch`: hint que el workflow verifica, nunca asume.
- `active_pr`: número de PR a verificar.
- `persist_state`: si es `true`, actualiza `CONTINUITY_STATE.json` en `devTool`.

También acepta `repository_dispatch` con tipo `resurrection-snapshot`, pensado para automatización futura.

## Autenticación

Para repositorios públicos no es obligatorio guardar credenciales adicionales. Para repositorios privados o acceso cross-repo autenticado, configurar en `devTool` el secret:

`RESURRECTION_GITHUB_TOKEN`

Debe ser un token de lectura con acceso únicamente a los repositorios que se quieran observar. El workflow nunca escribe ese token ni headers de autorización en el estado o artifacts.

## Contrato de autoridad

El snapshot guardado orienta la resurrección, pero no es verdad absoluta. GitHub actual, el contenido del SHA exacto y la evidencia de CI/deployment para ese mismo SHA tienen prioridad.
