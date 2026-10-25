/**
 * Date formatting utilities
 *
 * Centralized date formatting functions for consistent display across the application.
 */

/**
 * Format a date string as a relative time (e.g., "2h ago", "3d ago")
 */
export function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${String(Math.floor(seconds / 60))}m ago`;
  if (seconds < 86_400) return `${String(Math.floor(seconds / 3600))}h ago`;
  if (seconds < 604_800) return `${String(Math.floor(seconds / 86_400))}d ago`;
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format a date string in a human-readable format (e.g., "Jan 15, 2024")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date as ISO date string (YYYY-MM-DD)
 */
export function formatISODate(dateString: string): string {
  return new Date(dateString).toISOString().split("T")[0];
}
