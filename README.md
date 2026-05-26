# workflow-agent-factory

Generate workflow-agent repositories for repeatable LLM-operated workflows.

A generated workflow agent is defined by explicit dependencies, workflow steps, utilities, internal tools, processing locations, evidence policy, cleanup rules, safety boundaries, settings, and git hygiene.

## Install/use

Requires Bun.

```bash
bun --version
```

Generate an agent from a JSON recipe:

```bash
bun run create recipes/image-contact-sheet-workflow.json --out ../image-contact-sheet-agent
bun run create recipes/github-issues-triage-workflow.json --out ../github-issues-triage-agent
```

Overwrite generated files/copy targets in a non-empty output directory:

```bash
bun run create recipes/image-contact-sheet-workflow.json --out ../image-contact-sheet-agent --force
```

## Recipes

Recipes are JSON files that describe a workflow agent to generate. The included recipes are generic starting points:

- `recipes/image-contact-sheet-workflow.json` — local image folder → HTML contact sheet using an internal tool.
- `recipes/github-issues-triage-workflow.json` — GitHub issues → local Markdown triage summary using an external service.

Copy a recipe, rename it, and adapt it for your workflow.

## Spec model

Each recipe must declare:

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
- workflow steps, utilities, hard boundaries, workflows, safety rules, and known limitations
- optional scaffold copy/file/replacement rules for internal tools/assets

## Standard directories

```text
settings.json          root committed non-secret workflow settings
workflow/              ordered workflow step commands that map to AGENTS.md step numbers
utilities/             support/diagnostic/helper commands
utilities/doctor.sh    workflow-agent dependency check
tools/                 internal tool implementations/packages
tools/<tool>/app/cli/  internal tool CLI entrypoints
tools/<tool>/app/lib/  internal reusable tool code
projects/              local processing/evidence workspace
projects/archive/      local archived evidence
.factory/              generated metadata for traceability only
```

## Generated files

The factory writes:

```text
AGENTS.md
README.md
.gitignore
.factory/workflow-agent.generated.json
utilities/doctor.sh
projects/.gitkeep
projects/archive/.gitkeep
```

It may also write recipe-declared `settings.json`, `.env.example`, `workflow/*`, `utilities/*`, and `tools/*` files.

## Git policy

Generated `.gitignore` files default to credential-safe and processing-safe rules:

- never commit `.env`, local config, credentials, cookies, or secrets
- never commit `projects/*/todo/`, `projects/*/in-process/`, or `projects/*/done/`
- ignore `projects/*/evidence/` and `projects/archive/*` by default
- allow `.gitkeep` files for empty scaffolding

Evidence is intentionally ignored because it can include private paths, titles, source URLs, release names, or decisions.

Editable settings should be stored only in root-level `settings.json`. Generated docs, manifests, and scripts should reference settings keys rather than duplicating the values, so settings do not drift out of sync with `AGENTS.md`, `README.md`, or `.factory/workflow-agent.generated.json`.

## Single source of truth rule

If a generated agent has a user-editable value, the factory should choose one source of truth:

- paths and service URLs: `settings.json`
- other non-secret workflow settings: `settings.json`
- secrets: environment variables or untracked local config
- generated docs/manifests/scripts: references to settings keys, not duplicated values

Example: use `settings.json:paths.output`, not a hardcoded output path in `AGENTS.md`.

When a dependency or service has a safe CLI start/status/check command, model that command explicitly in `settings.json` and encapsulate it in `workflow/` or `utilities/`. The agent should run commands, not memorize ad-hoc service startup procedures.

## License

MIT
