/**
 * API Services Index
 *
 * Centralized exports for cross-feature API service modules.
 * Single-feature API services are now co-located in their feature directories
 * (e.g. @/features/auth, @/features/integrations, etc.).
 *
 * @example
 * ```typescript
 * import { userService, apiClient } from '@/services/api';
 * import { authService } from '@/features/auth';
 * ```
 */

// Export the configured API client
export * as assistantService from "./assistant";
export * from "./assistant";
export { apiClient } from "./client";
export * as complianceService from "./compliance";
export * as containerService from "./container";
export * from "./container";
export * as domainsService from "./domains";
export * from "./domains";
export * as feedService from "./feed";
export * from "./feed";
export * as githubService from "./github";
export * from "./github";
export * as graphQLService from "./graphql";
export * from "./graphql";
export * as integrationService from "./integration";
export * from "./integration";
export * as inventoryService from "./inventory";
export * from "./inventory";
export * as invitationService from "./invitation";
export * from "./invitation";
export * as organizationService from "./organization";
export * from "./organization";
export * as userService from "./user";
export * from "./user";
