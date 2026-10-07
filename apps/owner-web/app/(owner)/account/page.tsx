"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { Page, TopBar, SectionHeading } from "@/components/owner/shell";
import { Badge, Btn, Card } from "@/components/owner/ui";
import { useSessionStore } from "@/stores/use-session-store";

export default function AccountPage() {
  const { user, memberships, activeOrganizationId, setActiveOrganizationId, signOut } = useSessionStore();
  if (!user) return null;
  return (
    <Page>
      <TopBar title="Account" caption="Your profile and the organizations you manage." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading title="Profile" />
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-[16px] font-semibold text-white" aria-hidden>
                {user.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[16px] font-semibold">{user.displayName}</p>
                <p className="text-[13px] text-muted">{user.email}</p>
              </div>
            </div>
            <Btn variant="outline" className="mt-6" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </Btn>
          </Card>
        </section>
        <section>
          <SectionHeading title="Organizations" caption="Data is isolated per organization. Switch to manage another." />
          <Card>
            <ul className="divide-y divide-border">
              {memberships.map((m) => (
                <li key={m.organizationId} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-[14px] font-semibold">{m.organizationName}</p>
                    <div className="mt-1 flex gap-1.5">
                      <Badge>{m.role === "OWNER" ? "Owner" : "Staff"}</Badge>
                      {m.verified ? (
                        <Badge tone="ok"><ShieldCheck className="size-3" aria-hidden /> Verified</Badge>
                      ) : (
                        <Badge tone="pending">Verification pending — publishing is disabled</Badge>
                      )}
                    </div>
                  </div>
                  {m.organizationId === activeOrganizationId ? (
                    <Badge tone="dark">Active</Badge>
                  ) : (
                    <Btn size="sm" variant="outline" onClick={() => setActiveOrganizationId(m.organizationId)}>Switch</Btn>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </Page>
  );
}
