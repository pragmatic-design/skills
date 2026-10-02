<!-- Copied from packages/site/content/docs/cli.md by gen-topics.mjs: edit it there. -->

# CLI

The `pdx` CLI is the entry point to the workflow. The key concept to internalize is that
**development and production are two different worlds** (see [The Compiler](compiler.md)): in dev
there's no compilation to wait for, in prod there's a build that optimizes with global knowledge.

## The commands

The CLI is its own package and a **dev dependency**: `@pdxui/framework` does not include it, and
without the install `npx pdx` asks the public registry for a package called `pdx` and gets a 404.

```bash
npm i -D @pdxui/cli   # once per app
npx pdx dev       # interpreted dev server + HMR — your daily loop
npx pdx build     # compiled, optimized build — for production
npx pdx check     # validation + PDX_* diagnostics (no build)
npx pdx new       # scaffold a component/project
npx pdx analyze   # report on bundle and dependencies
npx pdx builder   # component tester + theme builder, on your own components
npx pdx theme     # generate a WCAG-AA theme from a brand color
npx pdx i18n      # extract keys, generate typed keys, validate dictionaries
npx pdx extract   # translation keys → template JSON
```

## pdx dev — develop without a build

```bash
npx pdx dev
```

You wait for no compilation: the runtime interprets `.pdx` on the fly, with hot-reload. Change a
component and see it update instantly. It's by design that development does *not* require a build —
the build is only for production.

## pdx build — production

```bash
npx pdx build
```

Here the compiler knows the whole project and generates the optimized output (inlined bindings,
pre-compiled templates, pre-linked routes, dead code removed). It produces the static artifacts to
serve.

## pdx check — the quality gate

```bash
npx pdx check
```

Runs the **same checks** as the compiler and emits the structured diagnostics (`PDX_*` codes with
hints), without producing a build. It's meant for CI: drop it in the pipeline and block merges that
introduce problems (a `${}` in an attribute, a non-reactive variable used in the template, an invalid
prop type) *before* they reach production.

## pdx new — start fast

```bash
npx pdx new
```

Scaffolds a new component or project following the correct patterns, so you don't start from an empty
file.

## pdx analyze — understand what weighs

```bash
npx pdx analyze
```

Produces a report on bundle and dependencies: useful to see what's growing and where to act (maybe
moving a heavy part behind a `@defer`).

## pdx builder — see and measure

```bash
npx pdx builder --port 5230 --open
```

Serves the [Theme Builder](https://themebuilder.pdxui.com/) against your project: every
component in a chosen theme, scheme and viewport, with contrast, overflow and touch targets
measured on the rendered page. `--host` if you need it reachable from a device.

## pdx theme — generate a theme

```bash
npx pdx theme acme --brand "#6442d6" --language material --out src/themes/acme.css
```

One brand color and an archetype produce a complete, WCAG-gated theme. `--strict` is **on by
default**, so the command exits non-zero when a contrast pair fails AA — it is a CI check as much
as a generator. Full flag list and workflow: [Making a theme](https://pdxui.com/docs/making-a-theme).

## pdx i18n — keys, types, dictionaries

```bash
npx pdx i18n extract                # scan .pdx/.ts for $t() keys → translations/template.json
npx pdx i18n types --locale en      # generate i18n-keys.d.ts so $t() is type-checked
npx pdx i18n validate               # missing/orphan keys per locale + malformed ICU messages
```

`pdx i18n validate --strict-orphans` also fails on keys nobody uses. See [i18n](../../pdxui-i18n/references/i18n.md) for
the runtime side.

**Where it looks for dictionaries**: `translations/*.json`, `locales/*.json` and
`public/locales/*.json`, under the source root and the project root. Anywhere else, say so:
`pdx i18n validate --dicts "i18n/**/*.json"`. When it finds nothing it prints every place it tried.

**A composed key is a prefix, not a key.** `$t('nav.' + key)` and ``$t(`nav.${key}`)`` are read as
the prefix `nav.`: never reported as missing, and every dictionary entry under it counts as used —
so `--strict-orphans` is usable in an app that translates an enum. A prefix that matches no entry
at all is a warning, because at runtime it renders the raw key.

**Two registries, and it tells them apart.** `$t('router.notFound')` renders the raw key:
`router.notFound` belongs to the component string registry, not to your dictionary. `validate`
reports it by name and points at `setLocaleStrings`, instead of counting it as a missing
translation you would then add where nothing reads it.

`pdx extract` is the older standalone form of `pdx i18n extract`, writing to
`src/translations/template.json`. New projects should use the subcommand.
