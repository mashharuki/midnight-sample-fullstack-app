実装計画: Midnight PreProd テストネット Wallet 接続 UI                                                                                     
                                                                                                                                    
Context                                                                                                                                  

Midnight テストネット（Lace Wallet の PreProd 相当）に接続し、成功時にシールドアドレスを表示するフロントエンドアプリを構築する。現状の
app/ は素の React 19 + Vite 8 + Tailwind v4 スターターで、Midnight SDK も shadcn/ui も未導入。

目的: サンプル dApp のベース UI として機能し、将来のコントラクト統合の足場となる。

採用アプローチ: Connector-only（アドレス表示だけなのでフル SDK / WASM 不要。将来コントラクト追加時に拡張）

---
確定要件

- Midnight PreProd テストネットに Lace Wallet で接続
- 接続成功時にシールドアドレスを画面に表示
- Midnight テーマ（ダーク固定: bg #0a0a0f, card #12121a, accent #a855f7, sub #22d3ee, text #f8fafc）
- Tailwind CSS v4 + shadcn/ui（Button, Card, Badge, Sonner）
- 3 ステート: 未接続 / 接続中 / 接続済み
- エラーはトースト通知（Sonner）
- design.pen にデザインの叩き台を追加

---
追加パッケージ（最小構成）

# app/ ディレクトリ内で実行
bun add @midnight-ntwrk/dapp-connector-api@^3.0.0 \
    @midnight-ntwrk/midnight-js-network-id@2.0.2 \
    rxjs \
    semver

bun add -D @types/semver

▎ WASM / polyfill プラグインは不要（スマートコントラクト呼び出しがないため）。
▎ vite.config.ts の変更なし。

---
ファイル構成（変更・新規ファイル）

app/src/
lib/
wallet.ts              # connectToWallet() — Lace 検出 + v4/レガシー対応
utils.ts               # truncateAddress() ヘルパー
contexts/
WalletContext.tsx      # WalletProvider + useWallet フック
components/
ConnectSection.tsx     # 未接続/接続中ステート UI
AddressCard.tsx        # 接続済みステート — アドレス表示カード
App.tsx                  # リファクタリング（WalletProvider でラップ）
main.tsx                 # Toaster を追加
css/
index.css              # Midnight テーマ CSS 変数に置き換え

---
実装ステップ

Step 1: design.pen にデザイン叩き台を作成

ツール: Pencil MCP (mcp__pencil__*)

design.pen ファイルを新規作成し、以下のフレームを追加する:
- Frame 1: 未接続ステート（中央にロゴ + Connect ボタン）
- Frame 2: 接続中ステート（スピナー）
- Frame 3: 接続済みステート（アドレスカード）
- カラートークン: bg #0a0a0f, card #12121a, accent #a855f7, sub #22d3ee

Step 2: Midnight パッケージのインストール

cd app
bun add @midnight-ntwrk/dapp-connector-api@^3.0.0 \
    @midnight-ntwrk/midnight-js-network-id@2.0.2 \
    rxjs \
    semver
bun add -D @types/semver

Step 3: shadcn/ui のセットアップ

cd app
bunx shadcn@latest init
# ダークモード: yes（ただし dark クラス常時付与する）
# Tailwind v4 を自動検出する

# コンポーネント追加
bunx shadcn@latest add button card badge sonner

▎ shadcn/ui init が components.json + src/lib/utils.ts を生成し、
▎ index.css に CSS 変数を追加する。この後 Step 4 で Midnight テーマに上書きする。

Step 4: Midnight テーマ CSS に更新

対象ファイル: app/src/css/index.css

shadcn/ui が追加した CSS 変数を Midnight パレットに置き換える。
:root / .dark の両方ではなく、強制ダーク変数のみ定義（dark クラスなし、常に body に直接適用）:

@import "tailwindcss";

:root {
color-scheme: dark;

/* Midnight テーマ */
--background:    #0a0a0f;
--foreground:    #f8fafc;
--card:          #12121a;
--card-foreground: #f8fafc;
--border:        #1e1e2e;
--primary:       #a855f7;
--primary-foreground: #ffffff;
--secondary:     #22d3ee;
--muted:         #1a1a26;
--muted-foreground: #94a3b8;
--accent:        #a855f7;
--accent-foreground: #ffffff;
--destructive:   #ef4444;
--ring:          #a855f7;
--radius:        0.5rem;

/* shadcn/ui 変数名エイリアス */
--color-background:    var(--background);
--color-foreground:    var(--foreground);
--color-primary:       var(--primary);
--color-secondary:     var(--secondary);
--color-border:        var(--border);
--color-muted:         var(--muted);
--color-card:          var(--card);
}

