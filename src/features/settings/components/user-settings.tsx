"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";

import { SettingsSection } from "./settings-section";
import { useUserSettings } from "../hooks/use-user-settings";

const footerClassName = "border-t border-[#eaeaea] bg-[#fafafa] dark:border-border dark:bg-card";

export function UserSettings() {
  const { formData, handleSubmit, isLoading, setFormData, user } = useUserSettings();

  if (!user) {
    return <div className="py-6 text-sm text-muted-foreground">User information not available.</div>;
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(e);
      }}
    >
      <SettingsSection
        description="Your email address is used for login and notifications."
        footer={
          <Button
            className="h-8 bg-[#1a1a1a] px-4 text-sm font-medium text-white hover:bg-[#333] disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            disabled={isLoading}
            size="sm"
            type="submit"
          >
            {isLoading ? <Spinner className="mr-2 size-3.5" /> : null}
            Save
          </Button>
        }
        footerClassName={footerClassName}
        footerHint="Please use a valid email address."
        title="Email Address"
      >
        <Input
          disabled={isLoading}
          id="user-email"
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, email: e.target.value }));
          }}
          placeholder="Enter your email"
          required
          type="email"
          value={formData.email}
        />
      </SettingsSection>

      <SettingsSection
        description="Your name as it appears on your profile."
        footer={
          <Button
            className="h-8 bg-[#1a1a1a] px-4 text-sm font-medium text-white hover:bg-[#333] disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            disabled={isLoading}
            size="sm"
            type="submit"
          >
            {isLoading ? <Spinner className="mr-2 size-3.5" /> : null}
            Save
          </Button>
        }
        footerClassName={footerClassName}
        footerHint="Please use 32 characters at maximum per name."
        title="Full Name"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <Input
            disabled={isLoading}
            id="user-first-name"
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, first_name: e.target.value }));
            }}
            placeholder="First name"
            value={formData.first_name}
          />
          <Input
            disabled={isLoading}
            id="user-last-name"
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, last_name: e.target.value }));
            }}
            placeholder="Last name"
            value={formData.last_name}
          />
        </div>
      </SettingsSection>
    </form>
  );
}
