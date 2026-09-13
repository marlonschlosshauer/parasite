import { UserAuthorizationRequiredError } from "@vercel/connect";
import { syncWorkspace } from "@/lib/entries";
import { GitHubSessionRequiredError } from "@/lib/github";
import { WorkspaceTargetSchema } from "@/lib/workspace-target";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "The workspace request must be valid JSON." }, { status: 400 });
  }

  const target = WorkspaceTargetSchema.safeParse(input);
  if (!target.success) {
    return Response.json({ error: "The workspace target is invalid." }, { status: 400 });
  }

  try {
    return Response.json(await syncWorkspace(target.data));
  } catch (error) {
    if (error instanceof GitHubSessionRequiredError || error instanceof UserAuthorizationRequiredError) {
      return Response.json({ error: "GitHub authorization is required." }, { status: 401 });
    }
    return Response.json({
      error: error instanceof Error ? error.message : "The workspace could not be synchronized.",
    }, { status: 500 });
  }
}
