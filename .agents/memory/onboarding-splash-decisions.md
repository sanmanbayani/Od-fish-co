---
name: Onboarding & splash decisions
description: Why the consumer first-run looks the way it does, the native/in-app splash coupling, and the image-generation limits hit while making it.
---

# Onboarding & splash decisions

- The user rejected the illustrated, copy-heavy, mint-glow first run as "AI slop". The bar is Zepto/Blinkit/Instamart/Licious: photography, one 2–5 word headline + one ~12-word line per slide, no kickers/bullets, no glow, no bounce.
  **Why:** user's explicit feedback. **How to apply:** any later pass on login or shop screens should match this restraint, not reintroduce decorative motion or brand-colour accents.
- The native splash (app.json `splash` + `expo-splash-screen` plugin) and the in-app overlay must stay identical: same ink background, same mark, same width (plugin `imageWidth` == overlay constant). Change one, change both, or launch shows a jump.
- Image generation only returns 1024×1024, even at high resolution and with "9:16" in the prompt. Outpainting a padded portrait canvas via image editing came back squashed or unchanged, so it can't be relied on. Use square sources with cover-crop and keep the photo height capped by width so the upscale stays modest.
- Mobbin is connected but its tools weren't exposed to the session; references came from known app patterns.
