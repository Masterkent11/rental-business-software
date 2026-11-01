# Westayplace GitHub delivery tooling

This tooling targets only `Masterkent11/rental-business-software` and the existing [Project 3](https://github.com/users/Masterkent11/projects/3). It cannot create a project, push Git changes, assign developers, backdate issues, or reopen completed historical issues.

## Authentication

Install GitHub CLI from the supported Homebrew formula if needed, then authorize it yourself:

```sh
brew install gh
gh auth login --hostname github.com --git-protocol https --web --scopes project
gh auth status
gh project view 3 --owner Masterkent11
```

Repository issue creation needs repository write access. Project fields, views and membership need Project 3 write access and the `project` OAuth scope. Installation does not authenticate the CLI. Complete the browser device flow before publishing; codes expire. Do not put tokens in this repository or paste them into issue descriptions.

## Generate and validate reviewable payloads

From the repository root:

```sh
python3 scripts/agile/manifest.py
python3 scripts/agile/publish.py --validate-only
python3 -m unittest discover -s scripts/agile -p 'test_*.py'
python3 scripts/agile/publish.py --audit-only
python3 scripts/agile/publish.py --configure
```

The last command is a read-only remote dry run. Every command without `--apply` makes no GitHub mutations. The source inventory lives in `manifest.py`; the complete generated issue payloads are in `docs/agile/issues.json`. Source references are checked with `git cat-file`, including the unmerged tenancy commit. Storybook is explicitly planned, not confused with Agile user stories.

## Publish and explicitly backfill

Only after reviewing the manifest and the remote audit:

```sh
python3 scripts/agile/publish.py --apply --configure --backfill-existing --auto-add-probe
```

This creates missing repository issues in parent-first order, links native sub issues through the supported Issues REST API, and explicitly adds missing project items. Existing issues are matched by stable tracking key, an exact reviewed title, or the reviewed reuse mapping for discovery issue 11. Ambiguous matches stop publication. Issue 11 keeps its existing title and original requirement record while receiving the required scope and evidence sections. Existing unrelated bodies are not overwritten.

The historical tasks marked Done represent bounded implementation evidence. They are created and closed at the actual publication time. Historical user story acceptance generally remains In Review. Planned capabilities and the unmerged tenancy branch remain open. Sprint scope is recorded in Historical Period; Iteration values and Story Points remain unassigned because no actual active sprint or estimates were verified. Creating an empty native Iteration field does not establish historical sprint dates.

Single select option identities are preserved. Existing useful fields, views and labels are retained. The audited native workflow changes are recorded in docs/agile/workflows.json. A single qa routing label supports the QA and Bugs union view; existing bug labels are reused. Status values required by the requested delivery workflow are added without deleting existing options. The publisher configures ten named views, reusing Backlog and Roadmap and preserving their original URLs; the existing Estimate field is renamed Story Points without losing its ID. It sets explicit filters, including a historical view that does not exclude closed issues. The original board URL is preserved.

The Auto-add probe uses the legitimate planned Storybook story and its first implementation task, before explicit backfill. It records whether each becomes a project member automatically. The existing discovery issue 11 is also an independent observed example of future Auto-add. Do not toggle working workflows to force a backfill.

Progress is checkpointed atomically in `docs/agile/publication.json`. A failed run can be resumed with the same command. Already created issues and native links are reused; existing different native parents cause a failure instead of being replaced.

## Verify idempotence

```sh
python3 scripts/agile/publish.py --configure
python3 scripts/agile/publish.py --apply --configure --backfill-existing
```

A completed second run must show zero new issues, unchanged unique project membership, correct native parent links, matching project metadata, and zero mutations where no independent GitHub automation or human edit changed the fields. Inspect `publication.json` rather than inferring success from an issue creation response.

GitHub API rate errors are retried with bounded waits. All payloads use JSON over standard input to `gh api`; shell interpolation is not used. Nothing installs a scheduled custom workflow or saves an access token in the repository.

## Reports and final audit

Run `python3 scripts/agile/report.py` after publication to regenerate the metric table, verified issue URLs and remaining limitations. The Database tasks are actual migration-backed work records; they are separate from Backend API implementation. `github-audit.json` is the latest pre-run API snapshot; `initial-github-audit.json` preserves the original one-item baseline.
