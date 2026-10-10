---
name: Expo Go needs offline mode here
description: Why the mobile dev script runs Expo with EXPO_OFFLINE=1, and what breaks if it is removed.
---

Once app.json has `owner` and `extra.eas.projectId` (the EAS link), Expo Go asks the dev server for a signed manifest. With nobody logged in, the CLI stops at an interactive "log in or proceed anonymously" prompt that a workflow can't answer. The phone then shows "Something went wrong", even though the bundle builds and the web preview works.

**Why:** the dev script keeps `EXPO_OFFLINE=1`, so the server sends unsigned manifests and never prompts. The EAS link stays, because the user builds with it.
**How to apply:** don't drop `EXPO_OFFLINE` or remove owner/projectId to "fix" this. To check, send a manifest request with an `expo-expect-signature` header; it should return 200 in under a second. A plain curl without that header passes even when the bug is present.
