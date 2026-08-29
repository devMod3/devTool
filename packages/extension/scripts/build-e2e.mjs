import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'dist');
const target = resolve(root, 'dist-e2e');
const manifestPath = resolve(source, 'manifest.json');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (Object.hasOwn(manifest, 'host_permissions')) {
  throw new Error('Production manifest must not declare host_permissions.');
}

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

const e2eManifest = {
  ...manifest,
  name: `${manifest.name} · E2E`,
  host_permissions: ['http://127.0.0.1:3000/*'],
};
await writeFile(resolve(target, 'manifest.json'), `${JSON.stringify(e2eManifest, null, 2)}\n`);
