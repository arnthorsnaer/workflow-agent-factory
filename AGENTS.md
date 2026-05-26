# workflow-agent-factory — Agent Operating Guide

This repository creates workflow-agent directories: repeatable LLM-operated workflows with explicit dependencies, tools, processing rules, evidence, cleanup, git hygiene, settings, and optional internal tooling.

## Core model

Do not categorize agents as instruction-only or tool-backed. Every workflow agent may depend on a mix of:

- external tools
- internal tools
- services
- local config
- environment variables
- filesystem paths
- tracked assets
- generated artifacts

Generated agents use these standard directories:

- `settings.json` — committed, non-secret workflow settings/configuration.
- `workflow/` — ordered workflow step commands that map to numbered steps in AGENTS.md.
- `utilities/` — support/diagnostic/helper commands that are not main workflow steps.
- `tools/` — internal tool implementations/packages.
- `tools/<tool>/app/cli/` — internal tool CLI entrypoints.
- `tools/<tool>/app/lib/` — internal reusable tool code.
- `projects/` — local processing/evidence workspace.
- `projects/archive/` — local archived evidence.
- `.factory/` — generated metadata for traceability only.

The only useful distinction is whether each dependency is owned by the repo or expected to exist outside it.

## Hard boundaries

- Never commit credentials, tokens, API keys, cookies, local service config, or real environment files.
- Never commit files being processed by a generated workflow agent.
- Evidence/archive data is ignored by default because it may contain private paths, titles, URLs, release names, or decisions.
- Generated agents should commit only workflow instructions, internal tooling, templates, checked-in config, and sanitized recipes.
- Preserve user-created source agents unless explicitly replacing them after approval.
- Avoid multiple sources of truth. If a value is user-editable, store it in exactly one settings file and reference that file/key everywhere else, e.g. `settings.json:paths.output`.
- Prefer executable command interfaces over prose-only operational instructions. If a dependency/service has a safe CLI start/status/check command, put it in `settings.json` and have workflow/utilities commands use it instead of asking the agent to remember manual steps.
- Do not duplicate editable setting values in generated docs, generated manifests, scripts, or recipes unless the target file is the source-of-truth settings file itself.

## Standard workflow

1. Capture the workflow as a JSON recipe.
2. Declare all dependencies explicitly.
3. Declare where files being processed live:
   - `internal`: under the generated repo, e.g. `projects/<job-id>/todo`.
   - `external`: outside the repo, referenced through `settings.json`.
   - `mixed`: both.
4. Declare evidence and cleanup behavior.
5. Generate the workflow agent:

```bash
bun run create recipes/<agent>.json --out ../<agent-name>
```

6. Run generated dependency checks:

```bash
cd ../<agent-name>
utilities/doctor.sh
```

## Processing/evidence convention

Internal processing agents may use:

```text
projects/<job-id>/todo/        raw inputs
projects/<job-id>/in-process/  intermediate files
projects/<job-id>/done/        final outputs before publish
projects/<job-id>/evidence/    metadata/logs only
projects/archive/<job-id>/     evidence after cleanup
```

External processing agents keep the actual files outside the repo and use `projects/<job-id>/evidence/` plus `projects/archive/<job-id>/` for archived evidence only.

After successful external publish, cleanup should remove/trash processing files and preserve evidence only. Evidence is ignored by default.

## Current recipes

- `recipes/image-contact-sheet-workflow.json` — local image folder → HTML contact sheet using an internal tool.
- `recipes/github-issues-triage-workflow.json` — GitHub issues → local Markdown triage summary using an external service.
