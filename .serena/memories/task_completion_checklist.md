# Task Completion Checklist

タスク完了後に以下を必ず実行する（`app/` ディレクトリ内）：

1. **フォーマット**
   ```bash
   bun run format
   ```

2. **Lint チェック**
   ```bash
   bun run lint
   ```

3. **ビルド確認**
   ```bash
   bun run build
   ```
   エラーがなければ完了。

## Notes
- テストは現時点では未設定。Vitest を追加する場合は `midnight-test-runner` スキルを参照。
- Midnight コントラクト関連の変更は必ず ZK コンパイル (`compact` CLI) も確認する。
