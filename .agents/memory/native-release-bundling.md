---
name: Native release bundling in this pnpm workspace
description: Why `expo export:embed` fails from a native release build here, and the two independent things that have to be true for it to succeed.
---

# Native release bundling (`:app:createBundleReleaseJsAndAssets`)

A native release build shells out to `expo export:embed`. Two separate assumptions
break in a pnpm workspace, and the first one masks the second — fixing only one
makes it look like nothing changed.

## 1. The entry path is relative to the wrong directory

React Native's Gradle plugin builds the bundler command line by making every path
relative to `react.root` (default: the Expo app directory), then Metro resolves
`--entry-file` against its *server root*, which Expo computes as the workspace
root. Our entry lives in the hoisted store, so the two disagree by the depth of
the app directory and the build dies with:

```
Unable to resolve module ./../../node_modules/.pnpm/expo-ro_<hash>/.../entry.js
```

**Do not fix this by moving `react.root` to the workspace root.** It looks right
and it fails: the same task uses `root` as the bundler's working directory, and
Expo CLI derives the project root from the working directory. You get
"Could not resolve react-native! Is it installed and a project dependency?"

The fix is on the Metro side, pinning the server root to the app directory for
that one command only. It must stay conditional — applying it unconditionally
breaks the dev server and the web export, which need the workspace root to reach
the shared packages. Symptom of getting that wrong: the Expo web preview 404s on
its entry bundle and renders blank.

## 2. Gradle runs bare `node`, so pnpm's module path is absent

Everything else in this repo reaches `babel-preset-expo` through pnpm's `.bin`
shim, which exports a `NODE_PATH` covering the hoisted store. Gradle invokes
`node <path-to-cli>` directly, with no shim, and Babel resolves presets relative
to the directory of `babel.config.js` — so the preset has to be reachable from
the app directory or the first transform fails with
`Cannot find module 'babel-preset-expo'`.

**Why:** anything a config file in an app directory names by string must be a
declared dependency of that app, not merely a transitive one. Hoisting hides the
omission everywhere except a bare `node` invocation.

**How to apply:** when a native build fails to resolve a Babel preset/plugin, a
Metro transformer, or anything else named as a bare string in config, declare it
in that app's `package.json` rather than reaching for a resolver alias.

## Reproducing without a device or Android Studio

Simulate the Gradle invocation exactly — bare `node`, working directory set to
the app, entry path relative to the app:

```
node <resolved @expo/cli> export:embed --platform android --dev false \
  --entry-file ./../../node_modules/.pnpm/<expo-router-store-dir>/node_modules/expo-router/entry.js \
  --bundle-output /tmp/verify/index.android.bundle --assets-dest /tmp/verify/res
```

Running it through `pnpm exec` instead **hides problem 2**, because that path
gets the shim's `NODE_PATH`. Use bare `node` when the question is whether a real
release build will work.
