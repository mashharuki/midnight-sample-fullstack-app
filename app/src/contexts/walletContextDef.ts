import { createContext } from "react";
import type { WalletConnectionResult } from "@/lib/wallet";

export type WalletState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; connection: WalletConnectionResult }
  | { status: "error" };

export interface WalletContextValue {
  state: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletContextValue | null>(null);
