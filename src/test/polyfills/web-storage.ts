/**
 * Web Storage polyfill for the test environment.
 *
 * Node >= 22 defines `globalThis.localStorage` as an own accessor that returns
 * `undefined` unless the process was started with `--localstorage-file`.
 * Vitest's jsdom environment then refuses to copy jsdom's REAL Storage onto
 * the global object, because its key filter is "already present on the global?
 * then only copy it if it is on my own KEYS list" -- and localStorage /
 * sessionStorage are not on that list:
 *
 *   if (k in global) return keysArray.includes(k);   // vitest getWindowKeys
 *
 * populateGlobal also aliases `window` to that same global object, so every
 * `window.localStorage` access -- in app code and in tests alike -- resolves
 * to Node's disabled accessor and reads as `undefined`. Nothing is wrong with
 * jsdom (it does provide a working Storage) or with the product; this is a
 * Node-version-dependent hole in the harness. Without this, 9 tests fail on
 * Node 26 that pass unchanged on Node 20/22.
 *
 * localStorage and sessionStorage are the only two shadowed names that resolve
 * to `undefined` -- every other key vitest skips is a real, working Node
 * global -- so the surface here is exactly these two properties.
 *
 * Considered and rejected: handing tests jsdom's own Storage via
 * `globalThis.jsdom.window.localStorage`. It is more faithful (real
 * StorageEvent, per-origin semantics), but `globalThis.jsdom` is a vitest
 * internal rather than public API, and this codebase's storage usage is
 * getItem/setItem/removeItem/clear only.
 */

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key(index: number) {
      return [...entries.keys()][index] ?? null;
    },
    getItem(key: string) {
      const storageKey = String(key);
      return entries.has(storageKey) ? entries.get(storageKey)! : null;
    },
    setItem(key: string, value: string) {
      entries.set(String(key), String(value));
    },
    removeItem(key: string) {
      entries.delete(String(key));
    },
    clear() {
      entries.clear();
    },
  } as Storage;
}

function isUsableStorage(value: unknown): value is Storage {
  return Boolean(value)
    && typeof (value as Storage).getItem === "function"
    && typeof (value as Storage).setItem === "function";
}

function installOne(key: "localStorage" | "sessionStorage") {
  let existing: unknown;
  // Reading can itself throw: a blocked-storage context exposes the property
  // but rejects access to it.
  try {
    existing = (globalThis as unknown as Record<string, unknown>)[key];
  } catch {
    existing = undefined;
  }
  // On a Node version without the experimental Web Storage global, jsdom's
  // real Storage is already in place and this is a complete no-op.
  if (isUsableStorage(existing)) return;

  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, key, { value: storage, configurable: true, writable: true, enumerable: false });
  // Vitest currently aliases `window` to the global object, so the line above
  // is enough. Defend against that changing.
  const win = (globalThis as { window?: object }).window;
  if (win && win !== globalThis) {
    Object.defineProperty(win, key, { value: storage, configurable: true, writable: true, enumerable: false });
  }
}

export function installWebStoragePolyfill() {
  installOne("localStorage");
  installOne("sessionStorage");
}
