# Project Overview

## Purpose
Midnight ブロックチェーン向けフルスタック dApp のサンプルプロジェクト。
React + TypeScript + Vite (Tailwind CSS v4) のフロントエンドに Midnight SDK / Lace Wallet を統合する。

## Tech Stack
- **Runtime/Package Manager**: Bun (npm/yarn は使わない)
- **Frontend**: React 19, TypeScript ~6.0, Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` プラグイン経由、`tailwind.config.js` 不要)
- **UI Components**: shadcn/ui (Radix UI + CVA), lucide-react, sonner
- **Formatter/Linter**: Biome 2.4.12 + ESLint 9
- **Blockchain**: Midnight Network (`@midnight-ntwrk/dapp-connector-api ^3.0.0`)
- **Wallet**: Lace Wallet (`window.midnight.mnLace`)
- **State/Async**: RxJS 7

## Current State
- フロントエンドのみ (`app/` ディレクトリ)
- Lace Wallet 接続 UI が実装済み (ConnectSection / AddressCard コンポーネント)
- Compact コントラクトはまだ未実装

## Repository Layout
```
midnight-sample-fullstack-app/
├── app/               # フロントエンド (React + Vite)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── css/
│   ├── vite.config.ts
│   ├── biome.json
│   └── package.json
├── docs/
├── .claude/           # エージェント/スキル定義
└── CLAUDE.md
```

## Recommended Monorepo Structure (when adding Midnight SDK)
```
packages/
  contracts/<name>/src/<name>.compact
  api/<name>/src/common/api.ts
apps/web/  (= current app/)
```
