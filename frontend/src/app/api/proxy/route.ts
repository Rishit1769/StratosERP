import { NextRequest, NextResponse } from "next/server";

type ProxyBody = {
  baseUrl?: string;
  path?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token?: string;
  bodyText?: string;
};

function normalizeTarget(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProxyBody;

    const baseUrl = body.baseUrl?.trim() || "http://localhost:5000";
    const path = body.path?.trim();
    const method = body.method || "GET";

    if (!path) {
      return NextResponse.json(
        { error: "path is required" },
        { status: 400 }
      );
    }

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      return NextResponse.json(
        { error: "baseUrl must be a valid URL" },
        { status: 400 }
      );
    }

    if (parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only http and https protocols are supported." },
        { status: 400 }
      );
    }

    const target = normalizeTarget(baseUrl, path);

    const headers = new Headers();
    headers.set("Accept", "application/json, text/plain, */*");

    if (body.token?.trim()) {
      headers.set("Authorization", `Bearer ${body.token.trim()}`);
    }

    let upstreamBody: string | undefined;
    if (method !== "GET" && method !== "DELETE" && body.bodyText?.trim()) {
      headers.set("Content-Type", "application/json");
      upstreamBody = body.bodyText;
    }

    const startedAt = Date.now();
    const upstream = await fetch(target, {
      method,
      headers,
      body: upstreamBody,
      cache: "no-store",
    });
    const durationMs = Date.now() - startedAt;

    const rawText = await upstream.text();
    let data: unknown = rawText;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }
    } else {
      data = null;
    }

    return NextResponse.json({
      ok: upstream.ok,
      status: upstream.status,
      durationMs,
      target,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected proxy error.",
      },
      { status: 500 }
    );
  }
}
