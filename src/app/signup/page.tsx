import type { Metadata } from "next";
import AuthLayout from "@/components/auth/AuthLayout";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return <AuthLayout mode="signup" />;
}
