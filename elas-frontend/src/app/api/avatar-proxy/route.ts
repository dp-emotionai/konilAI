import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBackendApiBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    "";

  if (!raw) {
    throw new Error("Backend API URL is not configured");
  }

  const clean = raw.replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        { message: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const backendApiBaseUrl = getBackendApiBaseUrl();

    const backendRes = await fetch(`${backendApiBaseUrl}/auth/avatar`, {
      method: "GET",
      headers: {
        Authorization: authorization,
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!backendRes.ok) {
      const text = await backendRes.text().catch(() => "");
      return NextResponse.json(
        {
          message: "Failed to load avatar",
          status: backendRes.status,
          details: text,
        },
        { status: backendRes.status }
      );
    }

    const contentType =
      backendRes.headers.get("content-type") || "image/jpeg";

    const body = await backendRes.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        message: "Avatar proxy failed",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}