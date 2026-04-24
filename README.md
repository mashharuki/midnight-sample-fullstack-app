# midnight-sample-fullstack-app

Midnight ブロックチェーン向けフルスタック Counter dApp サンプル。  
Lace Wallet 接続 + Compact スマートコントラクト + React フロントエンドの統合デモ。

## Architecture

```
midnight-sample-fullstack-app/
├── pkgs/
│   ├── app/          # React 19 + Vite 5 + Tailwind CSS v4 フロントエンド
│   ├── contract/     # Compact スマートコントラクト (counter.compact)
│   └── cli/          # デプロイ / テスト CLI ツール
└── package.json      # Bun workspaces ルート
```

## Prerequisites

- [Bun](https://bun.sh) v1.x 以上
- [Lace Wallet](https://www.lace.io/) (ブラウザ拡張) — Midnight テストネット対応版
- ローカル開発: [Docker](https://www.docker.com/) (Midnight インフラ起動用)

## Quick Start

```bash
# 1. ルートで依存関係インストール (全パッケージ一括)
bun install

# 2. コントラクトビルド
cd pkgs/contract && bun run build

# 3. フロントエンド開発サーバー起動
cd pkgs/app && bun run dev
# → http://localhost:5173
```

## Commands

### Frontend (`pkgs/app/`)

```bash
bun install          # 依存関係インストール
bun run dev          # 開発サーバー (HMR) → http://localhost:5173
bun run build        # TypeScript チェック + Vite ビルド → dist/
bun run lint         # ESLint
bun run format       # Biome フォーマット
bun run preview      # dist/ をローカルプレビュー
```

### Contract (`pkgs/contract/`)

```bash
bun run build        # Compact コンパイル → dist/
bun run test         # Vitest シミュレータでコントラクトテスト
```

### CLI (`pkgs/cli/`)

```bash
# .env.local を作成 (.env.example を参照)
cp .env.example .env.local

# コントラクトデプロイ (ローカル standalone)
NETWORK_ENV_VAR=standalone \
SEED_ENV_VAR=<your-seed> \
INITIAL_COUNTER_ENV_VAR=0 \
bun run deploy

# カウンター値インクリメント
CONTRACT_ADDRESS=<deployed-address> bun run increment
```

## Local Infrastructure (Docker)

```bash
# Midnight ローカルノード + Indexer + Proof Server 起動
docker compose -f pkgs/cli/standalone.yml up -d

# 動作確認
curl http://localhost:6300   # → "We're alive 🎉!"
# Indexer: http://localhost:8088
# Node:    ws://localhost:9944
```

## Environment Variables

`pkgs/app/.env.local` (任意):

```
VITE_NETWORK_ID=TestNet   # TestNet | DevNet | Undeployed (default: TestNet)
```

`pkgs/cli/.env.local`:

```
NETWORK_ENV_VAR=standalone  # standalone | testnet-local | testnet | testnet-remote
SEED_ENV_VAR=               # ウォレットシード (BIP-39 mnemonic)
INITIAL_COUNTER_ENV_VAR=0   # 初期カウンター値
CACHE_FILE_ENV_VAR=.cache   # デプロイ情報キャッシュファイル
CONTRACT_ADDRESS=           # デプロイ済みコントラクトアドレス
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 5, Tailwind CSS v4 |
| Contract | Compact (Midnight ZK DSL) |
| SDK | `@midnight-ntwrk/*` 2.0.x |
| Wallet | Lace Wallet (DApp Connector API v4) |
| Runtime | `@midnight-ntwrk/compact-runtime` 0.9.0 |
| i18n | 日本語 / English |
| Formatter | Biome |
| Package Manager | Bun |