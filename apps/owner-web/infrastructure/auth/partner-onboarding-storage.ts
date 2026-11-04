import {
  partnerRole,
  type PartnerRole,
} from "../../domain/session/partner-access";

export function savedPartnerRole(): PartnerRole | null {
  try {
    return partnerRole(window.localStorage.getItem("partner.onboarding.role"));
  } catch {
    return null;
  }
}
export function rememberPartnerRole(role: PartnerRole) {
  try {
    window.localStorage.setItem("partner.onboarding.role", role);
  } catch {
    return;
  }
}
export function clearPartnerRole() {
  try {
    window.localStorage.removeItem("partner.onboarding.role");
  } catch {
    return;
  }
}
export function markPartnerVisit() {
  try {
    window.localStorage.setItem("partner.visited", "yes");
  } catch {
    return;
  }
}
export function hasPartnerVisit(): boolean {
  try {
    return window.localStorage.getItem("partner.visited") === "yes";
  } catch {
    return false;
  }
}
