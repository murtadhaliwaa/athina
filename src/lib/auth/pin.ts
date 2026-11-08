import "server-only";

import { getPinPepper } from "@/lib/env";
import {
  derivePasswordWithPepper,
  staffEmail,
} from "@/lib/auth/pin-crypto";

export { derivePasswordWithPepper, staffEmail };

export function derivePassword(username: string, pin: string) {
  return derivePasswordWithPepper(username, pin, getPinPepper());
}
