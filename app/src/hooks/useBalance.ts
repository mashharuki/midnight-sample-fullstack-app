import { useCallback, useState } from "react";
import type { DAppConnectorWalletAPI } from "@midnight-ntwrk/dapp-connector-api";
import { formatBalance } from "@/lib/utils";

export type BalanceState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "loaded";
      shielded: string;
      unshielded: string;
      dust: string;
    }
  | { status: "error" };

async function fetchBalances(walletAPI: DAppConnectorWalletAPI): Promise<{
  shielded: string;
  unshielded: string;
  dust: string;
}> {
  const raw = walletAPI as unknown as Record<string, unknown>;

  const [shieldedResult, unshieldedResult, dustResult] = await Promise.allSettled([
    typeof raw.getShieldedBalances === "function"
      ? (raw.getShieldedBalances as () => Promise<unknown>)()
      : Promise.resolve(null),
    typeof raw.getUnshieldedBalances === "function"
      ? (raw.getUnshieldedBalances as () => Promise<unknown>)()
      : Promise.resolve(null),
    typeof raw.getDustBalance === "function"
      ? (raw.getDustBalance as () => Promise<unknown>)()
      : Promise.resolve(null),
  ]);

  return {
    shielded:
      shieldedResult.status === "fulfilled"
        ? formatBalance(shieldedResult.value)
        : "--",
    unshielded:
      unshieldedResult.status === "fulfilled"
        ? formatBalance(unshieldedResult.value)
        : "--",
    dust:
      dustResult.status === "fulfilled"
        ? formatBalance(dustResult.value)
        : "--",
  };
}

export function useBalance(walletAPI: DAppConnectorWalletAPI | null) {
  const [balanceState, setBalanceState] = useState<BalanceState>({ status: "idle" });

  const refresh = useCallback(async () => {
    if (!walletAPI) return;
    setBalanceState({ status: "loading" });
    try {
      const balances = await fetchBalances(walletAPI);
      setBalanceState({ status: "loaded", ...balances });
    } catch (e: unknown) {
      console.error("[useBalance] Failed to fetch balances:", e);
      setBalanceState({ status: "error" });
    }
  }, [walletAPI]);

  return { balanceState, refresh };
}
