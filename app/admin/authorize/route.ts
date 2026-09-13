import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createGitHubAuthorizationUrl,
  getGitHubSubjectId,
  githubSubjectCookie,
} from "@/lib/github";

export async function GET(request: NextRequest) {
  const subjectId = await getGitHubSubjectId() ?? randomUUID();
  const callbackUrl = new URL("/admin/authorize/callback", request.nextUrl.origin).toString();

  try {
    const authorizationUrl = await createGitHubAuthorizationUrl(subjectId, callbackUrl);
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(githubSubjectCookie, subjectId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    const url = new URL("/admin/access", request.nextUrl.origin);
    url.searchParams.set("reason", "configuration-error");
    if (error instanceof Error) url.searchParams.set("message", error.message);
    return NextResponse.redirect(url);
  }
}
