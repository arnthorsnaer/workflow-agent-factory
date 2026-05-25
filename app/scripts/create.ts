#!/usr/bin/env bun
import fs from 'node:fs/promises';
import path from 'node:path';
import { createAgent } from '../lib/scaffold.ts';
import { requireSpec } from '../lib/spec.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const specFile = process.argv[2];
const out = arg('--out');
const force = process.argv.includes('--force');

if (!specFile || specFile.startsWith('--') || !out) {
  console.error('usage: bun run create <spec.json> --out <agent-dir> [--force]');
  process.exit(1);
}

try {
  const specPath = path.resolve(specFile);
  const spec = requireSpec(JSON.parse(await fs.readFile(specPath, 'utf8')));
  await createAgent(spec, { outDir: out, specDir: path.dirname(specPath), force });
  console.log(`created ${spec.name} at ${path.resolve(out)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
