import inject from "@rollup/plugin-inject";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import { createRequire } from "module";
import stdLibBrowser from "node-stdlib-browser";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import wasm from "vite-plugin-wasm";

const _require = createRequire(import.meta.url);

// Resolve compact-runtime dist directory
const compactRuntimeDir = path.join(
  path.dirname(_require.resolve("@midnight-ntwrk/compact-runtime/package.json")),
  "dist",
);
// object-inspect is a nested dep of compact-runtime — resolve from its own scope
const compactRuntimeRequire = createRequire(
  path.join(compactRuntimeDir, "runtime.js"),
);
const objectInspectPath = compactRuntimeRequire.resolve("object-inspect");
// Resolve onchain-runtime browser entry explicitly (avoid Node's `node` condition)
const onchainRuntimeBrowserPath = path.join(
  path.dirname(compactRuntimeRequire.resolve("@midnight-ntwrk/onchain-runtime")),
  "midnight_onchain_runtime_wasm.js",
);

// NOTE: reactEsmShimPlugin was removed. Vite's needsInterop mechanism handles
// React CJS→ESM named export interop natively. All React packages have
// needsInterop:true which makes Vite generate proxy modules with named exports.
// The shim created a second React instance causing "Invalid hook call".
/**
 * Virtual ESM shim for @midnight-ntwrk/compact-runtime.
 *
 * compact-runtime/dist/runtime.js is a CJS file with chained exports assignments
 * (exports.A = exports.B = void 0) that @rollup/plugin-commonjs cannot statically
 * analyse for named exports. This plugin intercepts the package import and inlines
 * all 4 CJS sub-files (version, utils, contract-dependencies, runtime) inside a
 * single IIFE, resolving the circular dependency between runtime ↔ contract-deps.
 */
function compactRuntimeEsmShimPlugin(crDir: string, inspectPath: string, onchainRuntimePath: string): Plugin {
  const COMPACT_RUNTIME_ID = "\0virtual:compact-runtime-shim";

  const versionCode = fs.readFileSync(path.join(crDir, "version.js"), "utf-8");
  const utilsCode = fs.readFileSync(path.join(crDir, "utils.js"), "utf-8");
  const contractDepsCode = fs.readFileSync(path.join(crDir, "contract-dependencies.js"), "utf-8");
  const runtimeCode = fs.readFileSync(path.join(crDir, "runtime.js"), "utf-8");
  const inspectCode = fs.readFileSync(inspectPath, "utf-8");

  return {
    name: "compact-runtime-esm-shim",
    enforce: "pre",
    resolveId(id, importer) {
      if (id === "@midnight-ntwrk/compact-runtime") return COMPACT_RUNTIME_ID;
      // Help Rollup resolve @midnight-ntwrk/onchain-runtime when imported from
      // the virtual module (which has no file-system base path)
      if (id === "@midnight-ntwrk/onchain-runtime" && importer === COMPACT_RUNTIME_ID) {
        return onchainRuntimePath;
      }
    },
    load(id) {
      if (id !== COMPACT_RUNTIME_ID) return;
      return `
import * as _onchainRuntime from "@midnight-ntwrk/onchain-runtime";

// object-inspect (no external deps)
var _inspectExports = {};
(function(module, exports, require) {
${inspectCode}
})({ exports: _inspectExports }, _inspectExports, function(id) {
  // util.inspect is only used for custom inspection symbols — stub it for browser
  if (id === './util.inspect') { var f = function(){}; return f; }
  throw new Error("[object-inspect-shim] Unknown module: " + id);
});
var _inspect = _inspectExports;

// version.js
var _versionExports = {};
(function(exports) {
${versionCode}
})(_versionExports);

// utils.js
var _utilsExports = {};
(function(exports) {
${utilsCode}
})(_utilsExports);

// Pre-allocate shared exports objects to resolve the circular dependency:
// runtime.js → contract-dependencies.js → runtime.js
var _runtimeExports = {};
var _contractDepsExports = {};

// runtime.js (requires: ./version, ./contract-dependencies, @midnight-ntwrk/onchain-runtime, object-inspect)
(function(exports, require) {
${runtimeCode}
})(_runtimeExports, function(moduleId) {
  if (moduleId === "./version") return _versionExports;
  if (moduleId === "./contract-dependencies") return _contractDepsExports;
  if (moduleId === "@midnight-ntwrk/onchain-runtime") return _onchainRuntime;
  if (moduleId === "object-inspect") return _inspect;
  throw new Error("[compact-runtime-shim] Unknown module: " + moduleId);
});

// contract-dependencies.js (requires: ./runtime, ./utils)
(function(exports, require) {
${contractDepsCode}
})(_contractDepsExports, function(moduleId) {
  if (moduleId === "./runtime") return _runtimeExports;
  if (moduleId === "./utils") return _utilsExports;
  throw new Error("[compact-deps-shim] Unknown module: " + moduleId);
});

export const {
  BooleanDescriptor, Bytes32Descriptor, CoinInfoDescriptor, CoinRecipientDescriptor,
  CompactError, CompactTypeBoolean, CompactTypeBytes, CompactTypeCurvePoint,
  CompactTypeEnum, CompactTypeField, CompactTypeMerkleTreeDigest,
  CompactTypeMerkleTreePath, CompactTypeMerkleTreePathEntry, CompactTypeOpaqueString,
  CompactTypeOpaqueUint8Array, CompactTypeUnsignedInteger, CompactTypeVector,
  ContractAddressDescriptor, ContractMaintenanceAuthority, ContractOperation,
  ContractState, CostModel, DUMMY_ADDRESS, MAX_FIELD, MaxUint8Descriptor, NetworkId,
  QueryContext, QueryResults, StateBoundedMerkleTree, StateMap, StateValue,
  VmResults, VmStack, ZswapCoinPublicKeyDescriptor,
  addField, alignedConcat, assert, bigIntToValue, checkProofData, coinCommitment,
  constructorContext, contractDependencies, convertBytesToField, convertBytesToUint,
  convertFieldToBytes, createZswapInput, createZswapOutput, decodeCoinInfo,
  decodeCoinPublicKey, decodeContractAddress, decodeQualifiedCoinInfo, decodeRecipient,
  decodeTokenType, decodeZswapLocalState, degradeToTransient, dummyContractAddress,
  ecAdd, ecMul, ecMulGenerator, emptyZswapLocalState, encodeCoinInfo, encodeCoinPublicKey,
  encodeContractAddress, encodeQualifiedCoinInfo, encodeRecipient, encodeTokenType,
  encodeZswapLocalState, hasCoinCommitment, hashToCurve, leafHash, maxAlignedSize,
  mulField, ownPublicKey, persistentCommit, persistentHash, runProgram,
  sampleContractAddress, sampleSigningKey, sampleTokenType, signData,
  signatureVerifyingKey, subField, tokenType, transientCommit, transientHash,
  type_error, upgradeFromTransient, valueToBigInt, verifySignature, versionString, witnessContext,
} = _runtimeExports;
export default _runtimeExports;
`;
    },
  };
}

