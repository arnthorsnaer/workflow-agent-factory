# workflow-agent-factory — Agent Operating Guide

This repository creates workflow-agent directories: repeatable LLM-operated workflows with explicit dependencies, tools, processing rules, evidence, cleanup, git hygiene, and optional internal tooling.

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

The only useful distinction is whether each dependency is owned by the repo or expected to exist outside it.

## Hard boundaries

- Never commit credentials, tokens, API keys, cookies, local service config, or real environment files.
- Never commit files being processed by a generated workflow agent.
- Evidence/archive data is ignored by default because it may contain private paths, titles, URLs, release names, or decisions.
- Generated agents should commit only workflow instructions, internal tooling, templates, checked-in profiles/configs, and sanitized examples.
- Preserve user-created source agents unless explicitly replacing them after approval.

## Standard workflow

1. Capture the workflow as a JSON spec.
2. Declare all dependencies explicitly.
3. Declare where files being processed live:
   - `internal`: under the generated repo, e.g. `projects/<job-id>/todo`.
   - `external`: outside the repo, e.g. `~/Downloads/incoming`.
   - `mixed`: both.
4. Declare evidence and cleanup behavior.
5. Generate the workflow agent:

```bash
bun run create examples/<agent>.json --out ../<agent-name>
```

6. Run generated dependency checks:

```bash
cd ../<agent-name>
scripts/doctor.sh
```

7. Compare a generated agent to an existing agent when iterating:

```bash
bun run compare ../existing-agent ../generated-agent
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

## Current example specs

- `examples/video-fetcher-agent.json` — external processing in `~/Downloads/incoming/`, local ignored evidence only.
- `examples/stl-to-gcode-agent.json` — internal `projects/<id>/todo|in-process|done` processing, plus copied internal tools/profiles from the existing STL agent.
