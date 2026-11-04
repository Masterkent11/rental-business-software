"use client";

import { PartnerBrandingEditor } from "@/components/owner/partner-branding";
import { useRouter } from "next/navigation";
import { BadgeCheck, LogOut, ShieldCheck } from "lucide-react";
import { Page, TopBar, SectionHeading } from "@/components/owner/shell";
import { Badge, Btn, Card } from "@/components/owner/ui";
import { VERIFICATION_LABEL } from "@/domain/agents/agent";
import { workspaceHome } from "@/domain/workspace/workspace";
import { useSessionStore } from "@/stores/use-session-store";

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    workspaces,
    memberships,
    agent,
    activeWorkspace,
    setWorkspace,
    signOut,
    workspaceBusy,
    workspaceError,
  } = useSessionStore();
  if (!user) return null;
  return (
    <Page>
      <TopBar
        title="Account"
        caption="Your profile and the workspaces you can use."
      />
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading title="Profile" />
          <Card className="p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-[16px] font-semibold text-white sm:size-14"
                aria-hidden
              >
                {user.displayName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold">{user.displayName}</p>
                <p className="break-words text-[13px] text-muted">{user.email}</p>
              </div>
            </div>
            <Btn
              variant="outline"
              className="mt-6"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </Btn>
          </Card>
        </section>
        <section>
          <SectionHeading
            title="Workspaces"
            caption="Owner data is isolated per organization. Agent work is limited to properties you represent."
          />
          <Card>
            <ul className="divide-y divide-border">
              {workspaces.map((w) => {
                const membership =
                  w.kind === "OWNER"
                    ? memberships.find(
                        (m) => m.organizationId === w.organizationId,
                      )
                    : null;
                return (
                  <li
                    key={w.key}
                    className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold">{w.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {w.kind === "OWNER" ? (
                          <>
                            <Badge>
                              {membership?.role === "STAFF" ? "Staff" : "Owner"}
                            </Badge>
                            {w.verified ? (
                              <Badge tone="ok">
                                <ShieldCheck className="size-3" aria-hidden />{" "}
                                Verified
                              </Badge>
                            ) : (
                              <Badge tone="pending" className="max-w-full whitespace-normal">
                                Verification pending. Publishing is disabled
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge>Agent</Badge>
                            {agent ? (
                              <Badge
                                className="max-w-full whitespace-normal"
                                tone={
                                  agent.verificationState === "VERIFIED"
                                    ? "ok"
                                    : "pending"
                                }
                              >
                                {agent.verificationState === "VERIFIED" ? (
                                  <BadgeCheck className="size-3" aria-hidden />
                                ) : null}
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
                        disabled={workspaceBusy}
                        onClick={async () => {
                          if (await setWorkspace(w.key))
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
          {workspaceError ? (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {workspaceError}
            </p>
          ) : null}
        </section>
      </div>
      <PartnerBrandingEditor />
    </Page>
  );
}
