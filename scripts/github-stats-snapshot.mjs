#!/usr/bin/env node
// Saves GitHub traffic, stars, and release downloads to .drafts/github-stats/.
// GitHub keeps traffic and referrers for only 14 days, so run this at least weekly.
// Needs `gh` signed in with push access to the repositories.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repos = ["murlexander/louppe-media-culler", "murlexander/louppe-website"];
const api = (path) => JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8" }));

const snapshot = { recorded_at: new Date().toISOString(), repos: {} };
for (const repo of repos) {
  const info = api(`repos/${repo}`);
  const releases = api(`repos/${repo}/releases?per_page=100`);
  snapshot.repos[repo] = {
    stars: info.stargazers_count,
    forks: info.forks_count,
    views: api(`repos/${repo}/traffic/views`),
    clones: api(`repos/${repo}/traffic/clones`),
    referrers: api(`repos/${repo}/traffic/popular/referrers`),
    paths: api(`repos/${repo}/traffic/popular/paths`),
    release_downloads: Object.fromEntries(
      releases.map((r) => [r.tag_name, r.assets.reduce((n, a) => n + a.download_count, 0)])
    ),
  };
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", ".drafts", "github-stats");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${snapshot.recorded_at.slice(0, 10)}.json`);
writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");
console.log(file);
