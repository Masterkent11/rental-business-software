"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Building2,
  MapPin,
  Megaphone,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  Button,
  Card,
} from "@heroui/react";

import { ButtonLink, Page, TopBar } from "@/components/owner/shell";
import { OccupancyBar } from "@/components/owner/charts";
import { peso } from "@/lib/money";
import { useSessionStore } from "@/stores/use-session-store";
import { usePropertiesStore } from "@/stores/use-properties-store";
import type { Property } from "@/domain/properties/property";

export default function PropertiesPage() {
  const activeOrganizationId = useSessionStore((state) => state.activeOrganizationId);
  const {
    properties,
    loading,
    error,
    search,
    isAddOpen,
    creating,
    createError,
    loadProperties,
    setSearch,
    openAddModal,
    closeAddModal,
    submitAddProperty,
  } = usePropertiesStore();

  useEffect(() => {
    if (activeOrganizationId) {
      void loadProperties(activeOrganizationId);
    }
  }, [activeOrganizationId, loadProperties]);

  const totalMonthlyPotential = useMemo(
    () => properties.reduce((n, p) => n + p.monthlyPotentialCentavos, 0),
    [properties],
  );
  const totalUnits = useMemo(
    () => properties.reduce((n, p) => n + p.resourceCount, 0),
    [properties],
  );
  const totalVacantUnits = useMemo(
    () => properties.reduce((n, p) => n + p.vacant, 0),
    [properties],
  );

  const filteredProperties = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.areaLabel.toLowerCase().includes(q) ||
        (p.cityLabel && p.cityLabel.toLowerCase().includes(q)),
    );
  }, [properties, search]);

  const handleAddProperty = async () => {
    if (!activeOrganizationId) return;
    await submitAddProperty(activeOrganizationId);
  };

  return (
    <>
      <TopBar title="Portfolio Properties">
        <Button
          size="sm"
          onPress={openAddModal}
          className="bg-accent text-white font-semibold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="size-4" /> Add Property
        </Button>
      </TopBar>

      <Page>
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-4 shadow-xs">
            <span className="text-muted-foreground text-[12px] font-medium">Total Properties</span>
            <p className="text-[24px] font-bold mt-1">{properties.length}</p>
          </Card>

          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-4 shadow-xs">
            <span className="text-muted-foreground text-[12px] font-medium">Total Resource Units</span>
            <p className="text-[24px] font-bold mt-1">{totalUnits} units</p>
          </Card>

          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-4 shadow-xs">
            <span className="text-muted-foreground text-[12px] font-medium">Vacant Units</span>
            <p className="text-[24px] font-bold text-amber-500 mt-1">{totalVacantUnits} vacant</p>
          </Card>

          <Card className="border-border/80 bg-surface/70 backdrop-blur-xl p-4 shadow-xs">
            <span className="text-muted-foreground text-[12px] font-medium">Potential Monthly Yield</span>
            <p className="text-[24px] font-mono font-bold text-emerald-500 mt-1">{peso(totalMonthlyPotential)}</p>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search properties by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/80 bg-surface/70 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>

        {/* Error message */}
        {error ? (
          <div className="p-4 mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-[13.5px]">
            {error}
          </div>
        ) : null}

        {/* Property Grid */}
        {loading && properties.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block size-6 animate-spin rounded-full border-2 border-accent border-t-transparent mb-3" />
            <p className="text-muted-foreground text-[14px]">Loading properties…</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl">
            <Building2 className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-foreground text-[15px]">No properties found</p>
            <p className="text-muted-foreground text-[13px] mt-1">Get started by creating your first property.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}

        {/* Add Property Modal */}
        {isAddOpen ? (
          <AddPropertyModal
            onClose={closeAddModal}
            onSubmit={handleAddProperty}
            submitting={creating}
            error={createError}
          />
        ) : null}
      </Page>
    </>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const photoUrl =
    property.photo ||
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=900&auto=format&fit=crop";

  return (
    <Card className="border-border/80 bg-surface/70 backdrop-blur-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col">
      <div className="relative h-44 w-full bg-surface-secondary">
        <Image
          src={photoUrl}
          alt={property.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-[16px] font-bold leading-tight">{property.name}</h3>
          <p className="text-[12px] opacity-90 flex items-center gap-1 mt-0.5">
            <MapPin className="size-3" />
            {property.areaLabel}, {property.cityLabel}
          </p>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-1.5 font-medium">
            <span>Occupancy Status</span>
            <span>
              {property.occupied}/{property.resourceCount} Occupied
            </span>
          </div>
          <OccupancyBar
            occupied={property.occupied}
            reserved={property.reserved}
            vacant={property.vacant}
          />
        </div>

        <div className="border-t border-border/60 pt-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block">
              Contracted
            </span>
            <span className="font-mono font-bold text-[14px] text-foreground">
              {peso(property.monthlyContractedCentavos)}
            </span>
          </div>
          <ButtonLink
            href="/listings"
            variant="outline"
            size="sm"
            className="text-[12px] h-8 rounded-lg"
          >
            <Megaphone className="size-3.5" /> Listings
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

function AddPropertyModal({
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
}) {
  const {
    addName,
    addAreaLabel,
    addCityLabel,
    addUnitCount,
    addBaseRent,
    addPhotoUrl,
    addValidationErr,
    setAddName,
    setAddAreaLabel,
    setAddCityLabel,
    setAddUnitCount,
    setAddBaseRent,
    setAddPhotoUrl,
  } = usePropertiesStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <h3 className="text-[17px] font-bold text-foreground">Add New Property</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {error || addValidationErr ? (
          <div className="p-3 mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-[13px]">
            {error || addValidationErr}
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-semibold text-foreground mb-1">
              Property Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ABC Apartment"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-[13.5px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-semibold text-foreground mb-1">
                Area / Barangay *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Brgy. Kamputhaw"
                value={addAreaLabel}
                onChange={(e) => setAddAreaLabel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-[13.5px]"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-foreground mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={addCityLabel}
                onChange={(e) => setAddCityLabel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-[13.5px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-semibold text-foreground mb-1">
                Initial Units
              </label>
              <input
                type="number"
                min="1"
                value={addUnitCount}
                onChange={(e) => setAddUnitCount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-[13.5px]"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-foreground mb-1">
                Base Monthly Rent (₱)
              </label>
              <input
                type="number"
                min="0"
                value={addBaseRent}
                onChange={(e) => setAddBaseRent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-[13.5px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-foreground mb-1">
              Cover Photo URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/…"
              value={addPhotoUrl}
              onChange={(e) => setAddPhotoUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-[13.5px]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-border text-[13px] hover:bg-surface-secondary text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-[13px] hover:bg-accent/90 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Save Property"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
