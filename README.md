# Pragmatic.Design — agent skills

Skills that teach a coding agent to build line-of-business applications with Pragmatic.Design. Two
plugins, installable one without the other:

| Plugin | For |
|---|---|
| `pragmatic-design` | .NET applications with the [Pragmatic.Design](https://github.com/pragmatic-design/Pragmatic.Design) packages: which packages to reference, how to lay out the solution, the attributes of each module, the traps, and how to verify the result |
| `pdxui` | Web UIs with [PDX](https://pdxui.com) (`@pdxui/*`): the `.pdx` language, its 117 components, screen composition and theming |

They are written for a **consumer project** — an app that uses the packages — and need no access to
the frameworks' source.

Each skill is a folder with a `SKILL.md` in the [Agent Skills](https://agentskills.io/specification)
format, so the same folders work in Claude Code, in Codex and in any agent that reads that format.

## Install

### Claude Code

```bash
claude plugin marketplace add pragmatic-design/skills
claude plugin install pragmatic-design@pragmatic-design   # .NET
claude plugin install pdxui@pragmatic-design              # PDX web UI
```

Skills are then called by the agent when a task needs them, or by name:
`/pragmatic-design:pragmatic-new-app`, `/pdxui:pdxui`.

### Codex

```bash
codex plugin marketplace add pragmatic-design/skills
codex plugin add pragmatic-design@pragmatic-design   # .NET
codex plugin add pdxui@pragmatic-design              # PDX web UI
```

Start a new session after installing. `$` followed by a skill name calls one explicitly.

### Any other agent

Copy the folders under `plugins/<plugin>/skills/` to where your agent loads skills from — for
example `.agents/skills/` (Codex, per project), `~/.agents/skills/` (Codex, every project) or
`.claude/skills/` (Claude Code, per project). The folders need no change, but copy a plugin's folders
all together: in `pragmatic-design` the module skills link to references kept in
`pragmatic-ecosystem`, and in `pdxui` the area skills send the reader back to `pdxui`.

## Where to start — .NET (`pragmatic-design`)

| Skill | For |
|---|---|
| `pragmatic-new-app` | Scaffolding a new application |
| `pragmatic-architecture` | Splitting an application into libraries, modules and databases |
| `pragmatic-choose-modules` | Choosing the packages for a feature |
| `pragmatic-ecosystem` | The reference behind the others: packages, patterns, diagnostics, recipes |
| `pragmatic-nuget-feed` | The local NuGet feed the alpha packages come from |

Then one skill per module, `pragmatic-use-*`, loaded when a task reaches it: actions and endpoints,
persistence, composition, identity, authorization, delegation, multi-tenancy, events, messaging, jobs,
caching, configuration, feature flags, resilience, logging, temporal, i18n, storage, documents, email,
notifications, imaging, audit, privacy, migrations, testing, client, traits, distributed, and the
foundation libraries. The folder list under `plugins/pragmatic-design/skills/` is the complete set.

## Where to start — PDX web UI (`pdxui`)

| Skill | For |
|---|---|
| `pdxui-language` | The `.pdx` language and how a project is wired: read it before writing any `.pdx` |
| `pdxui` | The component catalogue by area, screen recipes and the gotchas: open it before building any UI piece |
| `pdxui-screens` | Composing a screen that reads as a product: grid or cards, the shell, empty and error states |
| `pdxui-theme` | Branding: a WCAG-AA theme from one brand colour, the shipped themes, the tokens |

Then one skill per group of components, `pdxui-<area>` — layout, navigation, data, forms, inputs,
overlay, display, infra — with a page per component: its props, events, slots and API, the examples of
its demo, and for the complex ones when to use it and where it goes wrong.

And one skill per topic that no single component covers, with the site's docs pages as references:

| Skill | For |
|---|---|
| `pdxui-data-layer` | Loading, writing and sharing data: `@fetch`, mutations, `@store`, provide/inject |
| `pdxui-validation` | Forms and their rules: schemas, cross-field rules, field arrays, several forms under one save |
| `pdxui-routing` | Pages, guards, loaders, layouts, keep-alive, the tab title and scroll |
| `pdxui-i18n` | Translations and locale formatting, and translating the components' own strings |
| `pdxui-setup` | Installing, the `pdx` CLI, the production build, devtools |
| `pdxui-testing` | Component tests, the signed-in user and permissions |

The `pdxui` skills are generated and tested in the PDX repository, next to the library they describe,
and copied here with its `scripts/sync-skills.mjs`. Change them there, not here.

## Updates

Each plugin's `version` is in `plugins/<plugin>/.claude-plugin/plugin.json` and in its marketplace
entry, and changes with every release of its skills: an installed copy updates only when it does. In
Claude Code run `claude plugin update <plugin>@pragmatic-design`, or turn on auto-update for the
marketplace in `/plugin`.

## Local development

From a checkout, without installing anything (Claude Code):

```bash
claude --plugin-dir ./plugins/pragmatic-design
claude --plugin-dir ./plugins/pdxui
```

Or register the checkout as a marketplace — `claude plugin marketplace add .` or
`codex plugin marketplace add .` from this directory — and install as above.

## License

The skills are [MIT](LICENSE). They describe packages licensed separately: see
[Pragmatic.Design's licensing](https://github.com/pragmatic-design/Pragmatic.Design/blob/main/docs/LICENSING.md)
for what applies to the packages themselves.
