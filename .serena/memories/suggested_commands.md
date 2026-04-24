# Suggested Commands

すべてのコマンドは `app/` ディレクトリ内で実行する。

## Development
```bash
cd app
bun install          # 依存関係インストール
bun run dev          # 開発サーバー起動 (HMR, デフォルト http://localhost:5173)
bun run build        # TypeScript チェック + Vite ビルド → dist/
bun run preview      # dist/ をローカルプレビュー
```

## Code Quality
```bash
bun run lint         # ESLint 実行
bun run format       # Biome フォーマット (--write)
```

## Local Midnight Infrastructure (Docker)
```bash
docker compose -f standalone.yml up -d

# 起動確認
curl http://localhost:6300   # → "We're alive 🎉!"
# Indexer: http://localhost:8088
# Node:    ws://localhost:9944
```

## Utility (Darwin / macOS)
```bash
git, ls, cd, grep, find, cat, curl, open
```
