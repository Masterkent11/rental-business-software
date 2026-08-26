import { Plus, Rotate3d } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, Panel, TableScroll, TopBar } from "@/components/owner/shell";
import { ListingStatus, Pill } from "@/components/owner/status";
import { listings, organization } from "@/lib/fixtures";
import { peso } from "@/lib/money";

/**
 * Listings.
 *
 * Two gates sit between a listing and the public, and they are different
 * things: the platform verifies the **organization** before it may publish
 * anything at all, and approves each **listing** before that one goes live.
 * Neither implies the other, so both are shown.
 *
 * Publish delegation is the owner's own setting: a property manager may always
 * prepare and submit, and may only publish if the owner has granted it.
 */
export default function ListingsPage() {
  const withTour = listings.filter((l) => l.hasTour).length;

  return (
    <>
      <TopBar
        title="Listings"
        caption={`${listings.length} listings · ${withTour} with a virtual tour`}
        action={
          <Button className="rounded-[11px]">
            <Plus className="size-4" /> New listing
          </Button>
        }
      />

      <Page>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Panel
            tone={organization.verified ? "plain" : "pending"}
            className="p-5"
          >
            <p className="label-caps text-muted-foreground">Organization</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-[15px] font-semibold">{organization.name}</p>
              <Pill variant={organization.verified ? "ok" : "pending"}>
                {organization.verified ? "Verified" : "Awaiting verification"}
              </Pill>
            </div>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              Verification gates publishing, not setup. Unverified, you can
              build everything and publish nothing.
            </p>
          </Panel>

          <Panel className="p-5">
            <p className="label-caps text-muted-foreground">
              Publish delegation
            </p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-[15px] font-semibold">
                {organization.publishDelegation ? "On" : "Off"}
              </p>
              <Pill variant="neutral">
                {organization.publishDelegation
                  ? "Managers can publish"
                  : "Owner sign-off required"}
              </Pill>
            </div>
            <p className="text-muted-foreground mt-2 text-[12.5px] leading-relaxed">
              Managers may always prepare, submit, and unpublish. Publishing an
              approved listing is yours unless you delegate it.
            </p>
          </Panel>
        </div>

        <Panel className="overflow-hidden">
          <TableScroll>
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-border text-muted-foreground border-b">
                  <th className="label-caps px-5 py-2.5 font-semibold">
                    Listing
                  </th>
                  <th className="label-caps hidden px-5 py-2.5 font-semibold md:table-cell">
                    Property
                  </th>
                  <th className="label-caps px-5 py-2.5 font-semibold">Kind</th>
                  <th className="label-caps px-5 py-2.5 text-right font-semibold">
                    Price
                  </th>
                  <th className="label-caps px-5 py-2.5 font-semibold">Tour</th>
                  <th className="label-caps px-5 py-2.5 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {listings.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-secondary/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-[13.5px] font-medium">
                      {l.title}
                    </td>
                    <td className="text-muted-foreground hidden px-5 py-3.5 text-[13px] md:table-cell">
                      {l.propertyName}
                    </td>
                    <td className="px-5 py-3.5">
                      <Pill variant="neutral">{l.kind}</Pill>
                    </td>
                    <td className="text-amount px-5 py-3.5 text-right text-[14px]">
                      {peso(l.priceCentavos)}
                    </td>
                    <td className="px-5 py-3.5">
                      {l.hasTour ? (
                        <span className="text-ok flex items-center gap-1.5 text-[12.5px] font-medium">
                          <Rotate3d className="size-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[12.5px]">
                          Photos only
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <ListingStatus state={l.state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <p className="text-muted-foreground mt-5 max-w-2xl text-[12.5px] leading-relaxed">
          Listings without a tour are visibly less compelling to customers, and
          that is deliberate — the walkthrough is what lets someone decide
          without crossing the city.
        </p>
      </Page>
    </>
  );
}
