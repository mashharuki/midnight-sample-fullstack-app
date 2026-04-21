import { AddressCard } from "./components/AddressCard";
import { ConnectSection } from "./components/ConnectSection";
import { useWallet } from "./contexts/useWallet";

function App() {
  const { state } = useWallet();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      {state.status === "connected" ? <AddressCard /> : <ConnectSection />}
    </main>
  );
}

export default App;
