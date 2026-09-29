export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export const appUrl = () => requireEnv("BETTER_AUTH_URL").replace(/\/$/, "");
