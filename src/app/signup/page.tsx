import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <AuthForm mode="signup" />
    </div>
  );
}
