import type { DependencyItem, WorkflowAgentSpec } from './spec.ts';

function yn(value: boolean | undefined, fallback = true): string {
  return value ?? fallback ? 'yes' : 'no';
}

function list(items: string[] | undefined): string {
  if (!items?.length) return '- None declared.\n';
  return items.map((item) => `- ${item}`).join('\n') + '\n';
}

function depTable(items: DependencyItem[] | undefined, columns: Array<'name' | 'path' | 'url' | 'command' | 'purpose' | 'required' | 'verify' | 'secret' | 'git' | 'notes'>): string {
  if (!items?.length) return 'None declared.\n';
  const header = columns.map(label).join(' | ');
  const sep = columns.map(() => '---').join(' | ');
  const rows = items.map((item) => columns.map((col) => cell(item, col)).join(' | '));
  return `${header}\n${sep}\n${rows.join('\n')}\n`;
}

function label(col: string): string {
  return ({ name: 'Name', path: 'Path', url: 'URL', command: 'Command', purpose: 'Purpose', required: 'Required', verify: 'Verify', secret: 'Secret?', git: 'Git policy', notes: 'Notes' } as Record<string, string>)[col];
}

function cell(item: DependencyItem, col: string): string {
  const raw = col === 'required' ? yn(item.required)
    : col === 'secret' ? yn(item.containsSecrets, false)
    : col === 'git' ? item.gitPolicy
    : col === 'verify' && item.verifyAny?.length ? item.verifyAny.map((check) => `${check.name}: \`${check.command}\``).join('<br>OR ') || item.verify
    : (item as Record<string, unknown>)[col];
  return String(raw ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>') || '-';
}

function internalTools(spec: WorkflowAgentSpec): string {
  const tools = spec.dependencies.internalTools;
  if (!tools?.length) return 'None declared.\n';
  return `Name | Command | Purpose | Verify\n--- | --- | --- | ---\n${tools.map((tool) => `${tool.name} | \`${tool.command}\` | ${tool.purpose} | ${tool.verify ? `\`${tool.verify}\`` : '-'}`).join('\n')}\n`;
}

function dependencySections(spec: WorkflowAgentSpec): string {
  const d = spec.dependencies;
  return `## Dependencies\n\nAll dependencies are explicit. Internal and external tools are both first-class dependencies. Secret-bearing config must come from untracked local files or environment variables.\n\n### External tools\n\n${depTable(d.externalTools, ['name', 'purpose', 'required', 'verify', 'notes'])}\n### Internal tools\n\n${internalTools(spec)}\n### Services\n\n${depTable(d.services, ['name', 'url', 'purpose', 'required', 'verify'])}\n### Local config\n\n${depTable(d.localConfig, ['path', 'purpose', 'required', 'secret', 'git'])}\n### Environment variables\n\n${depTable(d.environmentVariables, ['name', 'purpose', 'required', 'secret'])}\n### Filesystem paths\n\n${depTable(d.filesystemPaths, ['path', 'purpose', 'required', 'git'])}\n### Tracked assets\n\n${depTable(d.trackedAssets, ['path', 'purpose', 'required', 'git'])}\n### Generated artifacts\n\n${depTable(d.generatedArtifacts, ['path', 'purpose', 'git'])}\n`;
}

