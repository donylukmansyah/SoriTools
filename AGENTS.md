# AGENTS.md

## Project shape
- Adobe CEP extension for After Effects, not bundled app. `CSXS/manifest.xml` targets host `AEFT` and loads `panel/index.html` plus `panel/jsx/main.jsx`.
- UI/runtime entrypoint: `panel/js/app.js`; AE ExtendScript logic: `panel/jsx/main.jsx`; CEP bridge shim: `panel/js/csinterface.js`.
- `package.json` has no scripts. Only dependency is `sweetalert2`; `panel/index.html` loads it directly from `node_modules`.
- `presets/` contains real `.ffx` assets used by import/apply flows. Do not treat as generated junk.
- `tmp/` stores debug/restore state files from ExtendScript, including boost/effects state. Debug logging toggles via `tmp/debug-enabled.txt` or `SORI_TOOLS.DEBUG = true`.

## Commands / verification
- Install dependency: `npm install`.
- No repo lint, typecheck, test, build, formatter, or codegen commands are defined.
- Meaningful verification requires loading this directory as an After Effects CEP extension and exercising affected panel buttons/preset flows.
- Browser preview can open `panel/index.html`, but AE calls fail through `panel/js/csinterface.js` with `After Effects bridge is only available inside CEP.`

## CEP / AE wiring quirks
- `app.js` calls `loadJsx(true)` on DOM ready; every `callAe`/`callAeQuiet` runs through `wrapAeScript`, which re-`$.evalFile`s `panel/jsx/main.jsx` before executing requested code.
- AE-facing functions should return `SORI_TOOLS.respond(ok, message, data)` JSON strings; undefined results become success `Done.` in `wrapAeScript`.
- Use `callAeQuiet` for background/progress operations where UI toast should not fire on every response.
- `resolveJsxPath()` depends on `cs.getSystemPath("extension")`, with file URL fallback only for preview.
- `CSXS/manifest.xml` enables Node/file access flags; changing paths or script names must keep CEP resource wiring aligned.

## Style / compatibility
- Code is plain ES5-style JavaScript/ExtendScript: `var`, function declarations, no modules, no build step.
- Avoid modern JS syntax in `panel/jsx/main.jsx`; After Effects ExtendScript is old and may not support it.
- Preserve direct script/style cache-busting query strings in `panel/index.html` when changing referenced files.
- Keep panel state compatible with `localStorage` key `sori.tools.state.v1`; `loadState()` still migrates old flat `presets` format.
