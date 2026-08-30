---
name: Windows Android build path budget
description: Why local Android builds on Windows fail with "Filename longer than 260 characters", and which levers actually buy back characters in this monorepo.
---

The Android native build (CMake + ninja, new architecture) writes one object file per
third-party C++ source. Ninja refuses any path longer than 260 characters. The string it
measures is the object path **relative to the module's `.cxx` build directory**, not the
absolute path — which is why the printed error looks shorter than a full Windows path and
still trips the limit.

That relative path is roughly:

```
<lib>_autolinked_build/CMakeFiles/react_codegen_<lib>.dir/<Drive>_/<project>/<source path under node_modules>.o
```

CMake mirrors the *absolute* source path into the object directory, so every character in
`node_modules/...` is paid twice-over inside an already deep prefix.

**Why:** a plain React Native app has ~85 characters of headroom that this repo does not.
Two structural costs eat it: pnpm's isolated store inserts
`.pnpm/<pkg>_<32-char hash>/node_modules/` (~60 chars) into every dependency path, and the
monorepo nests the app under `artifacts/<app>/` (~25 chars). Upstream libraries test against
vanilla layouts, so a library that builds fine for everyone else can fail here.

**How to apply:** when a `:app:buildCMakeDebug` task fails with
`Filename longer than 260 characters`, do not start moving folders. Measure first —
reconstruct the relative object path for the longest `.cpp` in the offending package and
compare against 260. Then pick levers by payoff:

1. **Upgrade the offending library.** Maintainers fix this by shortening their codegen name
   and C++ directory; the name appears 3–4 times in the path, so a rename buys 70–80 chars in
   one move. Always check the library's issue tracker for a Windows path fix before touching
   this repo's layout.
2. **`virtual-store-dir-max-length` in `.npmrc`.** Caps the `.pnpm` directory names. Already
   set; the floor is ~34 because the 32-char hash is not negotiable.
3. **`node-linker=hoisted`.** Removes the `.pnpm` hop entirely (~60 chars). Expo recommends it
   for React Native, but it changes install semantics repo-wide — only worth it if the cheaper
   levers leave you short.
4. **Enable `LongPathsEnabled` on the machine.** Ninja skips its length guard entirely when the
   registry flag is on, so this removes the ceiling rather than shaving under it. It is
   machine-local, so it cannot be the only fix — anyone else cloning the repo hits the wall again.

Enabling long paths is the user's step; levers 1–3 are the repo's. Fixing only the failing
package moves the failure to the next-longest one, so keep enough headroom for the whole set,
not just the current error.
