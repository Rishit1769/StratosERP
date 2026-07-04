"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { RoleSlug } from "@/lib/permissions/role-blueprints";

const TOKEN_KEY = "stratos.jwtToken";
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const ALLOWED_EMAIL_DOMAINS = ["@tcetmumbai.in", "@stratos.erp"];

const ROLE_TO_SLUG: Record<string, RoleSlug> = {
  Admin: "admin",
  HOD: "hod",
  ClassIncharge: "class-incharge",
  SubjectIncharge: "subject-incharge",
  PracticalTeacher: "practical-teacher",
  TG: "teacher-guardian",
  Student: "student",
};

const ACCESS_POINTS = [
  "Institution-wide configuration and term controls",
  "Department operations, faculty deployment, and escalation",
  "Role-based academic, practical, and student support workflows",
] as const;

const TRUST_MARKERS = ["Monochrome command surface", "Role-routed portals", "Institutional access only"] as const;

type LoginApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    admin?: {
      role?: string;
    };
    faculty?: {
      role?: string;
    };
    student?: {
      role?: string;
    };
  };
};

type ProxyResponse = {
  ok?: boolean;
  status?: number;
  data?: LoginApiResponse;
  error?: string;
};

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as { role?: unknown };

    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

function extractRole(loginData?: LoginApiResponse["data"]): string | null {
  const adminRole = loginData?.admin?.role;
  if (typeof adminRole === "string") return adminRole;

  const facultyRole = loginData?.faculty?.role;
  if (typeof facultyRole === "string") return facultyRole;

  const studentRole = loginData?.student?.role;
  if (typeof studentRole === "string") return studentRole;

  if (typeof loginData?.token === "string") {
    return decodeJwtRole(loginData.token);
  }

  return null;
}

export default function AuthWorkbench() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@tcetmumbai.in");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setFeedback("Please enter both email and password.");
      return;
    }

    if (!ALLOWED_EMAIL_DOMAINS.some((domain) => trimmedEmail.toLowerCase().endsWith(domain))) {
      setFeedback(`Only ${ALLOWED_EMAIL_DOMAINS.join(" or ")} email addresses are allowed.`);
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const loginPaths = ["/api/auth/login/admin", "/api/auth/login/faculty", "/api/auth/login/student"];
      let lastErrorMessage = "Invalid credentials. Please check your email and password.";

      for (const path of loginPaths) {
        const response = await fetch("/api/proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            baseUrl: DEFAULT_BASE_URL,
            path,
            method: "POST",
            bodyText: JSON.stringify({ email: trimmedEmail, password }),
          }),
        });

        const payload = (await response.json()) as ProxyResponse;

        if (!response.ok) {
          setFeedback(payload.error || "Unable to complete login request.");
          return;
        }

        const loginData = payload.data?.data;
        const token = loginData?.token;
        if (payload.ok && token) {
          window.localStorage.setItem(TOKEN_KEY, token);
          const role = extractRole(loginData);
          const roleSlug = role ? ROLE_TO_SLUG[role] : undefined;

          if (!roleSlug) {
            setFeedback("Login successful, but your role is not mapped to a portal yet.");
            return;
          }

          setFeedback(`Login successful. Redirecting to ${role} portal...`);
          router.push(`/dashboard/${roleSlug}`);
          return;
        }

        if (payload.data?.message) {
          lastErrorMessage = payload.data.message;
        }
      }

      setFeedback(lastErrorMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected login error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mono-shell">
      <a href="#portal-access" className="mono-button-primary sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-50">
        Skip to portal access
      </a>
      <section className="mx-auto grid min-h-[100dvh] w-full max-w-[1280px] gap-12 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-12 lg:py-14">
        <div className="flex flex-col justify-between gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="mono-kicker">Institutional Educational ERP</span>
              <span aria-hidden="true" className="h-4 w-4 border border-[var(--border)]" />
            </div>

            <div className="mono-rule-ultra pt-6">
              <p className="mono-display">STRATOS</p>
              <p className="mono-title mt-4 max-w-2xl text-4xl sm:text-5xl">A stark command surface for academic operations.</p>
            </div>

            <p className="mono-lead max-w-xl">
              Move from launcher to role-specific control rooms with a monochrome system built for governance,
              accountability, and institutional clarity.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="mono-grid mono-card space-y-5">
              <p className="mono-kicker">Access landscape</p>
              <ul className="space-y-4">
                {ACCESS_POINTS.map((item) => (
                  <li key={item} className="grid grid-cols-[auto_1fr] gap-4">
                    <span aria-hidden="true" className="mt-1 h-3 w-3 border border-[var(--border)]" />
                    <span className="mono-body text-base text-[var(--foreground)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 border-l border-[var(--border)] pl-6">
              {TRUST_MARKERS.map((marker) => (
                <p key={marker} className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  {marker}
                </p>
              ))}
            </div>
          </div>
        </div>

        <section id="portal-access" className="mono-card mono-diagonal flex items-center">
          <div className="w-full space-y-8 bg-[var(--background)] p-6 sm:p-8">
            <div className="space-y-3">
              <p className="mono-kicker">Portal access</p>
              <div className="mono-rule pt-5">
                <h1 className="mono-title text-4xl sm:text-5xl">Enter the authorised portal.</h1>
              </div>
              <p className="mono-body max-w-md">
                Use an institutional address ending in {ALLOWED_EMAIL_DOMAINS.join(" or ")} to unlock the correct
                dashboard route.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6">
              <label className="block">
                <span className="mono-kicker">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mono-input mt-2"
                  placeholder="admin@tcetmumbai.in"
                  autoComplete="email"
                  title="Use your institutional email"
                  required
                />
              </label>

              <label className="block">
                <span className="mono-kicker">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mono-input mt-2"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" disabled={loading} className="mono-button-primary w-full sm:w-auto">
                  {loading ? "Logging in" : "Access portal"}
                  <span aria-hidden="true">→</span>
                </button>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Role-aware redirect after sign-in
                </p>
              </div>
            </form>

            {feedback ? <p className="mono-feedback text-sm">{feedback}</p> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
