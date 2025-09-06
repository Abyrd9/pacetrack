export function getBaseApiUrl() {
  if (typeof window !== "undefined") {
    if (!import.meta.env.VITE_API_URL)
      throw new Error("VITE_API_URL is not set");
    return import.meta.env.VITE_API_URL;
  }

  // If Bun is defined, get it from Bun, else get it from process.env
  if (typeof Bun !== "undefined") {
    if (!Bun.env.API_URL) throw new Error("API_URL is not set");
    return Bun.env.API_URL;
  }

  if (!process.env.API_URL) throw new Error("API_URL is not set");
  return process.env.API_URL;
}
