import { cpFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const shared = {
  bundle: true,
  format: 'iife',
  target: ['chrome120'],
  sourcemap: true,
  legalComments: 'none',
};

await Promise.all([
  build({
    ...shared,
    entryPoints: [resolve(root, 'src/content-entry.ts')],
    outfile: resolve(dist, 'content.js'),
  }),
  build({
    ...shared,
    entryPoints: [resolve(root, 'src/page-probe.ts')],
    outfile: resolve(dist, 'page-probe.js'),
  }),
  build({
    ...shared,
    entryPoints: [resolve(root, 'src/service-worker.ts')],
    outfile: resolve(dist, 'service-worker.js'),
  }),
]);

await cpFile(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));
