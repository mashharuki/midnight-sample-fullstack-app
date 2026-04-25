// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { CompiledContract } from "@midnight-ntwrk/compact-js";
import type {
    DeployedContract,
    FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type {
    AnyProvableCircuitId,
    MidnightProviders,
} from "@midnight-ntwrk/midnight-js-types";
import { type CounterPrivateState } from "contract";

export type CounterCircuits = AnyProvableCircuitId;

export const CounterPrivateStateId = "counterPrivateState";

export type CounterProviders = MidnightProviders<
  CounterCircuits,
  typeof CounterPrivateStateId,
  CounterPrivateState
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CounterContract = CompiledContract.CompiledContract<any, CounterPrivateState>;

export type DeployedCounterContract =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | DeployedContract<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | FoundContract<any>;
