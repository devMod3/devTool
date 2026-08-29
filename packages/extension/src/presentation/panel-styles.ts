export const PANEL_STYLES = `
  *{box-sizing:border-box}
  .zf-panel{position:fixed;right:12px;bottom:12px;width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;pointer-events:auto;background:#121416;color:#f1f0eb;border:1px solid #434a50;box-shadow:0 24px 80px rgba(0,0,0,.52);font:13px/1.4 system-ui,sans-serif;z-index:2147483646}
  .zf-panel[hidden]{display:none}
  .zf-head,.zf-actions{display:flex;align-items:center;gap:8px;padding:8px 10px}
  .zf-head{justify-content:space-between;border-bottom:1px solid #2d3338}
  .zf-drag-handle{display:flex;align-items:center;gap:12px;min-width:0;flex:1;cursor:grab;touch-action:none;user-select:none;outline:none}
  .zf-drag-handle[data-dragging="true"]{cursor:grabbing}
  .zf-drag-handle:focus-visible{box-shadow:inset 0 0 0 2px #c5ae7a}
  .zf-brand{display:grid;gap:2px;min-width:0}
  .zf-brand small{color:#c5ae7a;font-size:10px;font-weight:800;letter-spacing:.09em}
  .zf-brand strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 16px/1.2 Georgia,serif}
  .zf-move-hint{margin-left:auto;color:#858a8f;font-size:10px;white-space:nowrap}
  .zf-stats{padding:8px 10px;background:#1d2125;border-bottom:1px solid #2d3338;color:#b4b6b8;font-size:11px}
  .zf-output{width:100%;min-height:360px;max-height:58vh;resize:vertical;border:0;outline:0;padding:12px;background:#0b0d0f;color:#e6e7e3;font:12px/1.5 ui-monospace,monospace;white-space:pre}
  .zf-actions{flex-wrap:wrap;border-top:1px solid #2d3338}
  .zf-actions button,.zf-head button{min-height:34px;border:1px solid #434a50;background:#1d2125;color:#f1f0eb;padding:0 9px;font:700 11px/1 system-ui,sans-serif;cursor:pointer}
  .zf-actions button:hover,.zf-head button:hover{border-color:#c5ae7a}
  .zf-actions button[data-active="true"]{border-color:#d16f72;color:#d16f72}
  .zf-actions .primary{border-color:#c5ae7a}
  .zf-status{margin-left:auto;color:#8fa895;font-size:11px}
  @media(max-width:640px){.zf-panel{right:8px;bottom:8px;width:min(620px,calc(100vw - 16px));max-height:calc(100vh - 16px)}.zf-output{min-height:180px;max-height:52vh;flex:1}.zf-actions{max-height:120px;overflow:auto}.zf-move-hint{display:none}}
`;
