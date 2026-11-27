// Dijalankan di MAIN thread via --import. Inisialisasi state mock + daftarkan loader.
import { register } from "node:module";

globalThis.__cookieJar = new Map();
globalThis.__revalidated = [];
globalThis.__redirects = [];

register(new URL("./test-mocks.mjs", import.meta.url));
