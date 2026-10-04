# Gotchas `.pdx` / PDX UI

Traps learned while building the golden app and the **profiler** admin (`Pragmatic.Design.Builder/profiler/app`).
Read this BEFORE writing any `.pdx`: every entry cost real debugging.

> **Reconciled with the framework on 2026-09-08** (PDXUI-106). This file was written against pdx 1328, and
> eight of its eleven flagged entries described defects that were gone, or were never what it said — so it was teaching
> workarounds for bugs that no longer existed. Those entries are gone.
>
> Every remaining 🔴 / ⚠️ is measured, carries the issue that tracks it, and has a test in
> `packages/responsive/tests/integration/ui-components/skill-claims.spec.ts` that fails the day the framework
> changes. **Do not add an entry here without one**: an unverified warning ages into a lie, and this file is
> read before every `.pdx` anyone writes.

## Template reactivity
- **A signal appears in the template only inside an expression or a wrapper function**, never as a bare identifier:
  `@if (open())` and `:class="x > 0 ? 'a' : 'b'"` are fine; `{{ signalBare }}` or `@if (signalBare)` → a ReferenceError.
  **An import is not on `ctx`**: a signal imported and used in the template makes the component throw at mount
  (`ctx.X is not a function`); a function imported and used in `@click` throws the same when clicked, and nothing
  happens. Bring it into the `<script setup>`: a **function** as `const goTo = go` or a wrapper function; a **shared
  signal** as `const user = $derived(shared())`, then `{{ user.name }}` follows it. Not `const user = shared()` —
  a snapshot that never updates — and not `const user = shared` read as `{{ user.name }}`, which renders "read",
  a property of the signal function. (Measured, PDXUI-166.)
- **The name `error` is forbidden** for a signal (the compiler does not rewrite it) → use `errMsg`.

## Binding & DOM
- 🔴 **`pdx-app-layout` knows exactly four regions**: `data-region="header" | "navbar" | "aside" | "footer"`.
  Everything **without** a `data-region` is wrapped in a generated `<main class="pdx-app-main">`. There is **no
  `content` region** and no `sidebar` (the left one is `navbar`). A child carrying an unrecognised `data-region`
  gets neither treatment: skipped by the four, skipped by the `main` wrap, it **drops out of the layout in
  silence** — no class, no `grid-area`, no warning. [PDXUI-113]
- **A controlled `:value` plus an `@input` over the same signal** on a `<pdx-input>` → the input is recreated on every keystroke → and it loses
  focus. The answer: an **uncontrolled** input (`@input` alone to read it; no `:value` coming back). This does **not** apply inside
  `<pdx-form :form>`: there the compiler wires named controls itself and gives text controls no `:value` — see the recipe
  "A long form filled in more than one sitting".
- **Props that collide with a read-only DOM property**: do NOT use `:prefix` on a custom element
  (`Element.prefix` is read-only → a TypeError). Put the value somewhere else (in the `value`, for instance).
- 🔴 **Two components that declare the same `@event` name corrupt the parent's state, in silence.**
  Component events bubble, so a child's `changed` reaches a listener put on its grandparent for a
  DIFFERENT `changed`. Measured in a lab run: `pdx-unit-field` declared `@event changed: number`,
  `pdx-room-rows` declared `@event changed: any`, the parent listened for `@changed` on
  `<pdx-room-rows>` — and the field's number landed in `rooms`, giving
  `TypeError: (rooms ?? []).reduce is not a function` from inside the framework, a section that
  emptied itself, and an acceptance check failing with "cannot type into the fields" because the
  fields were gone. **Nothing warns, and nothing should**: two components declaring the same event
  name is legal. `changed` is the most natural name there is, which makes it the collision that
  does the most damage. Name events so they are greppable and cannot collide —
  `valuechanged`, `roomschanged` — the same rule this repository applies to its own identifiers.
  `.self` on the listener stops the bubble, but only once you know to suspect it. [PDXUI-450]
- **A bound `:src` with a `data:image/svg+xml` URL is dropped, by design** — an SVG opened as a
  document runs its script. `sanitizeMediaUrl` accepts http(s), relative URLs, `blob:` and
  `data:image/{png,jpeg,gif,webp,avif}`; everything else becomes `null` and the attribute is not
  written. In dev it says so once per element and attribute. Two asymmetries worth knowing:
  a **static** `src="data:image/svg+xml,…"` in the template is **not filtered at all** (the
  sanitiser runs on BOUND attributes), and **`blob:` passes** — `URL.createObjectURL(file)` is how
  you preview a file the user just picked. For an inline SVG icon use `pdx-icon`, or a
  `blob:` URL from a Blob you build yourself. [PDXUI-450]