/**
 * Production-only React ESM shim.
 *
 * In dev mode, Vite pre-bundles React via esbuild with needsInterop:true, which
 * generates named-export proxy modules automatically — no shim needed.
 * In production (Rollup), React's index.js has a conditional require() that
 * Rollup's commonjs plugin cannot statically analyse for named exports.
 * This plugin (apply:'build') intercepts all React imports and inlines the CJS
 * production files as IIFEs, providing explicit named ESM exports.
 */
function reactBuildShimPlugin(): Plugin {
  const rDir = path.dirname(_require.resolve("react/package.json"));
  const rdDir = path.dirname(_require.resolve("react-dom/package.json"));
  // scheduler is a peer dep of react-dom; resolve from react-dom's scope
  const rdRequire = createRequire(path.join(rdDir, "package.json"));
  const schedDir = path.dirname(rdRequire.resolve("scheduler/package.json"));
  // use-sync-external-store is used by react-i18next; resolve from its scope
  const rI18nDir = path.dirname(_require.resolve("react-i18next/package.json"));
  const rI18nRequire = createRequire(path.join(rI18nDir, "package.json"));
  const usseDir = path.dirname(rI18nRequire.resolve("use-sync-external-store/package.json"));

  const REACT_ID = "\0virtual:react-build";
  const REACT_DOM_ID = "\0virtual:react-dom-build";
  const REACT_DOM_CLIENT_ID = "\0virtual:react-dom-client-build";
  const JSX_RUNTIME_ID = "\0virtual:jsx-runtime-build";
  const JSX_DEV_RUNTIME_ID = "\0virtual:jsx-dev-runtime-build";
  const USSE_SHIM_ID = "\0virtual:use-sync-external-store-shim-build";

  return {
    name: "react-build-shim",
    apply: "build",
    enforce: "pre",
    resolveId(id) {
      if (id === "react") return REACT_ID;
      if (id === "react-dom") return REACT_DOM_ID;
      if (id === "react-dom/client") return REACT_DOM_CLIENT_ID;
      if (id === "react/jsx-runtime") return JSX_RUNTIME_ID;
      if (id === "react/jsx-dev-runtime") return JSX_DEV_RUNTIME_ID;
      if (id === "use-sync-external-store/shim") return USSE_SHIM_ID;
    },
    load(id) {
      if (id === REACT_ID) {
        const cjsCode = fs.readFileSync(path.join(rDir, "cjs/react.production.js"), "utf-8");
        return `
var _r = {};
(function(exports) {
${cjsCode}
})(_r);
export const {
  Activity, Children, Component, Fragment, Profiler, PureComponent,
  StrictMode, Suspense,
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  __COMPILER_RUNTIME,
  cache, cacheSignal, cloneElement, createContext, createElement, createRef,
  forwardRef, isValidElement, lazy, memo, startTransition,
  unstable_useCacheRefresh, use, useActionState, useCallback, useContext,
  useDebugValue, useDeferredValue, useEffect, useEffectEvent, useId,
  useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo,
  useOptimistic, useReducer, useRef, useState, useSyncExternalStore,
  useTransition, version,
} = _r;
export default _r;
`;
      }
      if (id === REACT_DOM_ID) {
        const cjsCode = fs.readFileSync(path.join(rdDir, "cjs/react-dom.production.js"), "utf-8");
        return `
import _react from "react";
var _rd = {};
(function(exports, require) {
${cjsCode}
})(_rd, function(id) {
  if (id === "react") return _react;
  throw new Error("[react-dom-build-shim] Unknown module: " + id);
});
export const {
  __DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  createPortal, flushSync, preconnect, prefetchDNS, preinit, preinitModule,
  preload, preloadModule, requestFormReset, unstable_batchedUpdates,
  useFormState, useFormStatus, version,
} = _rd;
export default _rd;
`;
      }
      if (id === REACT_DOM_CLIENT_ID) {
        const schedCode = fs.readFileSync(path.join(schedDir, "cjs/scheduler.production.js"), "utf-8");
        const cjsCode = fs.readFileSync(path.join(rdDir, "cjs/react-dom-client.production.js"), "utf-8");
        return `
import _react from "react";
import _rd from "react-dom";
var _sched = {};
(function(exports) {
${schedCode}
})(_sched);
var _rdc = {};
(function(exports, require) {
${cjsCode}
})(_rdc, function(id) {
  if (id === "react") return _react;
  if (id === "react-dom") return _rd;
  if (id === "scheduler") return _sched;
  throw new Error("[react-dom-client-build-shim] Unknown module: " + id);
});
export const { createRoot, hydrateRoot } = _rdc;
export default _rdc;
`;
      }
      if (id === JSX_RUNTIME_ID) {
        const cjsCode = fs.readFileSync(path.join(rDir, "cjs/react-jsx-runtime.production.js"), "utf-8");
        return `
import _react from "react";
var _jsx = {};
(function(exports, require) {
${cjsCode}
})(_jsx, function(id) {
  if (id === "react") return _react;
  throw new Error("[react-jsx-runtime-build-shim] Unknown module: " + id);
});
export const { Fragment, jsx, jsxs } = _jsx;
export default _jsx;
`;
      }
      if (id === JSX_DEV_RUNTIME_ID) {
        const cjsCode = fs.readFileSync(path.join(rDir, "cjs/react-jsx-dev-runtime.production.js"), "utf-8");
        return `
import _react from "react";
var _jsxd = {};
(function(exports, require) {
${cjsCode}
})(_jsxd, function(id) {
  if (id === "react") return _react;
  throw new Error("[react-jsx-dev-runtime-build-shim] Unknown module: " + id);
});
export const { Fragment, jsxDEV } = _jsxd;
export default _jsxd;
`;
      }
      if (id === USSE_SHIM_ID) {
        const cjsCode = fs.readFileSync(path.join(usseDir, "cjs/use-sync-external-store-shim.production.js"), "utf-8");
        return `
import _react from "react";
var _usse = {};
(function(exports, require) {
${cjsCode}
})(_usse, function(id) {
  if (id === "react") return _react;
  throw new Error("[use-sync-external-store-shim-build] Unknown module: " + id);
});
export const { useSyncExternalStore } = _usse;
export default _usse;
`;
      }
    },
  };
}

