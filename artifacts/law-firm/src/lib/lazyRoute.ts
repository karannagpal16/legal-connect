import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_KEY = "lc_chunk_reload";

export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || error || "");
  const name = String((error as { name?: string })?.name || "");
  return (
    name === "ChunkLoadError"
    || /Failed to fetch dynamically imported module/i.test(message)
    || /error loading dynamically imported module/i.test(message)
    || /Importing a module script failed/i.test(message)
    || /Loading chunk [\w-]+ failed/i.test(message)
    || /Loading CSS chunk [\w-]+ failed/i.test(message)
  );
}

function reloadOnceForChunkError(): Promise<never> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Chunk load failed"));
  }
  if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
    // Never resolve while the browser reloads so React.lazy does not paint a broken route.
    return new Promise(() => undefined);
  }
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  return Promise.reject(
    new Error("This screen could not load updated app files. Refresh once more, or return home."),
  );
}

/** Clear the one-shot reload latch after a successful boot. */
export function clearChunkReloadLatch() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

async function loadWithRetry<T>(loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (!isChunkLoadError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      // Retry once — often recovers from a transient network blip.
      return await loader();
    } catch (retryError) {
      if (isChunkLoadError(retryError)) return reloadOnceForChunkError();
      throw retryError;
    }
  }
}

/** Named-export lazy loader with chunk-failure retry + one auto reload. */
export function lazyNamed<T extends Record<string, ComponentType<any>>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K,
): LazyExoticComponent<T[K]> {
  return lazy(async () => {
    const mod = await loadWithRetry(loader);
    const Component = mod[name];
    if (!Component) {
      throw new Error(`Route module is missing export "${String(name)}".`);
    }
    return { default: Component };
  }) as LazyExoticComponent<T[K]>;
}

/** Default-export lazy loader with the same recovery behavior. */
export function lazyDefault<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => loadWithRetry(loader));
}
