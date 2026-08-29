import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
const worker = readFileSync(new URL('../extension/service-worker.js', import.meta.url), 'utf8');
const flow = readFileSync(new URL('../extension/flow.js', import.meta.url), 'utf8');
const probe = readFileSync(new URL('../extension/page-probe.js', import.meta.url), 'utf8');

assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
assert.equal(Object.hasOwn(manifest, 'host_permissions'), false);

for (const required of ['Screen Flow', 'PFF', 'Grabar', 'JSON', 'Inspector']) {
  assert.match(flow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const marker of ['observed', '≈', '⊘', 'Cobertura observacional']) {
  assert.match(flow, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(probe, /pushState/);
assert.match(probe, /replaceState/);
assert.match(probe, /globalThis\.fetch/);
assert.match(probe, /XMLHttpRequest/);
assert.doesNotMatch(probe, /document\.cookie/);
assert.doesNotMatch(probe, /localStorage/);
assert.doesNotMatch(probe, /sessionStorage/);
assert.doesNotMatch(probe, /request\.text\(/);
assert.doesNotMatch(probe, /request\.json\(/);

assert.match(worker, /world: 'MAIN'/);
assert.match(worker, /probe-bridge\.js/);
assert.match(worker, /flow\.js/);
assert.match(worker, /content\.js/);

console.log('Zen Product Flow Mapper contract: PASS');
