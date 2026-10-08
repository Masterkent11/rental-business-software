"use client";

import { ListingEditor } from "@/components/owner/listing-editor";

export default function PropertyEditorPage() {
  return <ListingEditor basePath="/properties" toursPath="/tours" backLabel="Properties" />;
}