- **A `:prop` that is a JSON string** (`pdx-chart`'s `series-config`, `filter-mode`, and so on): pass a **string**
  (`JSON.stringify(...)`), not an object (the component calls `JSON.parse`).

## Design system and tokens
- The real tokens are **`--pdx-color-*`** (bg, surface, text, muted, border, primary, -primary-text, -primary-hover, danger,
  success, info, warning, subtle), plus `--pdx-space-*`, `--pdx-shadow-sm/md/lg/xl` and `--pdx-radius-*`. NOT `--ink` or `--surface`.
  Never a hardcoded fallback (they break dark mode). The theme goes on `<html>` through `pdx-theme`, the scheme through `pdx-scheme`.
- **A `.pdx` scoped style does NOT reach light DOM created at runtime** by a component (a data-grid cell built through
  `column.format`, say). Use a **global** stylesheet (imported in index.html) for those classes.
- To centre an icon inside a button: `pdx-icon { display:block; line-height:0 }`.

## Routing / guard
- No global `effect` that reads `currentPath()` and calls `navigate()` (it loops). Guard **per route** in the
  `<script setup>` (a `requireAuth()` that calls `navigate('/login')` when not authenticated). Condition the **chrome** on the
  ROUTE (`currentPath() !== '/login'`), not on `authed()` (authentication resolves asynchronously).
- "Leaving loses the unsaved work": that is not a per-route guard, it is `onBeforeNavigate` from
  `@pdxui/router`, asked before every navigation, Back included. The recipe "Do not leave with unsaved
  work" wires it to a `pdx-alert-dialog`, and adds `beforeunload` for the tab being closed.
- Full-height pages (a list that does not scroll): the outlet has to propagate the height
  (`.content > pdx-router-outlet { height:100% }`), and the page needs `height:100%; display:flex; flex-direction:column`.

## DataSource (data-bound)
- The pattern done properly: one shared **explicit DataSource** — `createDataSource({ data, pageSize })` (or
  the declarative `<pdx-data-source url=…>`) passed to the `:source` of the grid, of `pdx-filter-builder` and of `pdx-pagination`.
  `:data="array"` is a shortcut (it auto-wraps, pageSize 0) and fine for simple cases, but `:source` is backend-ready
  (swap `data` for an HTTP `transport` and the UI does not change at all). For paging: `pageSize > 0` on the source.
- **A grid feeds the source's selection only if the source keeps one.** `createDataSource({selection:
  {mode:'multiple'}})` → ticking a row updates `ds.selected()`, `ds.selectedCount()` and
  `ds.selectedItems()`, and the source's extras (cross-page `selectAll()` over the current filter,
  `persistKey`) apply to what the user actually ticked. **Without that option the source stays empty by
  design** — it never asked for selection state — and the grid's own `pdx-selection-change` /
  `el.getSelectedIds()` are the way to read the selection. Pick one: opt the source in, or read the
  grid. (PDXUI-114)
- ⚠️ **The grid's imperative API is FLAT on the element, not under `__dataGrid`.** That property does not
  exist (measured: `undefined`) — this file used to send you there, and you would have got `undefined` and
  concluded the grid has no selection API. Everything `ctx.expose()` publishes lands on the host:
  `el.getSelectedIds()`, `el.clearSelection()`, `el.startEdit(...)`, and the rest.

## Forms: data-driven editing (auto-form and form-template)
- **`pdx-form-template` binds the form's value to the control ONLY at build time** (it reads `field.value()` once), not
  reactively: a `form.reset(record)` AFTER the build does NOT update the controls. → load the record BEFORE building the
  template. For a reusable edit fly-out or dialog: **rebuild** the form on every opening
  (`createFormFromSchema(schema)` → `form.reset(row)` → create a `<pdx-form-template>` around that form). [a framework gap]
- OBSOLETE. *Was:* "`pdx-auto-form` exposes its API on `ctx`, not on the element, and a numeric `record-id` is
  never found". **No longer true** — `el.form`, `el.getValues()`, `el.reset(values?)` and `el.validate()` are on the
  element (`ctx.expose`), and `record-id="1"` finds `{ id: 1 }` (PDXUI-370). `getValues()` answers `undefined` until
  the form is built, a frame after it connects. `pdx-form`'s own `record-id` still misses a numeric id (PDXUI-768).
- **A component's prop setters are installed in `connectedCallback`**: on an element created through
  `createElement` but not yet in the DOM, `el.myProp = x` throws *"only has a getter"*. Set the object props
  (`schema`, `form`) AFTER the `appendChild`, inside a `requestAnimationFrame` (which is what the auto-form does internally).
- A backend-ready save: read `form.getValues()`, then `ds.update({...existing, ...values})` followed by `ds.sync()`
  (the `arrayTransport` implements `update` and `batch`; tomorrow it is just a swap to an HTTP transport). `ds.update` tracks the
  change and `_viewData` (a computed) reflects it in the grid at once; `sync()` persists it.

## Overlays, drawers and modals
- **A real modal without depending on a component**: a plain-DOM overlay on `<body>` (a `position:fixed inset:0` backdrop plus a
  centred box) is the most robust pattern for a confirmation dialog or an editor (`grid-delete.ts confirmDialog`, the JSON editor).
- **Toasts**: `import { toast } from '@pdxui/ui/toast'` (`toast.success`, `toast.error`, and so on) plus a `<pdx-toast position="top-right">`
  in the shell. Use it for a save's success and error instead of inline messages.

## Data-grid: the empty state and the source
- **Clickable rows** (they open the editor): `pdx-data-grid [role="row"]:has([role="gridcell"]) { cursor: pointer; }` (in the global CSS).

## Components: runtime dependencies
- Components that create children at runtime through `createElement('pdx-x')` (`pdx-data-grid` → select, number-input and
  date-picker for its filters) register their own dependencies; but the **compiler's auto-import registers only the
  tags written statically in the template**. If you use a component only through its API, import it explicitly.

## A project's own reusable `.pdx` components
- A `.pdx` under `src/**` is registered automatically as a component; its **tag** comes from `@tag 'name'` or from the filename
  (`list-header.pdx` → `<pdx-list-header>`). Props come from the **`@prop name: type = default`** rune (read bare in the template).
  Types map to the runtime like this: `T[]`→Array, the primitives→their counterparts, **everything else (any, object, functions)→Object**.
- The robust pattern for reuse: a partial is **pure markup** with `data-*` hooks; the logic (the events, the buttons) is wired by a
  **TS service** in `onMount` (`querySelector` plus `addEventListener`) — which avoids function props, `.pdx` events, and the
  custom-event reactivity gotcha. Put a partial's CSS in a **global stylesheet** (scoped styles do not cross the route↔partial boundary).

## Password manager (LastPass/1Password)
- `pdx-input` SUPPRESSES password managers by default; they come back with a credential `autocomplete` (username, email, *-password,
  one-time-code) or with `type=password`. LastPass in 2026 ignores `data-lpignore`: to hide its icon, use
  `visibility:hidden` on `div[data-lastpass-icon-root]` (plus a `:has()` to bring it back on the credential fields).

## Retired — fixed in the framework, still present in the older apps

Kept for one reason only: `Pragmatic.Design.Builder/golden` and `profiler` still carry the workarounds
these lines used to prescribe, and both are pointed at as reference apps. Copying a workaround from
them re-introduces code that fights a framework which no longer has the bug. Measured on 2026-09-08
(PDXUI-106); the assertions live in `skill-claims.spec.ts`.

- OBSOLETE. *Was:* "adding a NEW `.pdx` component means restarting the dev server". **Fixed in the framework**
  (PDXUI-112): the plugin watches for a `.pdx` appearing, rescans, and reloads the page so the new tag resolves —
  and says so on the console (`[pdx] new component x.pdx — reloading…`), because being silent was half the
  defect. Verified on a running server: the element goes from undefined to rendered without a restart.
  Re-measured on 2026-09-10 after a report that the new file was served as an empty stub (`props: {}`, no
  setup) and its edits ignored (PDXUI-160): **not reproduced**. Three ways of creating the file were tried, on
  the server and in Chromium with HMR on, and each served and rendered the real component, then its edits:
  written in one go, created empty and then filled, and created as a bare `<template>` and then replaced.
  `compiler/tests/dev-server-late-component.test.ts` keeps that repro. Two watcher facts, true of ANY file and
  not specific to new ones: a save that lands within 50 ms of the previous one is not reported (chokidar
  throttles `change`), and a file written while the server is still scanning `src/` at startup produces no
  `add`. If you do see the stub, capture the response of the module's URL, the Vite version and how the file
  was created: that is the difference the repro is missing.
  **Update 2026-09-18 (PDXUI-448)**: one shape of it WAS reproduced. A `.pdx` that is empty or only
  whitespace when the server reads it — a save caught in flight, the editor having truncated the file and
  not yet written it back — was served as three bytes of whitespace: HTTP 200, no component, nothing in the
  console and nothing in the log. That is the lab's `Content-Length: 3`. It now raises **`PDX_EMPTY_SOURCE`**,
  which Vite shows as an overlay and logs, and the plugin re-reads the file once before raising, so a write
  still in flight simply compiles. If you see that error on a file you know has content, you caught the save:
  save again. Outside the dev server the same blank source compiled to a component that REGISTERED and
  rendered an empty `<div>` — indistinguishable from one that legitimately draws nothing.
- OBSOLETE. *Was:* "an active transform on the open panel makes it a containing block, so clear it with
  `panel.style.transform = 'none'` once the slide is done". **Fixed in the framework** (PDXUI-111): the four open
  states rest at `transform: none` instead of `translateX(0)`, so a `pdx-select` dropdown, a tooltip or a popover
  inside an open drawer is positioned against the viewport again. Measured: the dropdown moved from left 1826 to
  925 on a 1280 viewport. Do not clear the transform by hand — and do not set one on the panel yourself, or the
  trap comes back.
- OBSOLETE. *Was:* "setting a signal inside a CUSTOM event's handler does not update the template". **No longer
  true** — measured 2026-09-08 twice: a `CustomEvent` dispatched from outside any handler, and a component's own
  `@pdx-change`. Both update `{{ }}` **and** flip an `@if`. Write the handler normally; do not drive the DOM by hand.
- OBSOLETE. *Was:* "never put `:class` on a `data-region` element of `pdx-app-layout`". **No longer true** —
  measured: `:class="x"` on the header leaves `class="x pdx-app-header"` with `grid-area: header` intact. It merges.
- OBSOLETE. *Was:* "`pdx-select` does NOT reflect the choice onto `.value`, keep it in `el.__val` yourself".
  **No longer true** — `reflectValue()` writes the selection back: after picking, `el.value` IS the chosen value
  (single → scalar, `multiple` → an **array**). Read `el.value`. Do **not** copy `select-fix.ts` from the profiler
  app: it is a workaround for a bug that is fixed. The event carries it too: `e.detail.value` single,
  `e.detail.values` with `multiple`.
- OBSOLETE. *Was:* "a `pdx-drawer` does NOT open when you set `.open = true` from JS". **No longer true** —
  `el.open = true` sets `[data-open]` on the panel and the backdrop and slides it in at the `position` you asked
  for. Do not drive `[data-open]` by hand and do not copy `position`/`size` onto the panel yourself.
- OBSOLETE. *Was:* "inside an app-layout the drawer stays under the chrome; reparent it onto `<body>` yourself".
  **No longer true** — the component portals itself, and only when an ancestor actually traps fixed positioning
  (a transform, a filter, `contain`). Measured inside `pdx-app-layout`: nothing paints over the open panel.
  Reparenting by hand is now actively harmful — it detaches slotted content from its scoped styles and
  reconnects child components.
- OBSOLETE. *Was:* "the drawer's own X emits `pdx-close` but does not close it". **No longer true** — measured:
  clicking the X sets `open` to false, drops `[data-open]`, and still emits `pdx-close` once. Listen to the event
  if you need to know; you do not need to close it yourself.
- OBSOLETE. *Was:* "a static `createDataSource({data})` does not render the rows; use a fake transport". **No
  longer true** — measured: three rows in, six cells rendered. Use a transport when the data comes from a server,
  not to work around this.
- OBSOLETE. *Was:* "the 'No data' message ends up at the bottom". **Not what happens** — measured on a 420px grid,
  the empty block sits slightly ABOVE the middle (the header takes the top). Not perfectly centred, but nowhere near
  the bottom, and the global `flex: 999 1 auto` override is not needed.
