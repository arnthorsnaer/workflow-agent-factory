import fs from 'node:fs/promises';
import path from 'node:path';
import { copyRecursive, ensureDir, exists, resolveFrom, writeText } from './fs.ts';
import { renderAgents, renderDoctor, renderGitignore, renderReadme } from './render.ts';
import type { WorkflowAgentSpec } from './spec.ts';

export async function createAgent(spec: WorkflowAgentSpec, options: { outDir: string; specDir: string; force?: boolean }): Promise<void> {
  const out = path.resolve(options.outDir);
  if (await exists(out)) {
    const entries = await fs.readdir(out).catch(() => []);
    if (entries.length && !options.force) throw new Error(`output directory is not empty: ${out}. Pass --force to overwrite generated files/copy targets.`);
  }
  await ensureDir(out);

  for (const item of spec.scaffold?.copy ?? []) {
    const from = resolveFrom(options.specDir, item.from);
    const to = path.join(out, item.to);
    await copyRecursive(from, to);
  }

  for (const dir of spec.scaffold?.createDirs ?? []) {
    await ensureDir(path.join(out, dir));
  }

  for (const replacement of spec.scaffold?.replacements ?? []) {
    const file = path.join(out, replacement.file);
    const content = await fs.readFile(file, 'utf8');
    if (!content.includes(replacement.oldText)) {
      throw new Error(`replacement text not found in ${replacement.file}`);
    }
    await fs.writeFile(file, content.split(replacement.oldText).join(replacement.newText), 'utf8');
  }

  const projectRoot = spec.processing.projectRoot ?? 'projects';
  const archiveRoot = spec.processing.archiveRoot ?? 'archive';
  await ensureDir(path.join(out, projectRoot));
  await ensureDir(path.join(out, archiveRoot));
  await writeText(path.join(out, projectRoot, '.gitkeep'), '');
  await writeText(path.join(out, archiveRoot, '.gitkeep'), '');

  await writeText(path.join(out, 'AGENTS.md'), renderAgents(spec));
  await writeText(path.join(out, 'README.md'), renderReadme(spec));
  await writeText(path.join(out, '.gitignore'), renderGitignore(spec));
  await writeText(path.join(out, 'workflow-agent.json'), `${JSON.stringify(spec, null, 2)}\n`);
  await writeText(path.join(out, 'scripts', 'doctor.sh'), renderDoctor(spec));
  await fs.chmod(path.join(out, 'scripts', 'doctor.sh'), 0o755);
}
