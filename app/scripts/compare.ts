#!/usr/bin/env bun
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [left, right] = process.argv.slice(2);
if (!left || !right) {
  console.error('usage: bun run compare <existing-agent-dir> <generated-agent-dir>');
  process.exit(1);
}

const ignored = new Set(['.git', 'node_modules', '.DS_Store']);
const ignoredRoots = new Set(['projects', 'archive']);

async function files(root: string, rel = ''): Promise<string[]> {
  const dir = path.join(root, rel);
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const child = path.join(rel, entry.name);
    if (!rel && ignoredRoots.has(entry.name)) continue;
    if (entry.isDirectory()) out.push(...await files(root, child));
    else out.push(child);
  }
  return out.sort();
}

async function hash(file: string): Promise<string> {
  const data = await fs.readFile(file);
  return createHash('sha256').update(data).digest('hex').slice(0, 12);
}

const lroot = path.resolve(left);
const rroot = path.resolve(right);
const lf = await files(lroot);
const rf = await files(rroot);
const all = Array.from(new Set([...lf, ...rf])).sort();

const added: string[] = [];
const removed: string[] = [];
const changed: string[] = [];
const same: string[] = [];

for (const file of all) {
  const inL = lf.includes(file);
  const inR = rf.includes(file);
  if (!inL) added.push(file);
  else if (!inR) removed.push(file);
  else {
    const [lh, rh] = await Promise.all([hash(path.join(lroot, file)), hash(path.join(rroot, file))]);
    if (lh === rh) same.push(file);
    else changed.push(file);
  }
}

function print(title: string, items: string[]) {
  console.log(`\n## ${title} (${items.length})`);
  if (!items.length) console.log('- none');
  else for (const item of items) console.log(`- ${item}`);
}

console.log(`# Comparison\nleft: ${lroot}\nright: ${rroot}`);
print('Same', same);
print('Changed', changed);
print('Only in right/generated', added);
print('Only in left/existing', removed);
