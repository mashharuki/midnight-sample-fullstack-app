import type { WalletConnectionResult } from "@/utils/types";
import {
  type CoinPublicKey,
  type EncPublicKey,
  type FinalizedTransaction,
  Transaction as LedgerTransaction,
  type TransactionId,
} from "@midnight-ntwrk/ledger-v8";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import {
  type MidnightProvider,
  type UnboundTransaction,
  type WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import {
  NetworkId as ZswapNetworkId,
  Transaction as ZswapTransaction,
} from "@midnight-ntwrk/zswap";
import type { CounterCircuits, CounterProviders } from "./counter-types";

const toZswapNetworkId = (id: string): ZswapNetworkId => {
  switch (id) {
    case "TestNet":
      return ZswapNetworkId.TestNet;
    case "DevNet":
      return ZswapNetworkId.DevNet;
    case "MainNet":
      return ZswapNetworkId.MainNet;
    default:
      return ZswapNetworkId.Undeployed;
  }
};

/**
 * Midnight プロバイダーチェーンを生成する。
 * Lace Wallet 接続情報を使い、ブラウザ環境に適したプロバイダーを構築する。
 */
export function createCounterProviders(
  connection: WalletConnectionResult,
): CounterProviders {
  const { wallet, uris, state } = connection;
  const networkId = toZswapNetworkId(getNetworkId());

  const walletProvider: WalletProvider = {
    getCoinPublicKey(): CoinPublicKey {
      return state.coinPublicKey;
    },
    getEncryptionPublicKey(): EncPublicKey {
      return state.encryptionPublicKey;
    },
    async balanceTx(
      tx: UnboundTransaction,
      _ttl?: Date,
    ): Promise<FinalizedTransaction> {
      const zswapTx = ZswapTransaction.deserialize(tx.serialize(), networkId);
      const provedZswapTx = await wallet.balanceAndProveTransaction(
        zswapTx,
        [],
      );
      const bytes = provedZswapTx.serialize(networkId);
      return LedgerTransaction.deserialize(
        "signature",
        "proof",
        "binding",
        bytes,
      ) as FinalizedTransaction;
    },
  };

  const midnightProvider: MidnightProvider = {
    async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
      const zswapTx = ZswapTransaction.deserialize(tx.serialize(), networkId);
      return wallet.submitTransaction(zswapTx) as Promise<TransactionId>;
    },
  };

  const zkConfigProvider = new FetchZkConfigProvider<CounterCircuits>(
    `${window.location.origin}/managed/counter`,
    fetch.bind(window),
  );

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStoragePasswordProvider: () => "midnight-counter-demo-app-2024",
      accountId: state.coinPublicKey,
    }),
    publicDataProvider: indexerPublicDataProvider(
      uris.indexerUri,
      uris.indexerWsUri,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(uris.proverServerUri, zkConfigProvider),
    walletProvider,
    midnightProvider,
  };
}

