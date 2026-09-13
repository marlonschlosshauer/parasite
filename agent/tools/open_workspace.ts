import { defineTool } from "eve/tools";
import { WorkspaceSchema } from "../lib/github";
import { initializeWorkspace } from "../lib/workspace";

export default defineTool({
  description: "Clone and bind the configured repository branch to this conversation before inspecting or editing files.",
  inputSchema: WorkspaceSchema,
  async execute(input, ctx) {
    const subjectId = ctx.session.auth.current?.principalId;
    const initiatorId = ctx.session.auth.initiator?.principalId;
    if (!subjectId || subjectId !== initiatorId) {
      throw new Error("Only the user who opened this conversation may access its workspace.");
    }
    return initializeWorkspace(await ctx.getSandbox(), input, subjectId);
  },
});
