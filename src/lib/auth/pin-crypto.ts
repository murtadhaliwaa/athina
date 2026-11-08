import { createHmac } from "crypto";

/** نسخة نقية قابلة للاختبار (بدون قراءة env) */
export function derivePasswordWithPepper(
  username: string,
  pin: string,
  pepper: string
) {
  return createHmac("sha256", pepper).update(`${username}:${pin}`).digest("hex");
}

export const staffEmail = (username: string) =>
  `${username}@staff.cafe.local`;
