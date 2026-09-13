import "server-only";

import { redirect } from "next/navigation";
import { getGitHubAccessState } from "@/lib/github";

export async function requireGitHubAccess() {
  const access = await getGitHubAccessState();
  if (access.status === "authorized") return access;
  redirect(`/admin/access?reason=${access.status}`);
}
