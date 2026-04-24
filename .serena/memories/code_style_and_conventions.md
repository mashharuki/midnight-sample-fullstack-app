# Code Style & Conventions

## Formatter: Biome 2.4.12
- Indent: **space** (2 spaces)
- Quote style: **double** (`"`)
- Import organize: auto (Biome assist)
- CSS ファイルは Biome 対象外 (`!!**/*.css`)
- `dist/` は除外

## TypeScript
- TypeScript ~6.0
- Strict mode (tsconfig.app.json)
- Path alias: `@/` → `src/`
- 型注釈は明示的に書く

## React
- React 19 (function components only)
- Hooks パターン (`contexts/useWallet` など)
- JSX/TSX ファイル拡張子を使う

## Naming
- コンポーネント: PascalCase (`AddressCard.tsx`)
- hooks: camelCase with `use` prefix (`useWallet`)
- ファイル名はコンポーネント名と一致させる

## Midnight SDK
- `@midnight-ntwrk/*` は `2.0.x` 系で統一
- `compact-runtime` と `midnight-js-contracts` は同系列バージョン必須
- Lace Wallet 検出: `window.midnight.mnLace`（100ms ポーリングで待機）
- ZK 証明: Proof Server（port 6300）必須

## Comments
- 必要な箇所のみコメントを書く（コードの意図が自明な場合は書かない）
