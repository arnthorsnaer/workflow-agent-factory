import fs from 'node:fs/promises';
import path from 'node:path';

export async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeText(file: string, content: string): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

export async function copyRecursive(from: string, to: string): Promise<void> {
  const stat = await fs.stat(from);
  await ensureDir(path.dirname(to));
  if (stat.isDirectory()) {
    await fs.cp(from, to, {
      recursive: true,
      force: true,
      filter: (source) => {
        const base = path.basename(source);
        if (base === '.git' || base === 'node_modules' || base === '.DS_Store') return false;
        return true;
      },
    });
  } else {
    await fs.copyFile(from, to);
  }
}

export function resolveFrom(baseDir: string, maybeRelative: string): string {
  if (maybeRelative.startsWith('~')) return path.join(process.env.HOME ?? '', maybeRelative.slice(1));
  return path.resolve(baseDir, maybeRelative);
}
