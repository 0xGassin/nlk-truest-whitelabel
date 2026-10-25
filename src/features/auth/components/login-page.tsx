import { Suspense } from "react";

import { AuthLayout } from "./auth-layout";
import { LoginForm } from "./login-form";

export function LoginPage({ local = false }: { local?: boolean }) {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <LoginForm local={local} />
      </Suspense>
    </AuthLayout>
  );
}
