import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "./components/ui/sonner";
import { WalletProvider } from "./contexts/WalletContext";
import App from "./App.tsx";
import "./css/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
      <App />
      <Toaster theme="dark" position="bottom-right" richColors />
    </WalletProvider>
  </StrictMode>,
);
