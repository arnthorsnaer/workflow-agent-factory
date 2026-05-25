# workflow-agent-factory

Generate workflow-agent repositories for repeatable LLM-operated workflows.

A generated workflow agent is defined by explicit dependencies, tools, processing locations, evidence policy, cleanup rules, safety boundaries, and git hygiene.

## Install/use

Requires Bun.

```bash
bun --version
```

Generate an agent from a JSON spec:

```bash
bun run create examples/video-fetcher-agent.json --out ../video-fetcher-agent-v2
bun run create examples/stl-to-gcode-agent.json --out ../stl-to-gcode-agent-v2
```

Overwrite generated files/copy targets in a non-empty output directory:

```bash
bun run create examples/stl-to-gcode-agent.json --out ../stl-to-gcode-agent-v2 --force
```

Compare an existing agent and generated agent:

```bash
bun run compare ../stl-to-gcode-agent ../stl-to-gcode-agent-v2
```

## Spec model

Each spec must declare:

- `name`
- `description`
- `dependencies`
  - `externalTools`
  - `internalTools`
  - `services`
  - `localConfig`
  - `environmentVariables`
  - `filesystemPaths`
  - `trackedAssets`
  - `generatedArtifacts`
- `processing`
  - where files being processed live: `internal`, `external`, or `mixed`
  - evidence files/policy
  - cleanup rules
- hard boundaries, workflows, safety rules, and known limitations
- optional scaffold copy rules for internal tools/assets

## Standard directories

```text
settings/              committed non-secret workflow settings/configuration
app/commands/          internal workflow command entrypoints
app/lib/               internal reusable workflow code
scripts/               operational helper scripts such as doctor.sh
projects/              local processing/evidence workspace
projects/archive/      local archived evidence
```

## Generated files

The factory writes:

```text
AGENTS.md
README.md
.gitignore
workflow-agent.json
scripts/doctor.sh
projects/.gitkeep
projects/archive/.gitkeep
```

If `scaffold.copy` is present, it also copies declared internal tools/assets into the generated repo.

## Git policy

Generated `.gitignore` files default to credential-safe and processing-safe rules:

- never commit `.env`, local config, credentials, cookies, or secrets
- never commit `projects/*/todo/`, `projects/*/in-process/`, or `projects/*/done/`
- ignore `projects/*/evidence/` and `projects/archive/*` by default
- allow `.gitkeep` files for empty scaffolding

Evidence is intentionally ignored because it can include private paths, titles, source URLs, release names, or decisions.

Editable settings should be stored only in `settings/` files. Generated docs, manifests, and scripts should reference settings files/keys rather than duplicating the values, so settings do not drift out of sync with `AGENTS.md`, `README.md`, or `workflow-agent.json`.

## Single source of truth rule

If a generated agent has a user-editable value, the factory should choose one source of truth:

- paths and service URLs: `settings/*.json`
- non-secret workflow settings: `settings/`
- secrets: environment variables or untracked local config
- generated docs/manifests/scripts: references to settings keys, not duplicated values

Example: use `settings/paths.json:downloadStaging`, not a hardcoded download path in `AGENTS.md`.
