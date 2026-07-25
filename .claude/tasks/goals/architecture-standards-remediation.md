# Goal: Architecture Standards Remediation

Status: done

Bring the codebase into compliance with the project's architectural rules (service layer for data fetching, barrel-file imports, shared `/lib` utilities, Next.js best practices) — surfaced by a full-codebase `/qc` audit — without changing user-facing behavior.

## Tasks
- [x] .claude/tasks/data-fetching-service-layer.done.md
- [x] .claude/tasks/shared-utils-extraction.done.md
- [x] .claude/tasks/component-barrel-files.done.md
- [x] .claude/tasks/nextjs-practice-fixes.done.md

## Plan
1. **Data fetching service layer** — move all raw `fetch()` calls out of components/hooks/contexts into `src/services`. Done first because it's the highest-value, most self-contained change and other steps don't depend on it.
2. **Shared utils extraction** — move the 35+ embedded pure helpers into `src/lib`, deduping the copy-pasted ones. Done second so the file layout (`src/lib`, `src/services`) is settled before barrel files are added for those directories.
3. **Component barrel files** — add `index.ts` barrels to every component folder plus `src/lib`, `src/hooks`, `src/services`, and fix deep imports codebase-wide. Done third since it touches import statements across nearly every file — sequencing it after 1 and 2 avoids fixing the same import twice.
4. **Next.js practice fixes** — home page Server/Client split, admin page metadata, raw `<img>` → `next/image`. Done last: smallest, least entangled with the others, lowest risk.
