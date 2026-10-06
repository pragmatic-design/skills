# Contributing

Thank you for helping. Where a change goes depends on what it touches.

## A skill's content: open it upstream

Every file under `plugins/` is copied from the repository that maintains it, next to the code it
describes. A change made here is overwritten by the next copy.

| Plugin | Open the issue or pull request in | Folder |
|---|---|---|
| `pragmatic-design` | [pragmatic-design/Pragmatic.Design](https://github.com/pragmatic-design/Pragmatic.Design) | `marketplace/plugins/pragmatic-design/` |
| `pdxui` | [pragmatic-design/pdxui](https://github.com/pragmatic-design/pdxui) | see its `scripts/sync-skills.mjs` |

A good report on a skill names the skill, what the agent did, what the package actually does, and the
package version. "The skill says `X`, the build says `PRAG0000`" is the most useful kind.

## This repository's own files: open it here

The README, `.claude-plugin/marketplace.json`, `scripts/`, and this file.

Before opening a pull request:

```bash
node scripts/check.mjs
```

It needs Node.js and nothing else, and checks:

- every `SKILL.md` against the [Agent Skills specification](https://agentskills.io/specification):
  `name` at most 64 characters, lowercase with single hyphens and equal to its folder; `description`
  present and at most 1024 characters; `compatibility`, when present, at most 500; a warning above the
  500 lines the spec recommends;
- every relative link in every markdown file points at a file that exists (anchors are not checked,
  links inside code are skipped);
- each plugin's `name` and `version` are the same in its `plugin.json` and in `marketplace.json`;
- the README catalog matches the skills' frontmatter.

The catalog is generated: edit a skill's `description` upstream, then run
`node scripts/check.mjs --write` here after the copy. A skill added upstream must also be placed in a
catalog group in `scripts/check.mjs`, or the check fails.

## Releasing a copy

1. Copy the plugin from its source repository (for `pdxui`, its `scripts/sync-skills.mjs`).
2. Raise the plugin's `version` in `plugins/<plugin>/.claude-plugin/plugin.json` and in
   `.claude-plugin/marketplace.json` together: an installed copy updates only when it moves.
3. `node scripts/check.mjs --write`, then commit.
