import { NextResponse } from "next/server";

export function jsonSuccess(data: unknown, init?: ResponseInit, message?: string) {
  return NextResponse.json(
    {
      success: true,
      ...(message ? { message } : {}),
      ...(data !== undefined ? { data } : {}),
    },
    init
  );
}

export function jsonError(message: string, status = 400, error?: unknown) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(error !== undefined ? { error } : {}),
    },
    { status }
  );
}
