<!-- Copied from packages/site/content/docs/compiler.md by gen-topics.mjs: edit it there. -->

# The Compiler

In most frameworks the value lives in the runtime: a library running in the browser that makes your
components work. In PDX the value lives in the **compiler**. The runtime is thin; it's the compiler
that, reading your declarations, *generates* the connecting code. Put differently: the product is the
**declaration → code** transform, not a runtime API to learn.

The practical consequence for you: if you find yourself writing repetitive "connecting code"
(registering a listener to sync a prop, manually propagating an event, remembering to update the
DOM), that's a **framework bug** — that stuff should be born from a declaration.

## What it generates, declaration by declaration

This is the mental table to keep. Here is a whole component — `counter.pdx`, every rune it can
reasonably hold:

```pdx
<template><div>{{ label }} {{ count }} {{ doubled }}</div></template>

<script setup>
@prop label: string = 'Hello';
@event changed: number;

let count = $signal(0);
const doubled = $derived(count * 2);
let prefs = $store({ theme: 'dark' });

function bump() { count++; changed(count); }
function reset() { count = 5; }

@expose bump, reset;
</script>
```

and here is what the compiler emits for it — not a paraphrase, the actual output:

```js
import { component, computed, html, signal, store } from '@pdxui/core';

component('pdx-counter', {
  props: {
    label: { type: String, default: 'Hello' }        // @prop → declared prop + attribute sync
  },
  setup(ctx) {
    const changed = (detail) => ctx.emit('changed', detail);   // @event → the emit function
    const __count = signal(0, { name: 'counter:count' });      // $signal → signal + debug name
    const prefs = store({ theme: 'dark' });                    // $store → reactive proxy, keys
                                                               //          are not signals
    function bump() { __count.set(__v => __v + 1); changed(__count()); }
                                    // count++ became .set(), and `count` as an argument became a read
    function reset() { __count.set(5); }                       // count = 5 → .set(5)

    const doubled = computed(() => __count() * 2, { name: 'counter:doubled' });  // $derived → computed
    ctx.expose({ bump, reset });                               // @expose → the imperative API

    return { count: __count, doubled, prefs, bump, reset, changed };
  },
  render: (ctx) => html`<div>${ctx.label} ${ctx.count} ${ctx.doubled}</div>`,
});
```

Three things to read off it. The variable you declared is now `__count` and every **read** of it —
including the one you wrote as a bare argument — became a call; the **template** reads through `ctx`,
which is why you never write `count()` in markup; and `$store` is the one that is *not* rewritten,
because a store is a proxy and its keys are properties, not signals.

The same holds for the higher-level runes: `@page` generates the route entry and the lazy import,
`@fetch` a typed `resource()`, `@form` a validated form from the schema. In every case the pattern is
identical: *you declare the intent, the compiler writes the wiring.*

## Dual mode: dev interpreted, prod compiled

PDX runs in two modes, and the difference is deliberate.

- **Dev** — everything is **interpreted**. No build to wait for: `pdx dev` loads `.pdx` on the fly with
  HMR. Optimized for the feedback loop.
- **Prod** — the compiler has **global knowledge** of the project (all routes, components, bindings,
  communication) and generates code to measure.

What actually changes between the two:

Every row below is measured, and `packages/showcase/tests/compiler-claims.spec.ts` holds one
assertion per row against a real production build.

| Aspect | Dev (interpreted) | Prod (compiled) | |
| --- | --- | --- | --- |
| Binding | `setProp()` with dispatch | direct inline assignment | **yes** — the default since 1.0.0-alpha; 19 ms → 5.5 ms on a 1500-row mount |
| Router | regex matching | generated switch | **yes**, while no route declares a constraint |
| CSS | injected at runtime | extracted to a stylesheet | **yes** — a route carries its CSS in a `.css`, not in its JS chunk |
| Unread signal | present | removed | **yes** — semantic dead-code elimination, measured on the bundle |
| Template | runtime with placeholders | pre-compiled DOM factory | only for a template with **no interpolation at all** |
| Validation | runtime checks + warnings | stripped | **not implemented.** The validator runs at build time; the runtime warnings ship. Worth 1.9 KB gzipped of 208 |

Route pre-linking and the flattening of single-use components were claimed here and are **not
implemented**: the first is worth a round-trip on the first screen and is planned, the second was
measured at ~1.2% of the bundle in exchange for the element leaving the DOM, and was withdrawn.

### Turning the inline path off

A production build inlines its bindings. The way back to the tagged template is one option:

```ts
// vite.config.ts
export default defineConfig({ plugins: [pdx({ inlineBindings: false })] });
```

It is kept because a second render path that nothing can select is a cost with no way to pay it: if
the inlining is ever wrong for a case, this is the switch. In dev it makes no difference — there is
no build, and the template path is what HMR reloads.

## The first screen, in one round-trip less

A built `index.html` names the landing route's chunk, and the chunks that chunk imports statically:

```html
<link rel="modulepreload" crossorigin href="/assets/dashboard-CMcP70OD.js">
<link rel="modulepreload" crossorigin href="/assets/pdx-icon-CXs78fgR.js">
```

Vite emits those for what it can SEE — and a route is a dynamic import the generated router
resolves, so it sees none of them. The compiler does: the route table is built at compile time,
which is the same table the production router compiles in.

Measured on the showcase: a cold first screen fetched its JavaScript in **three waves** — the entry,
then the route's chunk once the browser had run the entry and learnt of it, then what that chunk
imports. **Two** now, and the round-trip that goes is paid by every first-time visitor.

`/` by default, because that is the URL an app is usually entered at. For an app that lands
somewhere else, or to turn it off:

```ts
export default defineConfig({ plugins: [pdx({ preloadRoutes: ['/dashboard'] })] });   // or []
```

Only the named route's chunk and its static imports are announced. Preloading every route would
make the first screen pay for the whole application, which is what the code splitting was for.

## Structured diagnostics

Compiler errors aren't text strings to interpret: they're `PDX_*` **codes** with a message, a *hint*
and often a suggested *fix*. The same mechanism powers the command-line check, the editor LSP, and the
quick-fixes.

Examples you'll meet:

- `PDX_RAW_INTERPOLATION` — you used `${...}` inside an attribute instead of `:attr=`. Fix: use the
  binding (`:src="x"`).
- `PDX_NON_REACTIVE` — a non-signal variable is used in the template and won't update. Fix: declare it
  with `$signal`.
- `PDX_PROP_INVALID_TYPE` — a `@prop`'s type isn't valid.
- `PDX_LEGACY_IN_SETUP` — `<script setup>` carries a pre-rune marker (`defineProps`, `defineEmits`, a
  top-level `return`), so what you wrote and what the file compiles to disagree. Fix: drop the marker,
  or write a plain `<script>` if the file is deliberately legacy.
- `PDX_UNKNOWN_DECLARATION` — a line opens with a declaration keyword (`@form`, `@page`, `@meta`…) in a
  shape no rule accepts. It is dropped, so nothing is generated for it; the hint carries the shape
  that is accepted.

The point: the compiler doesn't leave you with a cryptic error, it tells you *what* and *how* to fix.

## Why it's also "agent-native"

Because every component has a machine-readable output (a JSON manifest) and diagnostics are structured,
an AI agent can generate a component, read the manifest to verify it, and fix on deterministic
diagnostics — on the first try. It isn't an add-on: it comes from the fact that the compiler is a
*semantic tool*, not just a build step.
