import { getDashboardKpis } from "@/actions/reports";
import { DashboardView } from "@/components/owner/dashboard-view";
import { requireRolePage } from "@/lib/auth/require-role";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";

export default async function OwnerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const [params] = await Promise.all([
    searchParams,
    requireRolePage(["OWNER"]),
  ]);
  const data = await getDashboardKpis(rangeFromSearchParams(params));
  return <DashboardView data={data} />;
}
