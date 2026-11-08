import { readFileSync, writeFileSync, existsSync } from "fs";

function harden(url) {
  const u = new URL(url);
  if (!u.searchParams.has("connect_timeout")) {
    u.searchParams.set("connect_timeout", "10");
  }
  if (!u.searchParams.has("pool_timeout")) {
    u.searchParams.set("pool_timeout", "10");
  }
  if (u.port === "6543" && !u.searchParams.has("connection_limit")) {
    u.searchParams.set("connection_limit", "1");
  }
  if (u.port === "6543" && !u.searchParams.has("pgbouncer")) {
    u.searchParams.set("pgbouncer", "true");
  }
  return u.toString();
}

function patchFile(file) {
  if (!existsSync(file)) return false;
  let text = readFileSync(file, "utf8");
  let changed = false;
  text = text.replace(/^(DATABASE_URL)=(.*)$/m, (_, key, raw) => {
    const val = raw.trim().replace(/^"|"$/g, "");
    if (!val.startsWith("postgres")) return `${key}=${raw}`;
    const next = harden(val);
    changed = true;
    return `${key}="${next}"`;
  });
  if (changed) writeFileSync(file, text.endsWith("\n") ? text : text + "\n");
  return changed;
}

const a = patchFile(".env.local");
const b = patchFile(".env");
console.log("updated", { ".env.local": a, ".env": b });
