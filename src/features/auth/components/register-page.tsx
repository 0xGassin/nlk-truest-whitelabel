"use client";

import { AuthLayout } from "./auth-layout";
import { RegisterForm } from "./register-form";

export function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
