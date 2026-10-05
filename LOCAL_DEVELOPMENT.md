# Local Development — USB Debugging

---

## Prerequisites

| Tool            | Version                          |
| --------------- | -------------------------------- |
| Node.js         | v18+                             |
| pnpm            | v10.26+                          |
| ADB             | via Android Studio               |
| Java JDK        | 17                               |
| Android SDK     | API 34+                          |

---

## Device Setup (one-time)

```powershell
# Verify device is connected
adb devices
```

> Phone: Settings → About → tap Build number ×7 → Developer options → USB debugging ON

---

## Environment Setup

```powershell
# Project root
pnpm install

# Create .env (set DATABASE_URL, SESSION_SECRET, NODE_ENV=development)
copy .env.example .env
```

---

## Run

### 1. ADB Reverse (re-run after every re-plug)

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

### 2. API Server

```powershell
# Dir: project root
pnpm --filter @workspace/api-server run dev
```

### 3. Mobile App

**App already installed:**

```powershell
# Dir: artifacts\od-fish-mobile
npx expo start
```

**First-time build:**

```powershell
# Dir: artifacts\od-fish-mobile
npx expo run:android
```

### 4. Web App (optional)

```powershell
# Dir: project root
$env:PORT=5173; pnpm --filter @workspace/od-fish-web run dev
```

---

## Quick Reference

| Service    | Directory                  | Command                                                          | Port |
| ---------- | -------------------------- | ---------------------------------------------------------------- | ---- |
| ADB        | *any*                      | `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3000 tcp:3000` | —    |
| API        | project root               | `pnpm --filter @workspace/api-server run dev`                    | 3000 |
| Mobile     | `artifacts\od-fish-mobile` | `npx expo start` / `npx expo run:android`                        | 8081 |
| Web        | project root               | `$env:PORT=5173; pnpm --filter @workspace/od-fish-web run dev`   | 5173 |

---

## Test Login OTP: `123456`

---

## Troubleshooting

| Problem                        | Fix                                                                  |
| ------------------------------ | -------------------------------------------------------------------- |
| `adb devices` → unauthorized   | Revoke USB auth in Developer options, re-plug, accept prompt         |
| Metro can't connect            | Re-run `adb reverse`, verify with `adb reverse --list`               |
| Gradle build fails             | Check `JAVA_HOME` → JDK 17, `ANDROID_HOME` set, API 34+ installed   |
| App shows network error        | API running on :3000? `adb reverse` active? Check mobile `.env`      |
