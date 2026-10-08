"use client";

import { ListingEditor } from "@/components/owner/listing-editor";

export default function AgentPropertyPage() {
  return <ListingEditor basePath="/agent/properties" toursPath="/agent/tours" backLabel="Represented properties" />;
}
