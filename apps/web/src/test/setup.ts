import "@testing-library/jest-dom";

// Node 22+ exposes an experimental global `localStorage` (enabled by
// `--localstorage-file`) that shadows the working implementation jsdom
// provides. Without a backing file its methods throw ("getItem is not a
// function"), which breaks any component that reads theme/auth state from
// storage during render. Install a simple in-memory Storage so tests get a
// functional localStorage regardless of the Node version.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

// jsdom doesn't implement matchMedia, which the theme hook relies on to read
// the system color-scheme preference. Provide a minimal stub.
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
});
