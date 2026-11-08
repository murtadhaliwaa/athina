import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { writeFileSync, readFileSync, existsSync } from "fs";

config({ path: ".env.local", override: true });

const email = "murtadhaliwaa@gmail.com";
const password = `CafeOwner!${randomBytes(6).toString("base64url")}9A`;
const prisma = new PrismaClient();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("مفاتيح Supabase ناقصة");

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function upsertEnv(file, pairs) {
  if (!existsSync(file)) return;
  let text = readFileSync(file, "utf8");
  for (const [k, v] of Object.entries(pairs)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, `${k}=${v}`);
    else text = `${text.trimEnd()}\n${k}=${v}\n`;
  }
  writeFileSync(file, text.endsWith("\n") ? text : text + "\n");
}

const list = await admin.auth.admin.listUsers({ perPage: 200 });
let user = list.data.users.find(
  (u) => (u.email || "").toLowerCase() === email.toLowerCase()
);

if (!user) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "OWNER" },
  });
  if (created.error) throw created.error;
  user = created.data.user;
  console.log("OWNER_CREATED");
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    app_metadata: { role: "OWNER" },
  });
  if (updated.error) throw updated.error;
  console.log("OWNER_UPDATED");
}

await prisma.profile.upsert({
  where: { id: user.id },
  create: {
    id: user.id,
    username: "owner",
    fullName: "المالك",
    role: "OWNER",
  },
  update: {
    fullName: "المالك",
    role: "OWNER",
    isActive: true,
  },
});

upsertEnv(".env.local", {
  OWNER_EMAIL: email,
  OWNER_USER_ID: user.id,
  OWNER_FULL_NAME: "المالك",
});
upsertEnv(".env", {
  OWNER_EMAIL: email,
  OWNER_USER_ID: user.id,
  OWNER_FULL_NAME: "المالك",
});

console.log(`OWNER_EMAIL=${email}`);
console.log(`OWNER_ID=${user.id}`);
console.log(`OWNER_PASSWORD=${password}`);

await prisma.$disconnect();
