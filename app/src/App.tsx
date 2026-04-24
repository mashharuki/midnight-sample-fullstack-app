import { AddressCard } from "./components/AddressCard";
import { ConnectSection } from "./components/ConnectSection";
import { LanguageToggle } from "./components/LanguageToggle";
import { useWallet } from "./contexts/useWallet";

/**
 * アプリのルートコンポーネント。
 * ウォレットの接続状態に応じて表示を切り替える：
 * - connected → ウォレット情報カード (AddressCard)
 * - それ以外  → 接続ボタン画面 (ConnectSection)
 */
function App() {
  const { state } = useWallet();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LanguageToggle />
      {state.status === "connected" ? <AddressCard /> : <ConnectSection />}
    </main>
  );
}

export default App;
