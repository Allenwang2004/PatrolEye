# app：PatrolEye 手機 App（Expo）

Expo SDK 58、TypeScript、expo-router。畫面和資料流程見 `docs/v2/APP_BACKEND_TODO.md` 第 4 節，資料表見 `docs/v2/ARCHITECTURE.md`。

## 開始

```bash
cd app
npm install
cp .env.example .env      # 填 Supabase URL 和 anon key
npx expo start            # 手機開 Expo Go 掃 QR；按 w 開網頁版
```

`.env`（不進 git）：

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

改 `.env` 後要重開 `npx expo start`。

沒有攝影機時，用 `supabase/` 的 `npm run fake-device` 模擬（見 `supabase/README.md`）。網頁版不能掃 QR，新增攝影機時直接貼上 fake device 印出的 `patroleye://claim?...` 連結。

## 檢查

```bash
npm run typecheck
npm run lint
```

## 結構

```
src/app/                  路由（每個檔案是一個畫面）
  _layout.tsx             登入檢查（Stack.Protected）
  sign-in.tsx             登入／註冊
  (app)/(tabs)/           攝影機列表、事件列表、設定
  (app)/add-camera.tsx    掃 QR 綁定、取名
  (app)/camera/[id]/      攝影機頁、掃描與遮罩設定（masks.tsx）
  (app)/event/[id].tsx    事件內容、播放片段、我知道了
src/components/           UI 元件、遮罩編輯器（mask-editor.tsx）
src/lib/                  Supabase client、型別、指令、遮罩座標換算
```

## 注意

- 新事件用 Realtime 即時出現在列表，並在任何畫面上方跳出提示（代替推播），只在 App 開著時有效。
- 遮罩編輯器的手勢設定要保持穩定（`useMemo`），否則拖曳到一半會被 Gesture Handler 重設；細節見 `mask-editor.tsx` 的註解。
- 全景圖上不能直接接收觸控（`pointerEvents="none"`），否則網頁版拖曳會變成瀏覽器的拖曳圖片。
