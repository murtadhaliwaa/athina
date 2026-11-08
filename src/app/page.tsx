import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/guard";
import { roleHome } from "@/lib/auth/permissions";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (!profile?.isActive) {
    redirect("/login");
  }
  redirect(roleHome(profile.role));
}
