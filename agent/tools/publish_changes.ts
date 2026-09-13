import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { publishWorkspace } from "../lib/workspace";

export default defineTool({
  description: "Commit all reviewed sandbox changes and push them to the feature branch bound to this conversation. Never works on the default branch.",
  inputSchema: z.object({
    message: z.string().trim().min(3).max(120).describe("Concise Git commit message"),
  }).strict(),
  approval: always(),
  async execute({ message }, ctx) {
    const subjectId = ctx.session.auth.current?.principalId;
    const initiatorId = ctx.session.auth.initiator?.principalId;
    if (!subjectId || subjectId !== initiatorId) {
      throw new Error("Only the user who opened this conversation may publish its changes.");
    }
    return publishWorkspace(await ctx.getSandbox(), subjectId, message);
  },
});
