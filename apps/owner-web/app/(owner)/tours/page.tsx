"use client";

import { TourStudio } from "@/components/owner/tour-studio";
import { tour, tourSummaries } from "@/lib/tour-fixtures";
import { useTourStudioStore } from "@/stores/use-tour-studio-store";

export default function ToursPage() {
  const { selectedTourId, setSelectedTourId } = useTourStudioStore();

  return (
    <div className="relative flex flex-col h-[calc(100dvh-0px)] w-full overflow-hidden bg-zinc-950 text-white">
      <TourStudio
        tour={tour}
        allTours={tourSummaries}
        selectedTourId={selectedTourId}
        onSelectTour={setSelectedTourId}
      />
    </div>
  );
}