function processing(spec: WorkflowAgentSpec): string {
  const p = spec.processing;
  const evidenceFiles = p.evidence?.files?.map((file) => `- ${file}`).join('\n') || '- None declared';
  return `## Processing model\n\n- Project root: \`${p.projectRoot ?? 'projects'}\`\n- Archive root: \`${p.archiveRoot ?? 'archive'}\`\n- Files being processed location: **${p.filesBeingProcessed.location}**\n- Never commit files being processed: **${p.filesBeingProcessed.neverCommit ? 'yes' : 'no'}**\n\n### Internal processing stages\n\n${p.filesBeingProcessed.internalStages?.length ? p.filesBeingProcessed.internalStages.map((stage) => `- \`${stage}/\``).join('\n') : '- None declared'}\n\n### External processing paths\n\n${p.filesBeingProcessed.externalPaths?.length ? p.filesBeingProcessed.externalPaths.map((path) => `- \`${path}\``).join('\n') : '- None declared'}\n\n### Evidence\n\n- Enabled: **${p.evidence?.enabled ? 'yes' : 'no'}**\n- Commit policy: ${p.evidence?.commitPolicy ?? 'ignored by default'}\n- Archive after completion: **${p.evidence?.archiveAfterCompletion ? 'yes' : 'no'}**\n\nEvidence files:\n\n${evidenceFiles}\n\n### Cleanup\n\n- After publish: **${p.cleanup?.afterPublish ? 'yes' : 'no'}**\n- Remove/trash processing files: **${p.cleanup?.removeOrTrashProcessingFiles ? 'yes' : 'no'}**\n- Preserve evidence only: **${p.cleanup?.preserveEvidenceOnly ? 'yes' : 'no'}**\n`;
}

function customSections(spec: WorkflowAgentSpec): string {
  if (!spec.customSections?.length) return '';
  return spec.customSections.map((section) => `## ${section.title}\n\n${section.content.trim()}\n`).join('\n');
}

function startupCheck(spec: WorkflowAgentSpec): string {
  const d = spec.dependencies;
  const toolLine = (tool: DependencyItem) => {
    const verify = tool.verifyAny?.length
      ? tool.verifyAny.map((check) => `${check.name}: \`${check.command}\``).join(' OR ')
      : tool.verify ? `\`${tool.verify}\`` : 'verify installed';
    return `- [ ] ${tool.name}: ${verify}`;
  };
  const required = [
    ...(d.externalTools ?? []).filter((tool) => tool.required !== false).map(toolLine),
    ...(d.localConfig ?? []).filter((cfg) => cfg.required !== false).map((cfg) => `- [ ] Config exists: \`${cfg.path}\`${cfg.containsSecrets ? ' (secret-bearing, never commit)' : ''}`),
    ...(d.environmentVariables ?? []).filter((env) => env.required !== false).map((env) => `- [ ] Environment variable set: \`${env.name}\`${env.containsSecrets ? ' (secret)' : ''}`),
    ...(d.filesystemPaths ?? []).filter((p) => p.required !== false).map((p) => `- [ ] Path available: \`${p.path}\``),
    ...(d.services ?? []).filter((svc) => svc.required !== false).map((svc) => `- [ ] Service reachable: ${svc.name}${svc.url ? ` at \`${svc.url}\`` : ''}`),
  ];
  const optional = [
    ...(d.externalTools ?? []).filter((tool) => tool.required === false).map(toolLine),
    ...(d.localConfig ?? []).filter((cfg) => cfg.required === false).map((cfg) => `- [ ] Config exists if used: \`${cfg.path}\``),
    ...(d.environmentVariables ?? []).filter((env) => env.required === false).map((env) => `- [ ] Environment variable set if used: \`${env.name}\`${env.containsSecrets ? ' (secret)' : ''}`),
    ...(d.filesystemPaths ?? []).filter((p) => p.required === false).map((p) => `- [ ] Path available if used: \`${p.path}\``),
    ...(d.services ?? []).filter((svc) => svc.required === false).map((svc) => `- [ ] Service reachable if used: ${svc.name}${svc.url ? ` at \`${svc.url}\`` : ''}`),
  ];
  return `## Startup dependency check\n\n### Required\n\n${required.length ? required.join('\n') : '- [ ] No required checks declared.'}\n\n### Optional\n\n${optional.length ? optional.join('\n') : '- None declared.'}\n`;
}

