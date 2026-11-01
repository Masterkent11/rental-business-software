import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";
import { LinkBtn } from "./ui";

const actions = [
  {
    href: "/properties/new?intent=sale",
    desktopLabel: "Property for sale",
    label: "For sale",
    caption: "Create a sales listing",
    illustration: "for-sale-house.svg",
    variant: "outline",
  },
  {
    href: "/properties/new",
    desktopLabel: "Rental",
    label: "For rent",
    caption: "Create a rental listing",
    illustration: "for-rent-key.svg",
    variant: "primary",
  },
] as const;

export function ListingCreationActions() {
  return actions.map((action) => (
    <LinkBtn
      key={action.href}
      href={action.href}
      variant={action.variant}
      className="listing-create-action"
    >
      <span className="listing-action-desktop">
        <Plus aria-hidden size={20} />
        {action.desktopLabel}
      </span>
      <span className="listing-action-mobile">
        <Image
          src={`/assets/dashboard/overview-dashboard/${action.illustration}`}
          width={44}
          height={44}
          alt=""
          className="listing-action-illustration"
        />
        <span className="listing-action-copy">
          <strong>{action.label}</strong>
          <small>
            <span className="listing-caption-full">{action.caption}</span>
            <span className="listing-caption-compact">Create a listing</span>
          </small>
        </span>
        <span className="listing-action-direction" aria-hidden>
          <ArrowRight size={14} />
        </span>
      </span>
    </LinkBtn>
  ));
}
