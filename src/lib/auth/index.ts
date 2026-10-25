// Re-export from features/auth for backward compatibility
// This allows existing imports from '@/lib/auth' to continue working
// eslint-disable-next-line import/no-restricted-paths
export { AuthGuard, useAuth, useAuthActions } from "@/features/auth";