export function renderAgents(spec: WorkflowAgentSpec): string {
  return `# ${spec.name} — Agent Operating Guide\n\n${spec.description}\n\n## Mission\n\n${list(spec.mission)}\n${dependencySections(spec)}\n${startupCheck(spec)}\n${processing(spec)}\n${customSections(spec)}\n## Hard boundaries\n\n${list(spec.hardBoundaries)}\n## Standard workflow\n\n${list(spec.standardWorkflow)}\n## Fallback workflow\n\n${list(spec.fallbackWorkflow)}\n## Safety rules\n\n${list(spec.safetyRules)}\n## Known limitations\n\n${list(spec.knownLimitations)}\n## Git and credential policy\n\n- Never commit credentials, tokens, API keys, cookies, service config, or environment files.\n- Never commit files being processed.\n- Evidence and archive data are ignored by default because they may contain private paths, names, URLs, or decisions.\n- Commit only workflow instructions, internal tooling, templates, checked-in profiles/configs, and sanitized examples.\n`;
}

export function renderReadme(spec: WorkflowAgentSpec): string {
  return `# ${spec.name}\n\n${spec.description}\n\n## Quick start\n\n1. Read \`AGENTS.md\`.\n2. Run the startup dependency check.\n3. Confirm required external tools, internal tools, services, config, environment variables, and paths.\n4. Process work through the declared workflow.\n5. Publish outputs to the external destination, clean processing files, and preserve evidence only.\n\n${dependencySections(spec)}\n${processing(spec)}\n${customSections(spec)}\n## Internal commands\n\n${spec.dependencies.internalTools?.length ? spec.dependencies.internalTools.map((tool) => `- \`${tool.command}\` — ${tool.purpose}`).join('\n') : '- None declared.'}\n\n## Doctor\n\nIf generated, run:\n\n\`\`\`bash\ncommands/doctor.sh\n\`\`\`\n`;
}

