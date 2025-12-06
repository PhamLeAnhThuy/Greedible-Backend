import { NextResponse } from "next/server";
import { authenticateToken } from "@/src/lib/auth/middleware";

export async function GET(request: Request) {
  const auth = await authenticateToken(request);

  if (auth.error) {
    return NextResponse.json(auth.error, { status: auth.error.status });
  }

  return NextResponse.json(auth.user);
}
