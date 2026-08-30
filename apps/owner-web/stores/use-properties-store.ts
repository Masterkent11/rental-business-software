/**
 * Presentation Store: usePropertiesStore
 *
 * Replaces component-level useState for properties with a proper Zustand store
 * backed by Application Use Cases.
 */

import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { Property, CreatePropertyInput } from "../domain/properties/property";

interface PropertiesState {
  properties: readonly Property[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  createError: string | null;

  // Search & Modal State
  search: string;
  isAddOpen: boolean;

  // Add Property Form State
  addName: string;
  addAreaLabel: string;
  addCityLabel: string;
  addUnitCount: string;
  addBaseRent: string;
  addPhotoUrl: string;
  addValidationErr: string | null;

  // Actions
  setSearch: (search: string) => void;
  openAddModal: () => void;
  closeAddModal: () => void;
  setAddName: (name: string) => void;
  setAddAreaLabel: (areaLabel: string) => void;
  setAddCityLabel: (cityLabel: string) => void;
  setAddUnitCount: (unitCount: string) => void;
  setAddBaseRent: (baseRent: string) => void;
  setAddPhotoUrl: (photoUrl: string) => void;
  setAddValidationErr: (err: string | null) => void;
  resetAddForm: () => void;

  loadProperties: (organizationId: string) => Promise<void>;
  createProperty: (organizationId: string, input: CreatePropertyInput) => Promise<boolean>;
  submitAddProperty: (organizationId: string) => Promise<boolean>;
}

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
  properties: [],
  loading: false,
  error: null,
  creating: false,
  createError: null,

  search: "",
  isAddOpen: false,

  addName: "",
  addAreaLabel: "",
  addCityLabel: "Cebu City",
  addUnitCount: "6",
  addBaseRent: "8500",
  addPhotoUrl: "",
  addValidationErr: null,

  setSearch: (search) => set({ search }),
  openAddModal: () => set({ isAddOpen: true, addValidationErr: null, createError: null }),
  closeAddModal: () => set({ isAddOpen: false, addValidationErr: null, createError: null }),
  setAddName: (addName) => set({ addName }),
  setAddAreaLabel: (addAreaLabel) => set({ addAreaLabel }),
  setAddCityLabel: (addCityLabel) => set({ addCityLabel }),
  setAddUnitCount: (addUnitCount) => set({ addUnitCount }),
  setAddBaseRent: (addBaseRent) => set({ addBaseRent }),
  setAddPhotoUrl: (addPhotoUrl) => set({ addPhotoUrl }),
  setAddValidationErr: (addValidationErr) => set({ addValidationErr }),

  resetAddForm: () =>
    set({
      addName: "",
      addAreaLabel: "",
      addCityLabel: "Cebu City",
      addUnitCount: "6",
      addBaseRent: "8500",
      addPhotoUrl: "",
      addValidationErr: null,
      createError: null,
    }),

  loadProperties: async (organizationId: string) => {
    set({ loading: true, error: null });
    try {
      const properties = await container.loadPropertiesUseCase.execute(organizationId);
      set({ properties, loading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load properties";
      set({ error: message, loading: false });
    }
  },

  createProperty: async (organizationId: string, input: CreatePropertyInput) => {
    set({ creating: true, createError: null });
    try {
      await container.createPropertyUseCase.execute(organizationId, input);
      set({ creating: false, createError: null, isAddOpen: false });
      get().resetAddForm();
      await get().loadProperties(organizationId);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create property";
      set({ createError: message, creating: false });
      return false;
    }
  },

  submitAddProperty: async (organizationId: string) => {
    const { addName, addAreaLabel, addCityLabel, addUnitCount, addBaseRent, addPhotoUrl } = get();

    if (!addName.trim() || !addAreaLabel.trim()) {
      set({ addValidationErr: "Property name and area label are required." });
      return false;
    }

    set({ addValidationErr: null });

    return get().createProperty(organizationId, {
      name: addName.trim(),
      areaLabel: addAreaLabel.trim(),
      cityLabel: addCityLabel.trim(),
      unitCount: parseInt(addUnitCount, 10) || 1,
      baseRentCentavos: (parseFloat(addBaseRent) || 0) * 100,
      photoUrl: addPhotoUrl.trim() || undefined,
    });
  },
}));
