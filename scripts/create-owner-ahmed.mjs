import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";

const email = "ahmed@athena-cafe.local";
const username = "ahmed";
const fullName = "أحمد";
const password = `AhmedOwner!${randomBytes(5).toString("base64url")}9xA`;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("مفاتيح Supabase ناقصة");

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient();

const list = await admin.auth.admin.listUsers({ perPage: 200 });
let user = list.data.users.find(
  (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
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
  console.log("CREATED");
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    app_metadata: { role: "OWNER" },
  });
  if (updated.error) throw updated.error;
  console.log("UPDATED");
}

const taken = await prisma.profile.findUnique({ where: { username } });
if (taken && taken.id !== user.id) {
  throw new Error(`اسم المستخدم ${username} مستخدم لحساب آخر`);
}

await prisma.profile.upsert({
  where: { id: user.id },
  create: {
    id: user.id,
    username,
    fullName,
    role: "OWNER",
    isActive: true,
  },
  update: {
    username,
    fullName,
    role: "OWNER",
    isActive: true,
  },
});

const text = [
  "حساب المالك: أحمد",
  `البريد: ${email}`,
  `كلمة المرور: ${password}`,
  `اسم المستخدم (داخلي): ${username}`,
  "الدخول: /login → دخول المالك",
  "",
  "هذا الملف محلي ولا يُرفع إلى Git.",
].join("\n");

writeFileSync("AHMED_OWNER_CREDENTIALS.local.txt", `${text}\n`);
console.log(text);

await prisma.$disconnect();
