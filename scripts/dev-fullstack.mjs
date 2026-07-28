import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const children = [
  spawn(process.execPath, ["artifacts/api-server/server.js"], { cwd: root, stdio: "inherit" }),
  spawn("pnpm", ["--dir", "artifacts/law-firm", "dev"], { cwd: root, stdio: "inherit" }),
];

let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 150);
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!closing && code && signal !== "SIGTERM") close(code);
  });
}

process.on("SIGINT", () => close(0));
process.on("SIGTERM", () => close(0));
