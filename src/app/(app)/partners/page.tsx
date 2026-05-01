import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PartnersPageView } from "@/components/partners/PartnersPageView";
import {
  getBindingRequests,
  getMyIdentityCode,
} from "@/features/partner-binding/actions";
import { listManagePartners } from "@/features/partners/queries";

export default function PartnersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Loading...</div>}>
      <PartnersPageData />
    </Suspense>
  );
}

async function PartnersPageData() {
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
