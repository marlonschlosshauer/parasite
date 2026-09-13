import { eveChannel } from "eve/channels/eve";
import type { AuthFn } from "eve/channels/auth";
import { ForbiddenError, UnauthenticatedError } from "eve/channels/auth";
import {
  assertSameOrigin,
  getAgentGitHubToken,
  subjectFromCookie,
} from "../lib/github";

const githubSession = (): AuthFn<Request> => async (request) => {
  try {
    assertSameOrigin(request);
  } catch {
    throw new ForbiddenError({ message: "Cross-origin agent requests are not allowed." });
  }

  const subjectId = subjectFromCookie(request);
  if (!subjectId) {
    throw new UnauthenticatedError({
      code: "github_authorization_required",
      message: "Authorize GitHub before using the agent.",
    });
  }

  try {
    await getAgentGitHubToken(subjectId);
  } catch {
    throw new ForbiddenError({ message: "GitHub repository access is required." });
  }

  return {
    attributes: {},
    authenticator: "parasite-github-connect",
    principalId: subjectId,
    principalType: "user",
  };
};

export default eveChannel({ auth: githubSession() });
