import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  NetworkMismatchError,
  UserRejectedError,
  VersionMismatchError,
  WalletNotFoundError,
  WalletTimeoutError,
  connectToWallet,
} from "@/lib/wallet";
import { WalletContext, type WalletState } from "./walletContextDef";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({ status: "disconnected" });

  const connect = useCallback(async () => {
    setState({ status: "connecting" });
    try {
      const connection = await connectToWallet();
      setState({ status: "connected", connection });
    } catch (e: unknown) {
      setState({ status: "error" });
      if (e instanceof WalletNotFoundError) {
        toast.error(e.message);
      } else if (e instanceof VersionMismatchError) {
        toast.error(e.message);
      } else if (e instanceof NetworkMismatchError) {
        toast.error(e.message);
      } else if (e instanceof UserRejectedError) {
        toast.warning(e.message);
        setState({ status: "disconnected" });
      } else if (e instanceof WalletTimeoutError) {
        toast.error(e.message);
      } else {
        toast.error("接続中にエラーが発生しました。再度お試しください。");
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ status: "disconnected" });
  }, []);

  return (
    <WalletContext.Provider value={{ state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}
