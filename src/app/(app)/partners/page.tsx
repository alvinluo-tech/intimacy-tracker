import { TopBar } from "@/components/layout/TopBar";
import { PartnersPageView } from "@/components/partners/PartnersPageView";
import {
  getBindingRequests,
  getMyIdentityCode,
} from "@/features/partner-binding/actions";
import { listManagePartners } from "@/features/partners/queries";

export default async function PartnersPage() {
  const [partners, identityCode, requests] = await Promise.all([
    listManagePartners(),
    getMyIdentityCode(),
    getBindingRequests(),
  ]);

  return (
    <div className="min-h-[100svh]">
      <PartnersPageView
        partners={partners}
        identityCode={identityCode}
        incomingRequests={requests.incoming}
        outgoingRequests={requests.outgoing}
      />
    </div>
  );
}
