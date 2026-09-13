import { NextResponse } from "next/server";
import {
  getGitHubAccessState,
  getGitHubSubjectId,
  githubSubjectCookie,
} from "@/lib/github";

export async function POST() {
  const subjectId = await getGitHubSubjectId();
  const access = await getGitHubAccessState();
  if (!subjectId || access.status !== "authorized") {
    return NextResponse.json({ message: "GitHub repository access is required." }, { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(githubSubjectCookie, subjectId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
