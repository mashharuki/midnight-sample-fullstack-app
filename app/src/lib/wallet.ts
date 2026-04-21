import type {
  DAppConnectorAPI,
  DAppConnectorWalletAPI,
  DAppConnectorWalletState,
  ServiceUriConfig,
} from "@midnight-ntwrk/dapp-connector-api";
import { filter, firstValueFrom, interval, map, take, timeout } from "rxjs";
import semver from "semver";

const COMPATIBLE_CONNECTOR_VERSION = ">=1.0.0";
const DETECT_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 100;
const NETWORK_CANDIDATES = [
  "preprod",
  "mainnet",
  "undeployed",
  "preview",
] as const;

const FALLBACK_URIS: ServiceUriConfig = {
  indexerUri: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWsUri: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
  proverServerUri: "http://127.0.0.1:6300",
  substrateNodeUri: "",
};

export type WalletConnectionResult = {
  wallet: DAppConnectorWalletAPI;
  uris: ServiceUriConfig;
  state: DAppConnectorWalletState;
};

export class WalletNotFoundError extends Error {
  constructor() {
    super(
      "Midnight Lace Wallet が見つかりません。拡張機能をインストールしてください。",
    );
    this.name = "WalletNotFoundError";
  }
}

export class VersionMismatchError extends Error {
  constructor(version: string) {
    super(
      `Lace Wallet のバージョン (${version}) が古いです。最新版に更新してください。`,
    );
    this.name = "VersionMismatchError";
  }
}

export class NetworkMismatchError extends Error {
  constructor() {
    super(
      "ネットワークが一致しません。Lace Settings で PreProd を選択してください。",
    );
    this.name = "NetworkMismatchError";
  }
}

export class UserRejectedError extends Error {
  constructor() {
    super("ウォレット接続がキャンセルされました。");
    this.name = "UserRejectedError";
  }
}

export class WalletTimeoutError extends Error {
  constructor() {
    super(
      "接続タイムアウト。Lace Wallet のロックを解除してから再試行してください。",
    );
    this.name = "WalletTimeoutError";
  }
}

function detectConnectorAPI(): Promise<DAppConnectorAPI> {
  return firstValueFrom(
    interval(POLL_INTERVAL_MS).pipe(
      map(() => {
        const midnight = (
          globalThis.window as unknown as Record<string, unknown>
        )?.midnight as Record<string, unknown> | undefined;
        if (!midnight) return null;
        if (midnight.mnLace) return midnight.mnLace as DAppConnectorAPI;
        return (
          (Object.values(midnight).find(
            (v) =>
              typeof (v as Record<string, unknown>)?.apiVersion === "string",
          ) as DAppConnectorAPI | undefined) ?? null
        );
      }),
      filter((api): api is DAppConnectorAPI => api !== null),
      take(1),
      timeout({ first: DETECT_TIMEOUT_MS }),
    ),
  ).catch(() => {
    throw new WalletNotFoundError();
  });
}

export async function connectToWallet(): Promise<WalletConnectionResult> {
  const connectorAPI = await detectConnectorAPI();

  if (
    !semver.satisfies(connectorAPI.apiVersion, COMPATIBLE_CONNECTOR_VERSION)
  ) {
    throw new VersionMismatchError(connectorAPI.apiVersion);
  }

  let enabledAPI: DAppConnectorWalletAPI;
  try {
    await connectorAPI.isEnabled();
    enabledAPI = await connectorAPI.enable();
  } catch (e: unknown) {
    const msg = String((e as Record<string, unknown>)?.message ?? e);
    if (
      msg.toLowerCase().includes("rejected") ||
      msg.toLowerCase().includes("cancel")
    ) {
      throw new UserRejectedError();
    }
    throw e;
  }

  // Lace v4: connect(networkId) API
  if (
    typeof (enabledAPI as unknown as Record<string, unknown>).connect ===
    "function"
  ) {
    const v4 = enabledAPI as unknown as {
      connect: (networkId: string) => Promise<DAppConnectorWalletAPI>;
      getConfiguration: () => Promise<Record<string, string>>;
    };

    let walletAPI: DAppConnectorWalletAPI | null = null;
    let uris: ServiceUriConfig = FALLBACK_URIS;
    let lastErr: unknown;

    for (const networkId of NETWORK_CANDIDATES) {
      try {
        walletAPI = await v4.connect(networkId);
        const cfg = await v4.getConfiguration();
        uris = {
          indexerUri:
            cfg.indexerUri ?? cfg.indexerUrl ?? FALLBACK_URIS.indexerUri,
          indexerWsUri:
            cfg.indexerWsUri ?? cfg.indexerWsUrl ?? FALLBACK_URIS.indexerWsUri,
          proverServerUri:
            cfg.proverServerUri ??
            cfg.proofServerUri ??
            FALLBACK_URIS.proverServerUri,
          substrateNodeUri: cfg.substrateNodeUri ?? cfg.nodeUri ?? "",
        };
        break;
      } catch (e: unknown) {
        lastErr = e;
        const reason = String(
          (e as Record<string, unknown>)?.reason ??
            (e as Record<string, unknown>)?.message ??
            e,
        );
        if (!reason.includes("mismatch") && !reason.includes("Unsupported"))
          break;
      }
    }

    if (!walletAPI) {
      const msg = String(
        (lastErr as Record<string, unknown>)?.message ?? lastErr ?? "",
      );
      if (
        msg.toLowerCase().includes("rejected") ||
        msg.toLowerCase().includes("cancel")
      ) {
        throw new UserRejectedError();
      }
      throw new NetworkMismatchError();
    }

    const state = await walletAPI.state();
    return { wallet: walletAPI, uris, state };
  }

  // Legacy v1 fallback
  const state = await enabledAPI.state();
  return { wallet: enabledAPI, uris: FALLBACK_URIS, state };
}
