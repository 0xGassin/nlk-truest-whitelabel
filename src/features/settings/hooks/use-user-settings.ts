import type { UpdateUserRequest } from "@/types";

import * as React from "react";

import { toast } from "@/components/ui/toast/toast";
import { useAuth } from "@/lib/auth";
import { parseApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { userService } from "@/services/api";

export function useUserSettings() {
  const { setUser, user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: user?.email ?? "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
  });

  // Update form data when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
      });
    }
  }, [user?.email, user?.first_name, user?.last_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("User not found", { description: "Please log in again." });
      return;
    }

    setIsLoading(true);

    try {
      const updateData: UpdateUserRequest = {};

      if (formData.email && formData.email !== user.email) {
        updateData.email = formData.email;
      }

      if (formData.first_name !== (user.first_name ?? "")) {
        updateData.first_name = formData.first_name || undefined;
      }

      if (formData.last_name !== (user.last_name ?? "")) {
        updateData.last_name = formData.last_name || undefined;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info("No changes to save", { description: "Your profile is already up to date." });
        setIsLoading(false);
        return;
      }

      const updatedUser = await userService.updateProfile(updateData);

      // Update user context with new data
      setUser({
        ...user,
        ...updatedUser,
      });

      toast.success("Profile updated", { description: "Your personal information has been saved." });
    } catch (error: unknown) {
      logger.error("Update profile error", error);
      const apiError = parseApiError(error);
      toast.error("Failed to update profile", { description: apiError.message });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: user?.email ?? "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
    });
  };

  return {
    formData,
    handleSubmit,
    isLoading,
    resetForm,
    setFormData,
    user,
  };
}
