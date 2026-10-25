import type { ChangePasswordRequest, ServerResponse, UpdateUserRequest, User } from "@/types";

import { ensureData } from "@/lib/errors";

import { apiClient } from "./client";

/**
 * Get the current authenticated user's profile
 *
 * @returns User profile data
 * @throws {ApiError} If user is not authenticated or request fails
 *
 * @example
 * ```typescript
 * const user = await userService.getProfile();
 * console.log(user.email, user.name);
 * ```
 */
export const getProfile = async (): Promise<User> => {
  const response = await apiClient.get<ServerResponse<{ user: User }>>("/api/v1/user");
  return ensureData(response.data.data?.user, "Failed to fetch user profile");
};

/**
 * Update the current user's profile information
 *
 * @param data - User data to update (name, email, etc.)
 * @returns Updated user profile
 * @throws {ApiError} If update fails (validation error, unauthorized, etc.)
 *
 * @example
 * ```typescript
 * const updatedUser = await userService.updateProfile({
 *   name: 'Jane Doe',
 *   email: 'jane@example.com'
 * });
 * ```
 */
export const updateProfile = async (data: UpdateUserRequest): Promise<User> => {
  const response = await apiClient.put<ServerResponse<User>>("/api/v1/user/profile", data);
  return ensureData(response.data.data, "Failed to update user profile");
};

/**
 * Change the current user's password
 *
 * @param data - Password change request containing current and new password
 * @throws {ApiError} If password change fails (wrong current password, validation error, etc.)
 *
 * @example
 * ```typescript
 * await userService.changePassword({
 *   currentPassword: 'oldpassword',
 *   newPassword: 'newsecurepassword'
 * });
 * ```
 */
export const changePassword = async (data: ChangePasswordRequest): Promise<void> => {
  await apiClient.post("/api/v1/user/change-password", data);
};
