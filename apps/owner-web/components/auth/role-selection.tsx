"use client";

import { useAuthDraft } from "./use-auth-draft";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  safePartnerReturn,
  type PartnerRole,
} from "@/domain/session/partner-access";
import {
  markPartnerVisit,
  rememberPartnerRole,
  savedPartnerRole,
} from "@/infrastructure/auth/partner-onboarding-storage";
import { useSessionStore } from "@/stores/use-session-store";
import { AuthBrand, ProgressSteps } from "./auth-layout";

export function RoleSelection() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safePartnerReturn(params.get("returnTo"));
  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  const status = useSessionStore((s) => s.status);
  const [slide, setSlide] = useAuthDraft(0);
  const slides = [
    {
      title: (
        <>
          One workspace
          <br />
          for modern stays.
        </>
      ),
      description:
        "Manage properties, bookings and guest conversations in one place.",
    },
    {
      title: (
        <>
          Your properties,
          <br />
          in one place.
        </>
      ),
      description: "Keep listings, availability and bookings together.",
    },
    {
      title: (
        <>
          Stay close
          <br />
          to your clients.
        </>
      ),
      description: "Follow inquiries and conversations from your workspace.",
    },
  ];
  const [role, setRole] = useAuthDraft<PartnerRole>("OWNER");
  useEffect(() => {
    setRole(savedPartnerRole() ?? "OWNER");
  }, [setRole]);
  return (
    <main className="role-screen">
      <aside className="role-photo-panel">
        <AuthBrand light />
        <div className="role-photo-copy">
          <div aria-live="polite" aria-atomic="true">
            <h2>{slides[slide].title}</h2>
            <p>{slides[slide].description}</p>
          </div>
          <div
            className="role-photo-indicators"
            aria-label="Workspace highlights"
          >
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show workspace slide ${index + 1}`}
                aria-pressed={slide === index}
                onClick={() => setSlide(index)}
              />
            ))}
          </div>
        </div>
      </aside>
      <section className="role-panel">
        <div className="role-top">
          <AuthBrand />
          <p>
            Already have an account? <Link href={signInHref}>Sign in</Link>
          </p>
        </div>
        <div className="role-content">
          <ProgressSteps step={1} />
          <p className="role-eyebrow">CREATE YOUR WORKSPACE</p>
          <h1>
            How will you use
            <br />
            Westayplace?
          </h1>
          <p className="role-description">
            Choose the role that best describes you so we can
            <br className="role-wide-break" /> set up the right experience.
          </p>
          <fieldset className="role-options">
            <legend className="sr-only">Choose your role</legend>
            {(
              [
                {
                  value: "OWNER",
                  title: "Property Owner",
                  description:
                    "List and manage your properties, handle bookings, and connect with guests directly.",
                  icon: "property-owner",
                },
                {
                  value: "AGENT",
                  title: "Property Agent",
                  description:
                    "Manage properties and bookings for clients, and grow your business.",
                  icon: "property-agent",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`role-option${role === option.value ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="partnerRole"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                />
                <span className="role-radio" aria-hidden="true">
                  {role === option.value && <Check size={19} />}
                </span>
                <Image
                  className={`role-illustration role-illustration-${option.value.toLowerCase()}`}
                  src={`/assets/auth/${option.icon}.svg`}
                  width={150}
                  height={94}
                  alt=""
                  priority
                />
                <strong>{option.title}</strong>
                <span className="role-option-description">
                  {option.description}
                </span>
              </label>
            ))}
          </fieldset>
          <button
            className="role-continue"
            type="button"
            onClick={() => {
              rememberPartnerRole(role);
              markPartnerVisit();
              router.push(
                status === "authenticated"
                  ? "/onboarding/setup"
                  : `/sign-up?role=${role}&returnTo=${encodeURIComponent(returnTo)}`,
              );
            }}
          >
            Continue
          </button>
          <p className="role-footnote">You can join more workspaces later.</p>
        </div>
      </section>
    </main>
  );
}