export function renderGitignore(spec: WorkflowAgentSpec): string {
  const projectRoot = spec.processing.projectRoot ?? 'projects';
  const archiveRoot = spec.processing.archiveRoot ?? 'archive';
  const stages = spec.processing.filesBeingProcessed.internalStages ?? ['todo', 'in-process', 'done'];
  const lines = [
    '# macOS',
    '.DS_Store',
    '',
    '# Environment / local credentials',
    '.env',
    '.env.*',
    '!.env.example',
    '*.local',
    '*.secret',
    'secrets/',
    'credentials/',
    'config.local.*',
    '*cookies*.txt',
    '',
    '# Dependencies / build outputs',
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '',
    '# Runtime scratch/logs',
    'tmp/',
    '.temp/',
    'cache/',
    'logs/',
    '*.log',
    '',
    '# Workflow processing files — never commit files being processed',
    `${projectRoot}/*/todo/`,
    `${projectRoot}/*/in-process/`,
    `${projectRoot}/*/done/`,
    `${projectRoot}/*/evidence/`,
    `!${projectRoot}/.gitkeep`,
    '',
    '# Local evidence archive may contain private details',
    `${archiveRoot}/*`,
    `!${archiveRoot}/.gitkeep`,
    '',
    '# Declared generated artifacts',
    ...(spec.dependencies.generatedArtifacts ?? []).map((artifact) => artifact.path ?? '').filter(Boolean),
    ...stages.map((stage) => `${projectRoot}/*/${stage}/`),
    ...(spec.git?.extraIgnore ?? []),
  ];
  return Array.from(new Set(lines)).join('\n') + '\n';
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function renderDoctor(spec: WorkflowAgentSpec): string {
  const toolChecks = (spec.dependencies.externalTools ?? []).filter((tool) => tool.required !== false).map((tool) => {
    if (tool.verifyAny?.length) {
      const args = tool.verifyAny.flatMap((check) => [check.name, check.command]).map(shellQuote).join(' ');
      return `check_any_cmd ${shellQuote(tool.name ?? 'tool')} ${args}`;
    }
    return tool.verify ? `check_cmd ${shellQuote(tool.name ?? tool.verify)} ${shellQuote(tool.verify)}` : '';
  });
  const envChecks = (spec.dependencies.environmentVariables ?? []).filter((env) => env.required !== false).map((env) => `check_env ${shellQuote(env.name ?? '')}`);
  const configChecks = (spec.dependencies.localConfig ?? [])
    .filter((cfg) => !(cfg.path ?? '').includes('.json:'))
    .map((cfg) => `check_path ${shellQuote(cfg.path ?? '')}`);
  const pathSettings = [
    ...(spec.doctor?.pathSettings ?? []),
    ...(spec.doctor?.pathSettingsFiles ?? []).map((file) => ({ file })),
  ];
  const pathSettingsChecks = pathSettings.map((setting) => `check_json_paths ${shellQuote(setting.file)} ${shellQuote(setting.objectPath ?? '')}`);
  const staticPathChecks = pathSettings.length ? [] : (spec.dependencies.filesystemPaths ?? []).filter((p) => p.required !== false).map((p) => `check_path ${shellQuote(p.path ?? '')}`);
  const checks = [...toolChecks, ...envChecks, ...configChecks, ...pathSettingsChecks, ...staticPathChecks].filter(Boolean).join('\n');
  return `#!/usr/bin/env bash\nset -u\nfail=0\n\nexpand_path() {\n  local value="$1"\n  if [[ "$value" == "~/"* ]]; then\n    printf '%s/%s' "$HOME" "\${value#\\~/}"\n  else\n    printf '%s' "$value"\n  fi\n}\n\ncheck_cmd() {\n  local name="$1"\n  local cmd="$2"\n  echo "checking $name: $cmd"\n  if bash -lc "$cmd" >/dev/null 2>&1; then\n    echo "  ok"\n  else\n    echo "  missing/failed"\n    fail=1\n  fi\n}\n\ncheck_any_cmd() {\n  local name="$1"\n  shift\n  echo "checking $name: one of the supported options"\n  while [ "$#" -gt 0 ]; do\n    local label="$1"\n    local cmd="$2"\n    shift 2\n    echo "  option $label: $cmd"\n    if bash -lc "$cmd" >/dev/null 2>&1; then\n      echo "  ok ($label)"\n      return 0\n    fi\n  done\n  echo "  missing/failed: supply one of the options above"\n  fail=1\n}\n\ncheck_env() {\n  local name="$1"\n  if [ -n "\${!name:-}" ]; then\n    echo "env $name: ok"\n  else\n    echo "env $name: missing"\n    fail=1\n  fi\n}\n\ncheck_path() {\n  local p\n  p=$(expand_path "$1")\n  if [ -e "$p" ]; then\n    echo "path $1: ok"\n  else\n    echo "path $1: missing"\n    fail=1\n  fi\n}\n\ncheck_json_paths() {\n  local file="$1"\n  local object_path="\${2:-}"\n  local expanded\n  expanded=$(expand_path "$file")\n  if [ ! -f "$expanded" ]; then\n    echo "settings paths file $file: missing"\n    fail=1\n    return\n  fi\n  if [ -n "$object_path" ]; then\n    echo "checking paths from $file:$object_path"\n  else\n    echo "checking paths from $file"\n  fi\n  while IFS=$'\t' read -r key value; do\n    [ -n "$key" ] || continue\n    local path_value\n    path_value=$(expand_path "$value")\n    if [ -e "$path_value" ]; then\n      echo "path $key=$value: ok"\n    else\n      echo "path $key=$value: missing"\n      fail=1\n    fi\n  done < <(node -e 'const fs=require("fs"); const file=process.argv[1]; const objectPath=process.argv[2]; let data=JSON.parse(fs.readFileSync(file,"utf8")); if (objectPath) for (const key of objectPath.split(".")) data = data?.[key]; for (const [k,v] of Object.entries(data || {})) if (typeof v === "string" && (v.startsWith("~/") || v.startsWith("/") || v.includes("/"))) console.log(k + "\t" + v);' "$expanded" "$object_path")\n}\n\n${checks}\n\nexit "$fail"\n`;
}
