// Loader hooks (thread terpisah): mock next/* dan resolusi import tanpa ekstensi ke .ts.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers" || specifier === "next/cache" || specifier === "next/navigation") {
    return { url: "mock:" + specifier, shortCircuit: true };
  }
  if (specifier === "server-only") {
    return { url: "mock:server-only", shortCircuit: true };
  }
  // Resolusi relatif tanpa ekstensi → coba .ts / .tsx
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/i.test(specifier)) {
    try {
      const r = await nextResolve(specifier, context);
      return r;
    } catch {
      for (const ext of [".ts", ".tsx"]) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === "mock:server-only") {
    return { format: "module", shortCircuit: true, source: "export default {};" };
  }
  if (url === "mock:next/headers") {
    return {
      format: "module",
      shortCircuit: true,
      source: `
        const jar = globalThis.__cookieJar;
        export async function cookies() {
          return {
            get: (name) => jar.has(name) ? { name, value: jar.get(name) } : undefined,
            set: (name, value) => { jar.set(name, typeof value === 'string' ? value : value.value); },
            delete: (name) => { jar.delete(name); },
            has: (name) => jar.has(name),
          };
        }
      `,
    };
  }
  if (url === "mock:next/cache") {
    return {
      format: "module",
      shortCircuit: true,
      source: `export function revalidatePath(p) { globalThis.__revalidated.push(p); }
               export function revalidateTag(t) { globalThis.__revalidated.push(t); }`,
    };
  }
  if (url === "mock:next/navigation") {
    return {
      format: "module",
      shortCircuit: true,
      source: `export function redirect(url) { globalThis.__redirects.push(url); const e = new Error('NEXT_REDIRECT'); e.digest = 'NEXT_REDIRECT;' + url; throw e; }
               export function notFound() { const e = new Error('NEXT_NOT_FOUND'); e.digest = 'NEXT_NOT_FOUND'; throw e; }`,
    };
  }
  return nextLoad(url, context);
}
