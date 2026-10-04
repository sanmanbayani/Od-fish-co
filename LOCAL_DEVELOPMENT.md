Run Locally (USB Debugging)

1. Reverse Ports (Phone plugged in)
Run from anywhere:
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

2. API Server
Directory: Project root
pnpm --filter @workspace/api-server run dev

3. Mobile App
Directory: artifacts\od-fish-mobile

If app is already installed on phone:
cd artifacts\od-fish-mobile
npx expo start
(Press 'a' or tap the app on your phone)

If compiling and installing app for the first time:
cd artifacts\od-fish-mobile
npx expo run:android

4. Web App (Optional)
Directory: Project root
$env:PORT=5173; pnpm --filter @workspace/od-fish-web run dev

Test Login OTP: 123456
