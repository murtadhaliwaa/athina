import { OffersPanel } from "@/components/owner/offers-panel";
import { listOffersForOwner } from "@/actions/offers";

export default async function OwnerOffersPage() {
  const offers = await listOffersForOwner();
  return <OffersPanel offers={offers} />;
}
