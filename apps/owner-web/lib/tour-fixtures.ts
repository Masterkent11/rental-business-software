/**
 * Tour authoring fixtures — PRESENTATION ONLY.
 *
 * `processingState` is domain-visible on purpose: a scene that is still being
 * tiled cannot be published, and the authoring UI has to be honest about that
 * rather than pretend the upload is instant.
 */

export type ProcessingState = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

export type HotspotKind = "NAVIGATION" | "INFO" | "IMAGE" | "VIDEO";

export type Hotspot = {
  id: string;
  kind: HotspotKind;
  /** Position within the scene, 0..1. Real tours carry spherical coordinates. */
  x: number;
  y: number;
  /** NAVIGATION only — the scene this walks to. Null means dangling. */
  targetSceneId: string | null;
  /** INFO only. */
  note?: string;
};

export type Scene = {
  id: string;
  label: string;
  imageUrl: string;
  processingState: ProcessingState;
  /** Percent, while PROCESSING. */
  progress?: number;
  hotspots: Hotspot[];
};

export type Tour = {
  id: string;
  resourceLabel: string;
  propertyName: string;
  entrySceneId: string | null;
  state: "DRAFT" | "PROCESSING" | "READY" | "PUBLISHED";
  scenes: Scene[];
};

const pano = (id: string) =>
  `https://images.unsplash.com/${id}?q=80&w=1600&auto=format&fit=crop`;

export const tour: Tour = {
  id: "tour-unit-203",
  resourceLabel: "Unit 203",
  propertyName: "ABC Apartment",
  entrySceneId: "s-living",
  state: "PUBLISHED",
  scenes: [
    {
      id: "s-living",
      label: "Living room",
      imageUrl: pano("photo-1560448204-e02f11c3d0e2"),
      processingState: "READY",
      hotspots: [
        { id: "h1", kind: "NAVIGATION", x: 0.28, y: 0.42, targetSceneId: "s-kitchen" },
        { id: "h2", kind: "NAVIGATION", x: 0.71, y: 0.66, targetSceneId: "s-bedroom" },
        { id: "h3", kind: "INFO", x: 0.6, y: 0.3, targetSceneId: null, note: "Inverter aircon — included in rent" },
      ],
    },
    {
      id: "s-kitchen",
      label: "Kitchen",
      imageUrl: pano("photo-1758565811176-ccd94357a844"),
      processingState: "READY",
      hotspots: [
        { id: "h4", kind: "NAVIGATION", x: 0.3, y: 0.58, targetSceneId: "s-living" },
        { id: "h5", kind: "INFO", x: 0.68, y: 0.4, targetSceneId: null, note: "Gas range and tank stay with the unit" },
      ],
    },
    {
      id: "s-bedroom",
      label: "Bedroom",
      imageUrl: pano("photo-1594295800284-990f74bb6928"),
      processingState: "READY",
      hotspots: [
        { id: "h6", kind: "NAVIGATION", x: 0.32, y: 0.6, targetSceneId: "s-cr" },
        // Deliberately dangling, so the publish validator has something real to
        // catch. This is exactly the mistake I-07 exists to prevent.
        { id: "h7", kind: "NAVIGATION", x: 0.72, y: 0.35, targetSceneId: null },
      ],
    },
    {
      id: "s-cr",
      label: "CR",
      imageUrl: pano("photo-1586023492125-27b2c045efd7"),
      processingState: "READY",
      hotspots: [
        { id: "h8", kind: "NAVIGATION", x: 0.34, y: 0.64, targetSceneId: "s-bedroom" },
      ],
    },
    {
      id: "s-balcony",
      // Fresh upload, still being tiled — the state the owner will actually
      // meet on Philippine mobile data with a 15 MB panorama.
      label: "Balcony",
      imageUrl: pano("photo-1502672260266-1c1ef2d93688"),
      processingState: "PROCESSING",
      progress: 62,
      hotspots: [],
    },
  ],
};

export const tourSummaries = [
  { id: "tour-unit-203", resourceLabel: "Unit 203", propertyName: "ABC Apartment", scenes: 5, state: "PUBLISHED" as const, updatedAt: "2026-08-19" },
  { id: "tour-condo-101", resourceLabel: "Condo 101", propertyName: "Skyline Residences", scenes: 7, state: "PUBLISHED" as const, updatedAt: "2026-08-11" },
  { id: "tour-room-101", resourceLabel: "Room 101", propertyName: "Villa Boarding House", scenes: 3, state: "DRAFT" as const, updatedAt: "2026-08-20" },
];

export type TourSummary = (typeof tourSummaries)[number];