export default defineConfig({
  plugins: [
    reactBuildShimPlugin(),
    compactRuntimeEsmShimPlugin(compactRuntimeDir, objectInspectPath, onchainRuntimeBrowserPath),
    react(),
    tailwindcss(),
    wasm(),
    inject({ process: "process/browser", Buffer: ["buffer", "Buffer"] }),
  ],
  resolve: {
    // Force all packages to resolve a single copy of React so hooks from
    // react-i18next and app code share the same dispatcher.
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Node.js stdlib browser polyfills
      ...Object.entries(stdLibBrowser).map(([find, replacement]) => ({
        find,
        replacement: replacement as string,
      })),
    ],
  },
  optimizeDeps: {
    // Exclude packages that esbuild cannot handle:
    // - compact-runtime: CJS with require("@midnight-ntwrk/onchain-runtime") which loads WASM (TLA)
    // - onchain-runtime: ESM that imports .wasm with top-level await
    // level-private-state-provider is intentionally NOT excluded so esbuild can
    // convert level/browser.js (CJS exports.Level = ...) to ESM named exports.
    exclude: [
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/onchain-runtime",
    ],
    // Pre-bundle the contract workspace package so esbuild can transform the
    // compiled Compact contract (managed/counter/contract/index.cjs) from CJS
    // to ESM. Without this, Vite serves index.cjs raw and `require()` fails in
    // the browser. compact-runtime is excluded above so esbuild marks it as an
    // external import — handled by our virtual shim plugin at runtime.
    include: [
      "contract",
      // Explicitly pre-bundle React and react-dom/client so esbuild can split
      // them into the shared chunk (chunk-OJL3457Z.js). needsInterop:true on
      // all of these tells Vite to generate named-export proxy modules.
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
  },
  worker: {
    format: "es",
    plugins: () => [wasm()],
  },
});
