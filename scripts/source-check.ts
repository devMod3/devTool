import { readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const PRODUCT_SOURCE_ROOTS = [
  'packages/core/src',
  'packages/extension/src',
  'apps/lab/app',
] as const;

const FORBIDDEN_SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.cjs', '.mjs']);

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else if (entry.isFile()) files.push(path);
  }

  return files;
}

function writeLine(stream: NodeJS.WriteStream, message: string): void {
  stream.write(`${message}\n`);
}

async function main(): Promise<void> {
  const productFiles = (
    await Promise.all(PRODUCT_SOURCE_ROOTS.map(async (root) => collectFiles(root)))
  ).flat();
  const offenders = productFiles
    .filter((path) => FORBIDDEN_SOURCE_EXTENSIONS.has(extname(path).toLowerCase()))
    .map((path) => relative(process.cwd(), path))
    .sort();

  if (offenders.length === 0) {
    writeLine(process.stdout, 'Source policy PASS: product source is TypeScript/TSX only.');
    return;
  }

  writeLine(
    process.stderr,
    'Source policy FAIL: JavaScript source files were found in product directories:',
  );
  for (const offender of offenders) writeLine(process.stderr, `- ${offender}`);
  writeLine(
    process.stderr,
    'Move runtime JavaScript to generated dist/ artifacts or convert the source to TypeScript.',
  );
  process.exitCode = 1;
}

await main();
