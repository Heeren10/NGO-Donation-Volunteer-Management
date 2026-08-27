import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Button, Input, Label } from "@/components/ui";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function register(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const skills = String(formData.get("skills") || "").trim();
    const location = String(formData.get("location") || "").trim();
    if (!name || !email || !password) return;

    let result: { access_token: string } | null = null;
    try {
      result = await api.auth.register({
        name,
        email,
        password,
        skills: skills || undefined,
        location: location || undefined,
      });
    } catch {
      // falls through to the error redirect below
    }

    if (!result) redirect("/register?error=1");
    await setToken(result.access_token);
    redirect("/my");
  }

  return (
    <div className="grid min-h-screen sm:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground sm:flex">
        <DotGrid />
        <span className="relative flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles size={16} strokeWidth={2.5} />
          NGO Platform
        </span>
        <div className="relative flex flex-col gap-2 animate-fade-up" style={{ animationDelay: "40ms" }}>
          <h1 className="max-w-sm text-3xl font-semibold tracking-tight text-balance">
            Find events that need exactly what you're good at.
          </h1>
          <p className="max-w-sm text-sm text-primary-foreground/80">
            Set your skills once, browse events, and apply in a click — staff reviews and confirms.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1 animate-fade-up">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Create your volunteer account</h2>
            <p className="text-sm text-muted">Staff accounts are created separately by an admin.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-text animate-fade-up">
              <TriangleAlert size={14} className="shrink-0" />
              That email is already registered.
            </div>
          )}

          <form action={register} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 animate-fade-up" style={{ animationDelay: "40ms" }}>
              <Label>Name</Label>
              <Input name="name" required placeholder="Jane Doe" autoFocus />
            </div>
            <div className="flex flex-col gap-1 animate-fade-up" style={{ animationDelay: "70ms" }}>
              <Label>Email</Label>
              <Input name="email" type="email" required placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-1 animate-fade-up" style={{ animationDelay: "100ms" }}>
              <Label>Password</Label>
              <Input name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
            </div>
            <div className="flex flex-col gap-1 animate-fade-up" style={{ animationDelay: "130ms" }}>
              <Label>Skills</Label>
              <Input name="skills" placeholder="first-aid, logistics" />
            </div>
            <div className="flex flex-col gap-1 animate-fade-up" style={{ animationDelay: "160ms" }}>
              <Label>Location</Label>
              <Input name="location" placeholder="Optional" />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "190ms" }}>
              <Button type="submit" className="w-full">
                Create account
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-muted animate-fade-up" style={{ animationDelay: "220ms" }}>
            Already have an account? <Link href="/login" className="font-medium text-primary-text hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function DotGrid() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
      <pattern id="dots-register" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.6" fill="currentColor" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#dots-register)" />
    </svg>
  );
}
