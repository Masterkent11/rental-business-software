"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut, ShieldCheck } from "lucide-react";
import { Page, TopBar, SectionHeading } from "@/components/owner/shell";
import { Badge, Btn, Card } from "@/components/owner/ui";
import { AgentSetupCard } from "@/components/owner/agent-setup";
import { VERIFICATION_LABEL } from "@/domain/agents/agent";
import { workspaceHome } from "@/domain/workspace/workspace";
import { useSessionStore } from "@/stores/use-session-store";

export default function AccountPage() {
  const router = useRouter();
  const { user, workspaces, memberships, agent, activeWorkspace, setWorkspace, signOut } = useSessionStore();
  if (!user) return null;
  return (
    <Page>
      <TopBar title="Account" caption="Your profile and the workspaces you can use." />
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
          <SectionHeading title="Workspaces" caption="Owner data is isolated per organization. Agent work is limited to properties you represent." />
          <Card>
            <ul className="divide-y divide-border">
              {workspaces.map((w) => {
                const membership = w.kind === "OWNER" ? memberships.find((m) => m.organizationId === w.organizationId) : null;
                return (
                  <li key={w.key} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-[14px] font-semibold">{w.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {w.kind === "OWNER" ? (
                          <>
                            <Badge>{membership?.role === "STAFF" ? "Staff" : "Owner"}</Badge>
                            {w.verified ? (
                              <Badge tone="ok">
                                <ShieldCheck className="size-3" aria-hidden /> Verified
                              </Badge>
                            ) : (
                              <Badge tone="pending">Verification pending — publishing is disabled</Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge>Agent</Badge>
                            {agent ? (
                              <Badge tone={agent.verificationState === "VERIFIED" ? "ok" : "pending"}>
                                {agent.verificationState === "VERIFIED" ? <BadgeCheck className="size-3" aria-hidden /> : null}
                                {VERIFICATION_LABEL[agent.verificationState]}
                              </Badge>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                    {w.key === activeWorkspace?.key ? (
                      <Badge tone="dark">Active</Badge>
                    ) : (
                      <Btn
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setWorkspace(w.key);
                          router.push(workspaceHome(w));
                        }}
                      >
                        Switch
                      </Btn>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          {agent ? null : (
            <div className="mt-6">
              <AgentSetupCard />
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
