import type { ClassValue } from "clsx";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { API_BASE_URL } from "@/config";

/**
 * Merges Tailwind CSS classes with proper precedence handling.
 *
 * Combines clsx for conditional classes with tailwind-merge to handle
 * conflicting Tailwind utility classes correctly.
 *
 * @param inputs - Class values to merge
 * @returns Merged class string
 *
 * @example
 * ```typescript
 * cn("px-2 py-1", condition && "bg-blue-500", "px-4") // "py-1 bg-blue-500 px-4"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a URL for an identicon (unique avatar) for the given input.
 *
 * The identicon is generated server-side based on email or other identifier.
 *
 * @param input - Email or identifier to generate identicon for
 * @returns URL to the identicon image, or empty string if no input provided
 *
 * @example
 * ```typescript
 * const avatarUrl = getIdenticonUrl('user@example.com');
 * // Returns: "https://api.example.com/api/v1/auth/identicon?email=user%40example.com"
 * ```
 */
export function getIdenticonUrl(input: string) {
  if (!input) return "";
  return `${API_BASE_URL}/api/v1/auth/identicon?email=${encodeURIComponent(input)}`;
}

/** Returns a deterministic DiceBear identicon for a user or other identifier. */
export function getDiceBearIdenticonUrl(seed: string) {
  if (!seed) return "";
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
}
