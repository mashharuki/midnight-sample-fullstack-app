import type {
  DeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type {
  ImpureCircuitId,
  MidnightProviders,
} from "@midnight-ntwrk/midnight-js-types";
import { Counter, type CounterPrivateState } from "contract";

export type CounterCircuits = ImpureCircuitId<
  Counter.Contract<CounterPrivateState>
>;

export const CounterPrivateStateId = "counterPrivateState" as const;
export type CounterProviders = MidnightProviders<
  CounterCircuits,
  typeof CounterPrivateStateId,
  CounterPrivateState
>;
export type CounterContract = Counter.Contract<CounterPrivateState>;
export type DeployedCounterContract =
  | DeployedContract<CounterContract>
  | FoundContract<CounterContract>;
