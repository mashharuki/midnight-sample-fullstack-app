import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const truncateAddress = (address: string): string => {
  if (address.length < 32) return address;
  return `${address.substring(0, 8)}...${address.substring(22, 28)}...${address.substring(address.length - 8)}`;
};

export const copyToClipboard = (text: string): Promise<void> =>
  navigator.clipboard.writeText(text);

const DENOMINATION = 1_000_000_000n; // 1 tDUST = 10^9 base units

function formatBigIntBalance(n: bigint): string {
  const whole = n / DENOMINATION;
  const frac = n % DENOMINATION;
  if (frac === 0n) return whole.toLocaleString();
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole.toLocaleString()}.${fracStr}`;
}

/**
 * Formats a Lace v4 balance API response into a human-readable tDUST string.
 * Handles: BigInt, number, string, UTXO map {tokenId: BigInt}, and {balance, cap} objects.
 */
export const formatBalance = (raw: unknown): string => {
  if (raw === null || raw === undefined) return "--";
  if (typeof raw === "bigint") return formatBigIntBalance(raw);
  if (typeof raw === "number") {
    const n = BigInt(Math.round(raw));
    return formatBigIntBalance(n);
  }
  if (typeof raw === "string") {
    try {
      return formatBigIntBalance(BigInt(raw));
    } catch {
      return raw || "--";
    }
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // Known key patterns (dust: {balance, cap}, others)
    const known = obj.amount ?? obj.value ?? obj.balance ?? obj.total ?? obj.dust;
    if (known !== undefined) return formatBalance(known);
    // UTXO map pattern: { [tokenId]: BigInt } — sum all BigInt values
    const bigintValues = Object.values(obj).filter(
      (v): v is bigint => typeof v === "bigint",
    );
    if (bigintValues.length > 0) {
      const total = bigintValues.reduce((sum, v) => sum + v, 0n);
      return formatBigIntBalance(total);
    }
    try {
      return JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    } catch {
      return String(raw);
    }
  }
  return String(raw);
};
