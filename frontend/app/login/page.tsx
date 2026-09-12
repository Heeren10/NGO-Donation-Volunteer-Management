import { redirect } from "next/navigation";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { AuthLayout, Button, Input, Label } from "@/components/ui";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    let result: { access_token: string; role: "admin" | "volunteer" } | null = null;
    try {
      result = await api.auth.login({ email, password });
    } catch {
      // falls through to the error redirect below
    }

    if (!result) redirect("/login?error=1");
    await setToken(result.access_token);
    redirect(result.role === "admin" ? "/" : "/my");
  }

  return (
    <AuthLayout
      heroTitle="Run donors, volunteers, and campaigns from one place."
      heroSubtitle="Real donation tracking, real volunteer coordination, and an AI-written impact summary you can actually send to donors."
    >
      <div className="flex flex-col gap-1 animate-fade-up">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Sign in</h2>
        <p className="text-sm text-muted">Staff and volunteers use the same login.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text animate-fade-up">
          <TriangleAlert size={14} className="shrink-0" />
          Incorrect email or password.
        </div>
      )}

      <form action={login} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <Label>Email</Label>
          <Input name="email" type="email" required placeholder="you@example.com" autoFocus />
        </div>
        <div className="flex flex-col gap-1 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <Label>Password</Label>
          <Input name="password" type="password" required placeholder="••••••••" />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-muted animate-fade-up" style={{ animationDelay: "160ms" }}>
        New volunteer? <Link href="/register" className="font-medium text-primary-text hover:underline">Create an account</Link>
      </p>
      <p className="text-center text-sm text-muted animate-fade-up" style={{ animationDelay: "190ms" }}>
        Just want to give? <Link href="/donate" className="font-medium text-primary-text hover:underline">Donate without an account</Link>
      </p>
    </AuthLayout>
  );
}
