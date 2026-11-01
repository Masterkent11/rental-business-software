import { Suspense } from "react";
import { AuthSession, AuthLoading } from "@/components/auth/auth-layout";
import "@/components/auth/auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<AuthLoading />}><AuthSession>{children}</AuthSession></Suspense>;
}
