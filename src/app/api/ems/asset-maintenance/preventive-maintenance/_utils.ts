import { NextResponse } from "next/server";

export const DIRECTUS_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || ""
).replace(/\/+$/, "");
export const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

export type DirectusList<T> = {
  data?: T[];
  meta?: { filter_count?: number | string };
};
export type DirectusItem<T> = { data?: T };

export class DirectusRequestError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "DirectusRequestError";
    this.status = status;
    this.body = body;
  }
}

export function jsonError(error: unknown, fallback = "Internal Server Error") {
  if (error instanceof DirectusRequestError) {
    return NextResponse.json(
      { error: error.message, details: error.body },
      { status: error.status || 500 },
    );
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

export async function directusFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!DIRECTUS_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }
  if (!DIRECTUS_TOKEN) {
    throw new Error("DIRECTUS_STATIC_TOKEN is not configured");
  }

  const url = `${DIRECTUS_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new DirectusRequestError(
      `Directus request failed (${res.status})`,
      res.status,
      text,
    );
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
