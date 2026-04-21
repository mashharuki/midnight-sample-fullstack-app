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

// Lace v4 exposes connect() directly on the connector (no enable() step)
type LaceV4Connector = {
  connect: (networkId: string) => Promise<DAppConnectorWalletAPI>;
  getConfiguration?: () => Promise<Record<string, string>>;
};

// Legacy connector uses enable() first
type LaceLegacyConnector = {
  enable: () => Promise<DAppConnectorWalletAPI>;
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

async function connectViaV4(
  connector: LaceV4Connector,
): Promise<WalletConnectionResult> {
  let walletAPI: DAppConnectorWalletAPI | null = null;
  let uris: ServiceUriConfig = FALLBACK_URIS;
  let lastErr: unknown;

  for (const networkId of NETWORK_CANDIDATES) {
    try {
      walletAPI = await connector.connect(networkId);
      // Lace v4: getConfiguration() is on walletAPI (not connector)
      const walletRaw = walletAPI as unknown as Record<string, unknown>;
      if (typeof walletRaw.getConfiguration === "function") {
        const cfg = (await (walletRaw.getConfiguration as () => Promise<Record<string, string>>)()) as Record<string, string>;
        uris = {
          indexerUri: cfg.indexerUri ?? cfg.indexerUrl ?? FALLBACK_URIS.indexerUri,
          indexerWsUri: cfg.indexerWsUri ?? cfg.indexerWsUrl ?? FALLBACK_URIS.indexerWsUri,
          proverServerUri:
            cfg.proverServerUri ?? cfg.proofServerUri ?? FALLBACK_URIS.proverServerUri,
          substrateNodeUri: cfg.substrateNodeUri ?? cfg.nodeUri ?? "",
        };
      }
      break;
    } catch (e: unknown) {
      lastErr = e;
      const reason = String(
        (e as Record<string, unknown>)?.reason ??
          (e as Record<string, unknown>)?.message ??
          e,
      );
      // only retry for network mismatch errors
      if (!reason.toLowerCase().includes("mismatch") && !reason.toLowerCase().includes("unsupported")) {
        break;
      }
    }
  }

  if (!walletAPI) {
    const msg = String((lastErr as Record<string, unknown>)?.message ?? lastErr ?? "");
    if (msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("cancel")) {
      throw new UserRejectedError();
    }
    throw new NetworkMismatchError();
  }

  // Lace v4: state() does not exist — use getShieldedAddresses() instead
  const walletRaw = walletAPI as unknown as Record<string, unknown>;
  let address = "";
  let coinPublicKey = "";
  let encryptionPublicKey = "";

  if (typeof walletRaw.getShieldedAddresses === "function") {
    const result = (await (walletRaw.getShieldedAddresses as () => Promise<Record<string, unknown>>)());
    // Lace v4 returns a single object (not array):
    // { shieldedAddress, shieldedCoinPublicKey, shieldedEncryptionPublicKey }
    const entry = (Array.isArray(result) ? result[0] : result) as Record<string, unknown> | undefined;
    if (entry) {
      address = String(entry.shieldedAddress ?? entry.address ?? "");
      coinPublicKey = String(entry.shieldedCoinPublicKey ?? entry.coinPublicKey ?? "");
      encryptionPublicKey = String(entry.shieldedEncryptionPublicKey ?? entry.encryptionPublicKey ?? "");
    }
  }

  const state = {
    address,
    coinPublicKey,
    encryptionPublicKey,
    addressLegacy: "",
    coinPublicKeyLegacy: "",
    encryptionPublicKeyLegacy: "",
  };
  return { wallet: walletAPI, uris, state };
}

export async function connectToWallet(): Promise<WalletConnectionResult> {
  const connectorAPI = await detectConnectorAPI();

  if (!semver.satisfies(connectorAPI.apiVersion, COMPATIBLE_CONNECTOR_VERSION)) {
    throw new VersionMismatchError(connectorAPI.apiVersion);
  }

  const raw = connectorAPI as unknown as Record<string, unknown>;

  // Lace v4: connect() directly on the connector (no enable() step)
  if (typeof raw.connect === "function") {
    return connectViaV4(connectorAPI as unknown as LaceV4Connector);
  }

  // Legacy: enable() first, then optional connect()
  if (typeof raw.enable !== "function") {
    throw new Error("Unsupported Lace Wallet API: neither connect() nor enable() found.");
  }

  try {
    const legacyConnector = connectorAPI as unknown as LaceLegacyConnector;
    const enabledAPI = await legacyConnector.enable();
    const enabledRaw = enabledAPI as unknown as Record<string, unknown>;

    // Some legacy versions expose connect() on the enabled API
    if (typeof enabledRaw.connect === "function") {
      return connectViaV4(enabledAPI as unknown as LaceV4Connector);
    }

    const state = await enabledAPI.state();
    return { wallet: enabledAPI, uris: FALLBACK_URIS, state };
  } catch (e: unknown) {
    const msg = String((e as Record<string, unknown>)?.message ?? e);
    if (msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("cancel")) {
      throw new UserRejectedError();
    }
    throw e;
  }
}
