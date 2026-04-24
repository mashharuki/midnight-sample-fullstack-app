import type { WalletConnectionResult } from "@/utils/types";
import type { CoinInfo, TransactionId } from "@midnight-ntwrk/ledger";
import { Transaction } from "@midnight-ntwrk/ledger";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import {
  getLedgerNetworkId,
  getZswapNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import {
  createBalancedTx,
  type BalancedTransaction,
  type MidnightProvider,
  type UnbalancedTransaction,
  type WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import type {
  CounterCircuits,
  CounterProviders,
} from "./counter-types";

/**
 * Midnight プロバイダーチェーンを生成する。
 * Lace Wallet 接続情報を使い、ブラウザ環境に適したプロバイダーを構築する。
 */
export function createCounterProviders(
  connection: WalletConnectionResult,
): CounterProviders {
  const { wallet, uris, state } = connection;

  const walletProvider: WalletProvider = {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,
    balanceTx(
      tx: UnbalancedTransaction,
      newCoins: CoinInfo[],
    ): Promise<BalancedTransaction> {
      return wallet
        .balanceAndProveTransaction(
          ZswapTransaction.deserialize(
            tx.serialize(getLedgerNetworkId()),
            getZswapNetworkId(),
          ),
          // CoinInfo 型は ledger / zswap で互換性があるためキャストする
          newCoins as unknown as Parameters<
            typeof wallet.balanceAndProveTransaction
          >[1],
        )
        .then((zswapTx) =>
          Transaction.deserialize(
            zswapTx.serialize(getZswapNetworkId()),
            getLedgerNetworkId(),
          ),
        )
        .then(createBalancedTx);
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return wallet.submitTransaction(
        tx as unknown as Parameters<typeof wallet.submitTransaction>[0],
      );
    },
  };

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: "counter-private-state",
    }),
    publicDataProvider: indexerPublicDataProvider(
      uris.indexerUri,
      uris.indexerWsUri,
    ),
    zkConfigProvider: new FetchZkConfigProvider<CounterCircuits>(
      `${window.location.origin}/managed/counter`,
      fetch.bind(window),
    ),
    proofProvider: httpClientProofProvider(uris.proverServerUri),
    walletProvider,
    midnightProvider,
  };
}
