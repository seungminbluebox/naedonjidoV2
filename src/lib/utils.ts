import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWithCommas(value: string | number | undefined) {
  if (value === undefined || value === null || value === "") return "";
  const str = value.toString().replace(/,/g, "");
  const num = parseFloat(str);
  if (isNaN(num)) return str;
  return num.toLocaleString();
}

export function parseNumber(value: string): number {
  return parseFloat(value.replace(/,/g, "")) || 0;
}
