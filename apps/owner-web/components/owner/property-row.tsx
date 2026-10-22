"use client";

import Link from "next/link";
import {
  Bath,
  BedDouble,
  CalendarDays,
  Eye,
  House,
  MapPin,
  MessageSquare,
  MoreVertical,
  Scan,
} from "lucide-react";
import { Photo } from "./photo";
import { Badge, Btn } from "./ui";
import {
  allowedActions,
  LISTING_STATE_LABEL,
  propertyTypeLabel,
  type ListingAction,
  type OwnerListing,
} from "@/domain/listings/listing";
import { peso } from "@/lib/money";

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function PropertyRow({
  listing,
  busy,
  onAction,
}: {
  listing: OwnerListing;
  busy: boolean;
  onAction: (action: ListingAction) => void;
}) {
  return (
    <li className="property-row">
      <Link
        href={`/properties/${listing.id}`}
        className="property-summary focusable"
      >
        <div className="property-thumbnail">
          {listing.photos[0] ? (
            <Photo
              src={listing.photos[0]}
              alt=""
              className="size-full"
              sizes="155px"
            />
          ) : (
            <House aria-label="No property photo" />
          )}
        </div>
        <div className="property-description">
          <h2>{listing.title}</h2>
          <p>
            <MapPin aria-hidden />
            {listing.areaLabel}, {listing.cityLabel}
          </p>
          <div className="property-facts">
            <span>
              <House aria-hidden />
              {propertyTypeLabel(listing.propertyType, listing.intent)}
            </span>
            {listing.floorAreaSqm !== null && (
              <span>
                <Scan aria-hidden />
                {listing.floorAreaSqm} m²
              </span>
            )}
            <span>
              <BedDouble aria-label="Bedrooms" />
              {listing.bedrooms}
            </span>
            <span>
              <Bath aria-label="Bathrooms" />
              {listing.bathrooms}
            </span>
          </div>
        </div>
      </Link>
      <div className="property-commercial">
        <Badge
          tone={
            listing.state === "PUBLISHED"
              ? "ok"
              : listing.state === "DRAFT"
                ? "pending"
                : "neutral"
          }
        >
          {LISTING_STATE_LABEL[listing.state]}
        </Badge>
        <p>
          {listing.intent === "SALE" || listing.priceCentavos === null
            ? "Price on inquiry"
            : `${peso(listing.priceCentavos)} / ${listing.kind === "SHORT_TERM" ? "night" : "month"}`}
        </p>
      </div>
      <div className="property-metrics">
        <div>
          <span>
            <Eye aria-hidden />
            {listing.activity ? compact.format(listing.activity.views) : "—"}
          </span>
          <small>Views</small>
        </div>
        <Link href={`/inquiries?listingId=${listing.id}`}>
          <span>
            <MessageSquare aria-hidden />
            {listing.activity?.inquiries ?? "—"}
          </span>
          <small>Inquiries</small>
        </Link>
        <Link href={`/viewings?listingId=${listing.id}`}>
          <span>
            <CalendarDays aria-hidden />
            {listing.activity?.viewings ?? "—"}
          </span>
          <small>Viewings</small>
        </Link>
      </div>
      <details className="property-menu">
        <summary
          className="focusable"
          aria-label={`Actions for ${listing.title}`}
        >
          <MoreVertical aria-hidden />
        </summary>
        <div>
          <Link href={`/properties/${listing.id}`}>Edit property</Link>
          {allowedActions(listing.state).map((action) => (
            <Btn
              key={action}
              variant="ghost"
              busy={busy}
              onClick={() => onAction(action)}
            >
              {action === "PUBLISH"
                ? "Publish"
                : action === "UNPUBLISH"
                  ? "Unpublish"
                  : "Archive"}
            </Btn>
          ))}
        </div>
      </details>
    </li>
  );
}
