import Link from "next/link";
import { redirect } from "next/navigation";
import { getGitHubAccessState, repository } from "@/lib/github";

export default async function AccessPage({ searchParams }: {
  searchParams: Promise<{ reason?: string; message?: string }>;
}) {
  const query = await searchParams;
  const access = await getGitHubAccessState();
  if (access.status === "authorized") redirect("/admin");

  const forbidden = access.status === "forbidden" || query.reason === "forbidden";
  const configurationMessage = access.status === "configuration-error"
    ? access.message
    : query.message;

  return (
    <div className="access-page">
      <section className="access-card">
        <span className="access-mark">P</span>
        <p className="eyebrow">Protected workspace</p>
        <h1>{forbidden ? "Repository access required" : "Connect your GitHub account"}</h1>
        <p className="access-copy">
          {forbidden
            ? `Your GitHub authorization does not include ${repository.owner}/${repository.name}. Ask for repository access, then try again.`
            : `Authorize with GitHub to view and edit ${repository.owner}/${repository.name}. Your access is limited by your own GitHub permissions.`}
        </p>
        {configurationMessage && <p className="access-error">{configurationMessage}</p>}
        <Link className="button button-dark access-button" href="/admin/authorize">
          <span className="github-glyph">●</span>
          {forbidden ? "Try another GitHub account" : "Continue with GitHub"}
        </Link>
        <small>Parasite never stores your GitHub token.</small>
      </section>
    </div>
  );
}
