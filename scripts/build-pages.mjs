// Builds a fully static export of the app for GitHub Pages: one prerendered HTML "shell" that
// the client-side router takes over from entirely in the browser. There's no server on GitHub
// Pages, so anything that depends on one (real login/signup, AI plan generation) won't work in
// this build — this is for viewing the UI, not a substitute for a real deployment.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(root, "dist", "client");
const shellFile = path.join(clientDir, "_shell.html");
const outDir = path.join(root, "prodbuild");

async function main() {
  await fs.rm(path.join(root, "dist"), { recursive: true, force: true });
  // Runs the real `vite build` CLI (not the JS build() API) — TanStack Start's prerender step
  // hooks into the CLI's build lifecycle and doesn't run via a bare programmatic build() call.
  execFileSync("npx", ["vite", "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, BUILD_TARGET: "pages" },
    shell: process.platform === "win32",
  });

  const shellHtml = await fs.readFile(shellFile, "utf8");

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.cp(clientDir, outDir, { recursive: true });
  await fs.rm(path.join(outDir, "_shell.html"), { force: true });

  // GitHub Pages has no server-side routing, so every path must resolve to this same shell —
  // the client-side router then reads the real URL and renders the right screen. Serving it as
  // both index.html (root) and 404.html (Pages' fallback for unmatched paths) covers that.
  await fs.writeFile(path.join(outDir, "index.html"), shellHtml);
  await fs.writeFile(path.join(outDir, "404.html"), shellHtml);
  await fs.writeFile(path.join(outDir, ".nojekyll"), "");

  console.log(`\nStatic GitHub Pages build ready at ${path.relative(root, outDir)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
