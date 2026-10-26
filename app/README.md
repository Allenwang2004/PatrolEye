# app：PatrolEye 手機 App（Expo）

還沒建立。照 `docs/v2/APP_BACKEND_TODO.md` 第 4 節。create-expo-app 要空資料夾，建立前先把這份 README 刪掉（內容都在待辦裡）：

```bash
rm app/README.md
npx create-expo-app@latest app      # 在 repo 根目錄執行
cd app
npx expo install expo-camera expo-video react-native-svg react-native-gesture-handler @react-native-async-storage/async-storage react-native-url-polyfill
npm i @supabase/supabase-js
npx expo start                      # 手機開 Expo Go 掃 QR
```

`.env`（不進 git）：

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