body {
background-color: var(--background);
color: var(--foreground);
font-family: var(--font-sans, system-ui, sans-serif);
}

Step 5: ウォレット接続ロジック

新規ファイル: app/src/lib/wallet.ts

midnight-lace-dapp スキルの connectToWallet() 実装をベースに:
- window.midnight.mnLace を 100ms ポーリング（10秒タイムアウト）で検出
- semver で >=1.0.0 の API バージョン互換性確認
- Lace v4 (connect(networkId)) → candidates: ['preprod', 'mainnet', 'undeployed', 'preview']
- レガシー v1 フォールバック（ハードコードの testnet URI を使用）
- エラー種別を型定義: WalletNotFoundError, VersionMismatchError, NetworkMismatchError, UserRejectedError

新規ファイル: app/src/lib/utils.ts

export const truncateAddress = (address: string): string =>
`${address.substring(0, 6)}...${address.substring(22, 26)}...${address.substring(124, 132)}`;

export const copyToClipboard = (text: string): Promise<void> =>
navigator.clipboard.writeText(text);

Step 6: WalletContext

新規ファイル: app/src/contexts/WalletContext.tsx

// 状態の型
type WalletState =
| { status: 'disconnected' }
| { status: 'connecting' }
| { status: 'connected'; address: string; coinPublicKey: string; uris: ServiceUriConfig }
| { status: 'error'; message: string };

// Context 値
interface WalletContextValue {
state: WalletState;
connect: () => Promise<void>;
disconnect: () => void;
}

- useEffect で setNetworkId(NetworkId.TestNet) を初回起動時に呼ぶ
- connect() は wallet.ts の connectToWallet() を呼び、wallet.state() でアドレスを取得
- disconnect() は状態を disconnected にリセット

Step 7: UI コンポーネント

新規ファイル: app/src/components/ConnectSection.tsx

- 未接続時: ロゴ（🌑テキスト or SVG）+ タイトル "Midnight dApp" + 説明文 + <Button> Connect
- 接続中時: <Button disabled> + Tailwind animate-spin スピナー + "Connecting..."
- shadcn/ui の Button に variant="default" を使用（accent カラー適用）

新規ファイル: app/src/components/AddressCard.tsx

- shadcn/ui の <Card> コンテナ
- <Badge> で "Connected" ステータス（緑 or シアン）
- 短縮アドレス（truncateAddress()）をメインテキストで表示
- コピーアイコンボタン（shadcn/ui の Button variant="ghost"）でフルアドレスをクリップボードへ
- "Disconnect" リンクボタン

Step 8: App.tsx と main.tsx のリファクタリング

app/src/App.tsx: 既存の counter/hero コンテンツをすべて削除し、以下に置き換え:

import { useWallet } from './contexts/WalletContext';
import { ConnectSection } from './components/ConnectSection';
import { AddressCard } from './components/AddressCard';

function App() {
const { state } = useWallet();
return (
<main className="min-h-screen flex items-center justify-center">
  {state.status === 'connected'
    ? <AddressCard />
    : <ConnectSection />}
</main>
);
}

app/src/main.tsx: WalletProvider と <Toaster> でラップ:

import { WalletProvider } from './contexts/WalletContext';
import { Toaster } from './components/ui/sonner';

createRoot(document.getElementById('root')!).render(
<StrictMode>
<WalletProvider>
  <App />
  <Toaster theme="dark" position="bottom-right" />
</WalletProvider>
</StrictMode>,
);

Step 9: エラー → トースト連携

WalletContext.tsx の connect() 内でエラーをキャッチし、
toast.error() (Sonner) でメッセージ表示:

┌─────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│   エラー種別    │                              トーストメッセージ                               │
├─────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ WalletNotFound  │ "Midnight Lace Wallet が見つかりません。拡張機能をインストールしてください。" │
├─────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ VersionMismatch │ "Lace Wallet のバージョンが古いです。最新版に更新してください。"              │
├─────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ NetworkMismatch │ "ネットワークが一致しません。Lace Settings で PreProd を選択してください。"   │
├─────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ UserRejected    │ "ウォレット接続がキャンセルされました。"                                      │
├─────────────────┼───────────────────────────────────────────────────────────────────────────────┤
│ Timeout         │ "接続タイムアウト。Lace Wallet のロックを解除してください。"                  │
└─────────────────┴───────────────────────────────────────────────────────────────────────────────┘

