import { createServer } from "vite";

const vite = await createServer({
  configFile: new URL("../vite.config.ts", import.meta.url).pathname,
  server: { middlewareMode: true },
  ssr: { noExternal: ["@workspace/api-client-react"] },
  appType: "custom",
});

let failed = 0;

try {
  const { auditPrimaryRoutes } = await vite.ssrLoadModule("/src/audit/renderRoutes.tsx");
  const results = auditPrimaryRoutes();
  for (const result of results) {
    if (result.ok) {
      console.log(`PASS ${result.route.padEnd(24)} ${result.bytes} bytes`);
    } else {
      failed += 1;
      console.error(`FAIL ${result.route.padEnd(24)} ${result.error}`);
    }
  }
  globalThis.auditedRouteCount = results.length;
} finally {
  await vite.close();
}

if (failed) {
  console.error(`\n${failed} route render audit${failed === 1 ? "" : "s"} failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${globalThis.auditedRouteCount} routed screens rendered non-empty output.`);
}
