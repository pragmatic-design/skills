<!-- Copied from packages/site/content/docs/devtools.md by gen-topics.mjs: edit it there. -->

# DevTools

PDX has no virtual DOM and no hidden magic, so debugging is mostly "read the signal, read the
generated code". For the rest there's an in-browser overlay and a console namespace that let you see
the live component tree, every signal's value and subscriber count, and a trace of what changed.

## The overlay

In dev, the compiler injects DevTools automatically (a small **PDX** badge, bottom-right). Open it
with the badge or **Ctrl + Shift + D**. Three tabs:

- **Components** — the live tree of mounted `pdx-*` elements with their attributes.
- **Signals** — every registered signal: name, current value, and how many subscribers it has
  (a signal with 0 subscribers is dead weight; a surprising count hints at an over-wide dependency).
- **Trace** — enable it to record each signal write and effect run, in order — the timeline of a
  reactivity bug.

It only ships in `pdx dev`; `pdx build` strips it, so there's zero cost in production.

## The console namespace: `__pdx_debug`

The overlay reads from a global you can use directly in the console:

```js
__pdx_debug.signals()        // [{ name, value, subscriberCount }, …]
__pdx_debug.effects()        // active effects
__pdx_debug.componentTree()  // the mounted tree
__pdx_debug.trace(true)      // start recording; trace(false) to stop
__pdx_debug.traceLog()       // the recorded entries
```

Handy when you want to script a check or grab state at a breakpoint.

## Naming things for readability

Signals declared with `$signal` carry a debug name derived from the variable, so they show up as
`count`, `user`, … in the inspector — not `anon`. That naming is automatic; you get readable output
for free.

## Manual init (rare)

If you embed PDX without the compiler (the CDN path) and still want the overlay:

```js
import { initDevTools } from '@pdxui/core/devtools';
initDevTools();   // adds the badge, the Ctrl+Shift+D shortcut and __pdx_debug
```

## Gotchas

- **Dev only.** Don't call `initDevTools()` in production builds — and the Vite plugin won't inject it
  there either. The overlay escapes app-controlled values when rendering them, but it's still a
  debugging surface, not a shippable feature.
- **Trace is opt-in** because recording every write has a cost. Turn it on around the interaction
  you're debugging, then off.
- A signal with a **0 subscriber count** that you expected to drive UI usually means you snapshotted
  it (`const v = sig()`) instead of reading it reactively in the template.
