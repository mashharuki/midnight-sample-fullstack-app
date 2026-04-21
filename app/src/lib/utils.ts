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
