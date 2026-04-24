import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { assertIsContractAddress } from "@midnight-ntwrk/midnight-js-utils";
import type { CounterPrivateState } from "contract";
import { Counter, witnesses } from "contract";
import * as Rx from "rxjs";
import type {
  CounterContract,
  CounterProviders,
  DeployedCounterContract,
} from "./counter-types";
import { CounterPrivateStateId } from "./counter-types";

export const counterContractInstance: CounterContract =
  new Counter.Contract<CounterPrivateState>(witnesses);

const INITIAL_PRIVATE_STATE: CounterPrivateState = { privateCounter: 0 };

/**
 * 既存コントラクトに接続する。
 */
export const joinCounterContract = async (
  providers: CounterProviders,
  contractAddress: string,
): Promise<DeployedCounterContract> => {
  return findDeployedContract(
    providers as Parameters<typeof findDeployedContract>[0],
    {
      contractAddress: contractAddress as ContractAddress,
      contract: counterContractInstance,
      privateStateId: CounterPrivateStateId,
      initialPrivateState: INITIAL_PRIVATE_STATE,
    },
  ) as unknown as Promise<DeployedCounterContract>;
};

/**
 * カウンター値をインクリメントする。トランザクションがファイナライズされるまで待機する。
 */
export const incrementCounter = async (
  counterContract: DeployedCounterContract,
): Promise<void> => {
  // increment() を呼び出してトランザクションを送信
  await counterContract.callTx.increment();
};

/**
 * 現在のカウンター値を1回取得する（単発クエリ）。
 */
export const getCounterValue = async (
  providers: CounterProviders,
  contractAddress: ContractAddress,
): Promise<bigint | null> => {
  assertIsContractAddress(contractAddress);
  // コントラクトの状態をクエリしてカウンター値を取得
  const contractState = await providers.publicDataProvider.queryContractState(
    contractAddress,
  );
  return contractState != null
    ? Counter.ledger(contractState.data).round
    : null;
};

/**
 * コントラクト状態の変更を Observable で監視する。
 */
export const subscribeToCounterState = (
  providers: CounterProviders,
  contractAddress: ContractAddress,
): Rx.Observable<bigint> => {
  return providers.publicDataProvider
    .contractStateObservable(contractAddress, { type: "latest" })
    .pipe(
      Rx.map((contractState) => Counter.ledger(contractState.data).round),
    );
};