Step 10: ESLint + Biome のクリーンアップ

- 未使用インポート（既存の hero.png, react.svg, vite.svg）を削除
- App.css の内容をすべて削除（Midnight テーマに不要）
- bun run lint + bun run format でクリーン確認

---
変更する既存ファイル

┌───────────────────────┬───────────────────────────────────────────────────────────┐
│       ファイル        │                         変更内容                          │
├───────────────────────┼───────────────────────────────────────────────────────────┤
│ app/src/App.tsx       │ 全面リライト（counter/hero を削除、wallet UI に置き換え） │
├───────────────────────┼───────────────────────────────────────────────────────────┤
│ app/src/main.tsx      │ WalletProvider + Toaster を追加                           │
├───────────────────────┼───────────────────────────────────────────────────────────┤
│ app/src/css/index.css │ Midnight テーマ CSS 変数に上書き（shadcn/ui init 後）     │
├───────────────────────┼───────────────────────────────────────────────────────────┤
│ app/src/css/App.css   │ 全削除（不要）                                            │
├───────────────────────┼───────────────────────────────────────────────────────────┤
│ app/vite.config.ts    │ 変更なし                                                  │
├───────────────────────┼───────────────────────────────────────────────────────────┤
│ app/package.json      │ 依存関係追加（bun add で自動更新）                        │
└───────────────────────┴───────────────────────────────────────────────────────────┘

---
新規作成ファイル

┌───────────────────────────────────────┬──────────────────────────────────────┐
│               ファイル                │                 役割                 │
├───────────────────────────────────────┼──────────────────────────────────────┤
│ app/src/lib/wallet.ts                 │ Lace Wallet 検出・接続ロジック       │
├───────────────────────────────────────┼──────────────────────────────────────┤
│ app/src/lib/utils.ts                  │ アドレス短縮・クリップボードヘルパー │
├───────────────────────────────────────┼──────────────────────────────────────┤
│ app/src/contexts/WalletContext.tsx    │ ウォレット状態管理コンテキスト       │
├───────────────────────────────────────┼──────────────────────────────────────┤
│ app/src/components/ConnectSection.tsx │ 未接続/接続中 UI                     │
├───────────────────────────────────────┼──────────────────────────────────────┤
│ app/src/components/AddressCard.tsx    │ 接続済み UI（アドレス表示）          │
├───────────────────────────────────────┼──────────────────────────────────────┤
│ app/components.json                   │ shadcn/ui 設定                       │
├───────────────────────────────────────┼──────────────────────────────────────┤
│ design.pen                            │ Pencil MCP で作成するデザイン叩き台  │
└───────────────────────────────────────┴──────────────────────────────────────┘

---
検証手順

cd app

# 1. 型チェック
bun run build

# 2. Lint
bun run lint

# 3. Biome フォーマット確認
bun run format

# 4. 開発サーバー起動
bun run dev
# → http://localhost:5173 を開く

# 5. 手動テスト
# a) Chrome + Midnight Lace 拡張機能インストール済みで "Connect Lace Wallet" をクリック
# b) Lace が PreProd ネットワークに設定されていることを確認
# c) 接続許可 → アドレスカードが表示されること
# d) コピーボタン → クリップボードにフルアドレスがコピーされること
# e) Lace 未インストール時 → "Wallet が見つかりません" トースト表示
# f) 接続キャンセル時 → "キャンセル" トースト表示
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

Claude has written up a plan and is ready to execute. Would you like to proceed?

❯ 1. Yes, auto-accept edits
2. Yes, manually approve edits
3. No, refine with Ultraplan on Claude Code on the web
4. Tell Claude what to change
shift+tab to approve with this feedback

ctrl-g to edit in VS Code · ~/.claude/plans/midnight-preprod-effervescent-hippo.md
# 2. Lint
bun run lint

# 3. Biome フォーマット確認
bun run format

# 4. 開発サーバー起動
bun run dev
# → http://localhost:5173 を開く

# 5. 手動テスト
# a) Chrome + Midnight Lace 拡張機能インストール済みで "Connect Lace Wallet" をクリック
# b) Lace が PreProd ネットワークに設定されていることを確認
# c) 接続許可 → アドレスカードが表示されること
# d) コピーボタン → クリップボードにフルアドレスがコピーされること
# e) Lace 未インストール時 → "Wallet が見つかりません" トースト表示
# f) 接続キャンセル時 → "キャンセル" トースト表示