import type { Metadata } from "next";
import AuthLayout from "@/components/auth/AuthLayout";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return <AuthLayout mode="signin" />;
}
