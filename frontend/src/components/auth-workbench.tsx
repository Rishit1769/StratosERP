"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { roleBlueprints } from "@/lib/role-blueprints";

const API_URL_KEY = "stratos.apiBaseUrl";
const TOKEN_KEY = "stratos.jwtToken";
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

type LoginMode = "faculty" | "student";

export default function AuthWorkbench() {
  const [loginMode, setLoginMode] = useState<LoginMode>("faculty");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL);
  const [email, setEmail] = useState("admin@stratos.edu");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string>("");

  useEffect(() => {
    const savedBaseUrl = window.localStorage.getItem(API_URL_KEY);
    const savedToken = window.localStorage.getItem(TOKEN_KEY);

    if (savedBaseUrl) {
      setApiBaseUrl(savedBaseUrl);
    }

    if (savedToken) {
      setTokenPreview(savedToken);
    }
  }, []);

  const endpoint = useMemo(() => {
    return loginMode === "faculty" ? "/api/auth/login/faculty" : "/api/auth/login/student";
  }, [loginMode]);

  async function handleLogin(): Promise<void> {
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: apiBaseUrl,
          path: endpoint,
          method: "POST",
          bodyText: JSON.stringify({ email, password }),
        }),
      });

      const payload = (await response.json()) as {
        data: {
          success?: boolean;
          message?: string;
          data?: {
            token?: string;
          };
        };
        status?: number;
        error?: string;
      };

      if (!response.ok) {
        setFeedback(payload.error || "Unable to complete login request.");
        return;
      }

      const token = payload.data?.data?.token;
      if (!token) {
        setFeedback("Login succeeded but token was not present in response payload.");
        return;
      }

      window.localStorage.setItem(API_URL_KEY, apiBaseUrl.trim() || DEFAULT_BASE_URL);
      window.localStorage.setItem(TOKEN_KEY, token);
      setTokenPreview(token);
      setFeedback("Token saved. You can open any role deck and run protected endpoints.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unexpected login error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-zinc-900">Auth Boot Console</h2>
          <p className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-100">Proxy-Driven</p>
        </div>
        <p className="mt-2 text-sm text-zinc-600">
          Authenticate once, store the JWT in local storage, and stress-test each module from a shared role sandbox.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Login Mode</span>
            <select
              value={loginMode}
              onChange={(event) => setLoginMode(event.target.value as LoginMode)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
            >
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Backend API Base URL</span>
            <input
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
              placeholder="http://localhost:5000"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
              placeholder="admin@stratos.edu"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
              placeholder="password123"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="mt-5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-500"
        >
          {loading ? "Logging in..." : `Login via ${endpoint}`}
        </button>

        {feedback ? <p className="mt-4 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700">{feedback}</p> : null}

        <div className="mt-4 rounded-2xl bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Stored Token Preview</p>
          <p className="mt-2 break-all text-xs text-zinc-100">{tokenPreview || "No token saved yet."}</p>
        </div>
      </article>

      <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <h3 className="text-xl font-semibold text-zinc-900">Role Test Decks</h3>
        <p className="mt-2 text-sm text-zinc-600">Open any role deck to run endpoint actions and inspect live response payloads.</p>

        <ul className="mt-4 space-y-3">
          {roleBlueprints.map((role) => (
            <li key={role.slug}>
              <Link
                href={`/mock/${role.slug}`}
                className="block rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:border-zinc-400 hover:bg-white"
              >
                <p className="text-sm font-semibold text-zinc-900">{role.roleName}</p>
                <p className="mt-1 text-xs text-zinc-600">{role.strapline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
