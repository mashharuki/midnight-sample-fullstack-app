# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Midnight ブロックチェーン向けフルスタック dApp のサンプルプロジェクト。React + TypeScript + Vite (Tailwind CSS v4) のフロントエンドに Midnight SDK / Lace Wallet を統合する。

## Commands

すべてのコマンドは `app/` ディレクトリ内で実行する。

```bash
bun install              # 依存関係インストール
bun run dev              # 開発サーバー起動 (HMR 有効)
bun run build            # TypeScript チェック + Vite ビルド → dist/
bun run lint             # ESLint 実行
bun run format           # Biome フォーマット (--write)
bun run preview          # dist/ をローカルプレビュー
```

フォーマッターは **Biome**（`@biomejs/biome 2.4.12`）を使用。インデントはスペース、クォートはダブル。ESLint は型チェックなしの基本設定（必要に応じて `tsconfig` 連携を有効化）。

## Architecture

```
midnight-sample-fullstack-app/
├── app/                          # フロントエンド (React 19 + Vite 8 + Tailwind v4)
│   ├── src/
│   │   ├── main.tsx              # エントリーポイント
│   │   ├── App.tsx               # ルートコンポーネント
│   │   ├── assets/               # 画像・SVG
│   │   └── css/                  # グローバルスタイル
│   ├── public/                   # 静的ファイル (favicon.svg, icons.svg)
│   ├── vite.config.ts            # React + Tailwind CSS v4 プラグイン設定
│   └── biome.json                # Biome フォーマット・Lint 設定
└── .claude/
    ├── agents/                   # サブエージェント定義
    │   ├── midnight-dev-guide.md     # Midnight 全般エキスパート (Opus)
    │   └── apple-style-ui-designer.md
    ├── skills/                   # ドメイン固有スキル群
    │   ├── midnight-compact-guide/   # Compact 言語・コントラクト実装
    │   ├── midnight-lace-dapp/       # Lace Wallet 統合・SDK プロバイダー
    │   ├── midnight-infra-setup/     # ローカルインフラ (Docker)
    │   ├── midnight-deploy/          # デプロイ (ローカル/テストネット)
    │   ├── midnight-sdk-guide/       # TypeScript SDK 統合
    │   ├── midnight-test-runner/     # Vitest シミュレータ
    │   └── frontend-design/          # UI コンポーネント設計
    └── .mcp.json                 # MCP サーバー設定
```

## Skill & Agent Usage

Midnight 関連の作業では必ず対応するスキルを呼び出す（`.claude/rules/proactive-subagents-and-skills.md` に従う）：

| 作業 | 使用するスキル/エージェント |
|---|---|
| Compact コントラクト実装 | `midnight-compact-guide` |
| Lace Wallet / SDK 統合 | `midnight-lace-dapp` |
| ローカルインフラ起動 | `midnight-infra-setup` |
| コントラクトデプロイ | `midnight-deploy` |
| コントラクトテスト | `midnight-test-runner` |
| UI 実装全般 | `frontend-design` + `intentional-design-guard` |
| Midnight 全般（複合タスク） | `midnight-dev-guide` サブエージェント |

## Midnight dApp Architecture (実装時の推奨構造)

Midnight SDK を追加する際はモノレポ構造を推奨：

```
packages/
  contracts/<name>/
    src/
      <name>.compact            # Compact コントラクト
      managed/<name>/           # コンパイル済み ZK キー
  api/<name>/
    src/
      common/api.ts             # コントラクト API 定義
      browser/
        connect-to-wallet.ts    # Lace 接続ロジック
        api.ts                  # ブラウザ用プロバイダー生成
apps/
  web/ (= 現在の app/)         # Vite React アプリ
```

## Key Technology Notes

- **パッケージマネージャー**: Bun（`npm` / `yarn` は使わない）
- **Tailwind CSS v4**: `@tailwindcss/vite` プラグイン経由（`tailwind.config.js` 不要）
- **Midnight SDK バージョン**: `@midnight-ntwrk/*` は `2.0.x` 系で統一。`compact-runtime` と `midnight-js-contracts` は必ず同系列にする（バージョン不一致は ZK 検証エラーの主因）
- **Lace Wallet 検出**: `window.midnight.mnLace` が well-known キー（100ms ポーリングで待機）
- **ZK 証明**: Proof Server（port 6300）が必須。ローカル開発では Docker で起動

## MCP Servers (.claude/.mcp.json)

| サーバー | 用途 |
|---|---|
| `context7` | ライブラリ最新ドキュメント取得 |
| `sequential-thinking` | 複雑な問題の段階的推論 |
| `serena` | セマンティックコード解析 |
| `midnight` | コントラクト分析・コンパイル・Midnight ドキュメント検索 |

## Local Infrastructure (Midnight)

```bash
docker compose -f standalone.yml up -d

# 起動確認
curl http://localhost:6300   # → "We're alive 🎉!"
# Indexer: http://localhost:8088
# Node:    ws://localhost:9944
```
