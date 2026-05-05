"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActionBlueprint, RoleBlueprint } from "@/lib/role-blueprints";

type ActionState = {
  loading: boolean;
  status?: number;
  ok?: boolean;
  durationMs?: number;
  target?: string;
  payload?: unknown;
  error?: string;
};

const API_URL_KEY = "stratos.apiBaseUrl";
const TOKEN_KEY = "stratos.jwtToken";
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

function prettyPrint(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to display response payload.";
  }
}

function methodTone(method: ActionBlueprint["method"]): string {
  if (method === "GET") return "bg-sky-100 text-sky-800";
  if (method === "POST") return "bg-emerald-100 text-emerald-800";
  if (method === "PUT") return "bg-amber-100 text-amber-800";
  return "bg-zinc-200 text-zinc-700";
}

export default function RoleWorkspace({ role }: { role: RoleBlueprint }) {
  const initialBodyMap = useMemo(() => {
    return role.actions.reduce<Record<string, string>>((acc, action) => {
      acc[action.id] = action.body ? JSON.stringify(action.body, null, 2) : "";
      return acc;
    }, {});
  }, [role.actions]);

  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_BASE_URL);
  const [token, setToken] = useState("");
  const [bodyMap, setBodyMap] = useState<Record<string, string>>(initialBodyMap);
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedBaseUrl = window.localStorage.getItem(API_URL_KEY);
    const savedToken = window.localStorage.getItem(TOKEN_KEY);

    if (savedBaseUrl) {
      setApiBaseUrl(savedBaseUrl);
    }

    if (savedToken) {
      setToken(savedToken);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    setBodyMap(initialBodyMap);
    setActionState({});
  }, [initialBodyMap]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(API_URL_KEY, apiBaseUrl.trim() || DEFAULT_BASE_URL);
  }, [apiBaseUrl, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(TOKEN_KEY, token.trim());
  }, [token, hydrated]);

  async function runAction(action: ActionBlueprint): Promise<void> {
    const bodyText = bodyMap[action.id] || "";

    if (action.method !== "GET" && action.method !== "DELETE" && bodyText.trim()) {
      try {
        JSON.parse(bodyText);
      } catch {
        setActionState((prev) => ({
          ...prev,
          [action.id]: {
            loading: false,
            error: "Body must be valid JSON before sending.",
          },
        }));
        return;
      }
    }

    setActionState((prev) => ({
      ...prev,
      [action.id]: { loading: true },
    }));

    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: apiBaseUrl,
          path: action.path,
          method: action.method,
          token,
          bodyText,
        }),
      });

      const proxyPayload = (await response.json()) as {
        ok: boolean;
        status: number;
        durationMs: number;
        target: string;
        data: unknown;
        error?: string;
      };

      if (!response.ok) {
        setActionState((prev) => ({
          ...prev,
          [action.id]: {
            loading: false,
            error: proxyPayload.error || "Proxy request failed.",
            status: proxyPayload.status,
            ok: false,
            durationMs: proxyPayload.durationMs,
            target: proxyPayload.target,
            payload: proxyPayload.data,
          },
        }));
        return;
      }

      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          loading: false,
          status: proxyPayload.status,
          ok: proxyPayload.ok,
          durationMs: proxyPayload.durationMs,
          target: proxyPayload.target,
          payload: proxyPayload.data,
        },
      }));
    } catch (error) {
      setActionState((prev) => ({
        ...prev,
        [action.id]: {
          loading: false,
          error: error instanceof Error ? error.message : "Unknown network error.",
        },
      }));
    }
  }

  return (
    <div className="space-y-8">
      <section
        className="rounded-3xl border border-white/30 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.35)]"
        style={{
          backgroundImage: `linear-gradient(135deg, ${role.accentFrom}, ${role.accentTo})`,
        }}
      >
        <p className="text-xs uppercase tracking-[0.22em] text-white/80">Role Sandbox</p>
        <h1 className="mt-2 text-3xl font-semibold">{role.roleName} Command Deck</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/90">{role.strapline}</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {role.kpis.map((item) => (
            <article key={item.label} className="rounded-2xl bg-black/20 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-white/75">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs text-white/80">{item.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Execution Context</h2>
            <p className="mt-1 text-sm text-zinc-600">Persisted in local storage for quick module switching.</p>
          </div>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Backend API Base URL</span>
            <input
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
              placeholder="http://localhost:5000"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">JWT Token</span>
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
              placeholder="Paste Bearer token value only"
            />
          </label>

          <button
            type="button"
            onClick={() => setToken("")}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
          >
            Clear Token
          </button>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Workflow Priorities</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              {role.checkpoints.map((point) => (
                <li key={point} className="rounded-xl bg-zinc-100 px-3 py-2">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-5">
          {role.actions.map((action) => {
            const state = actionState[action.id];
            const bodyText = bodyMap[action.id] || "";

            return (
              <article
                key={action.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${methodTone(action.method)}`}>
                    {action.method}
                  </span>
                  <code className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-zinc-100">{action.path}</code>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-zinc-900">{action.label}</h3>
                <p className="mt-1 text-sm text-zinc-600">{action.description}</p>

                {action.method !== "GET" && action.method !== "DELETE" ? (
                  <label className="mt-4 block">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Request Body (JSON)</span>
                    <textarea
                      value={bodyText}
                      onChange={(event) =>
                        setBodyMap((prev) => ({
                          ...prev,
                          [action.id]: event.target.value,
                        }))
                      }
                      rows={9}
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white"
                    />
                  </label>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => runAction(action)}
                    disabled={state?.loading}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-500"
                  >
                    {state?.loading ? "Running request..." : "Run Request"}
                  </button>

                  {state?.status ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${state.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      HTTP {state.status}
                    </span>
                  ) : null}

                  {state?.durationMs !== undefined ? (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      {state.durationMs} ms
                    </span>
                  ) : null}
                </div>

                {state?.target ? (
                  <p className="mt-4 break-all rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
                    Target: {state.target}
                  </p>
                ) : null}

                {state?.error ? (
                  <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
                ) : null}

                {state?.payload !== undefined ? (
                  <pre className="mt-4 max-h-80 overflow-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs text-zinc-100">
                    {prettyPrint(state.payload)}
                  </pre>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
