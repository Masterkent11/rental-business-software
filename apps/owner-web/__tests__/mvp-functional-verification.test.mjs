import test from "node:test";
import assert from "node:assert/strict";

// Core Use Case Implementations for Verification
class GetCurrentSessionUseCase {
  constructor(sessionPort) {
    this.sessionPort = sessionPort;
  }
  async execute() {
    return this.sessionPort.getCurrentSession();
  }
}

class SignInUseCase {
  constructor(sessionPort) {
    this.sessionPort = sessionPort;
  }
  async execute(email, password) {
    return this.sessionPort.signIn(email, password);
  }
}

class LoadDashboardUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId) {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getCollection(organizationId);
  }
}

class LoadPropertiesUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId) {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getProperties(organizationId);
  }
}

class CreatePropertyUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId, input) {
    if (!organizationId) throw new Error("Organization ID is required");
    if (!input.name?.trim()) throw new Error("Property name is required");
    return this.repository.createProperty(organizationId, input);
  }
}

class LoadListingsUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId) {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getOrganizationListings(organizationId);
  }
}

class CreateListingUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId, input) {
    if (!organizationId) throw new Error("Organization ID is required");
    if (!input.title?.trim()) throw new Error("Listing title is required");
    return this.repository.createListing(organizationId, input);
  }
}

class TogglePublishListingUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId, listingId, publish) {
    if (!organizationId || !listingId) throw new Error("Organization ID and Listing ID are required");
    return this.repository.publishListing(organizationId, listingId, publish);
  }
}

class LoadApplicationsUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId) {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getApplications(organizationId);
  }
}

class DecideApplicationUseCase {
  constructor(repository) {
    this.repository = repository;
  }
  async execute(organizationId, applicationId, input) {
    if (!organizationId || !applicationId) throw new Error("Organization ID and Application ID are required");
    return this.repository.decideApplication(organizationId, applicationId, input);
  }
}

// Multi-Tenant In-Memory Backend Simulating PostgreSQL + RLS + API Authorization
class MultiTenantBackendSimulation {
  constructor() {
    this.users = {
      "owner-a@example.com": {
        id: "usr-owner-a",
        displayName: "Ramon Santos",
        password: "password123",
        memberships: [{ organizationId: "org-santos-holdings", role: "OWNER", organizationName: "Santos Property Holdings" }],
      },
      "owner-b@example.com": {
        id: "usr-owner-b",
        displayName: "Beatriz Cebu",
        password: "password456",
        memberships: [{ organizationId: "org-cebu-prime-holdings", role: "OWNER", organizationName: "Cebu Prime Estates" }],
      },
    };

    this.activeUser = null;

    this.database = {
      "org-santos-holdings": {
        properties: [
          { id: "prop-santos-1", organizationId: "org-santos-holdings", name: "ABC Apartment", areaLabel: "Brgy. Kamputhaw", cityLabel: "Cebu City", resourceCount: 18, occupied: 15, reserved: 1, vacant: 2, monthlyPotentialCentavos: 15300000, monthlyContractedCentavos: 13600000 },
        ],
        listings: [
          { id: "lst-santos-101", resourceId: "res-santos-1", resourceType: "UNIT", propertyName: "ABC Apartment", areaLabel: "Brgy. Kamputhaw", cityLabel: "Cebu City", kind: "LONG_TERM", title: "Modern Studio Unit 101", description: "Fully furnished", state: "PUBLISHED", priceCentavos: 850000, currency: "PHP", photos: [], amenities: [], houseRules: [], terms: [], minStayNights: null, advanceMonths: 1, depositMonths: 2, availabilityLabel: "Available", isAvailable: true, sharedFacilities: [], ownerName: "Santos Property Holdings", ownerVerified: true, hasTour: true, sceneCount: 3 },
        ],
        applications: [
          { id: "app-santos-311", reference: "AP-311", state: "SUBMITTED", listingTitle: "Modern Studio Unit 101", propertyName: "ABC Apartment", areaLabel: "Brgy. Kamputhaw", cityLabel: "Cebu City", monthlyRentCentavos: 850000, desiredMoveIn: "2026-09-01", desiredTermMonths: 12, message: "Quiet tenant", decisionReason: null, decidedAt: null, createdAt: "2026-08-18T09:12:00Z", holdExpiresAt: null, documentCount: 3, reservation: null },
        ],
        collection: {
          month: "2026-08",
          claimedCentavos: 24000000,
          receivedCentavos: 19650000,
          outstandingCentavos: 4350000,
          offlineSharePercent: 47,
          history: [{ month: "Aug", claimedCentavos: 24000000, receivedCentavos: 19650000 }],
          arrears: [{ tenantId: "t-1", tenantName: "Ana Reyes", occupancyId: "occ-1", resourceLabel: "Unit 203", owedCentavos: 350000, oldestDueOn: "2026-08-01", daysOverdue: 15, invoiceCount: 1 }],
          recentPayments: [{ id: "p-1", tenantName: "Grace Lim", resourceLabel: "Bed C", amountCentavos: 350000, origin: "ONLINE", reference: "PAY-1", recordedBy: null, receivedAt: "2026-08-19", recordedAt: "2026-08-19" }],
        },
      },
      "org-cebu-prime-holdings": {
        properties: [
          { id: "prop-cebu-1", organizationId: "org-cebu-prime-holdings", name: "Skyline Luxury Tower", areaLabel: "Brgy. Apas", cityLabel: "Cebu City", resourceCount: 30, occupied: 28, reserved: 1, vacant: 1, monthlyPotentialCentavos: 45000000, monthlyContractedCentavos: 42000000 },
        ],
        listings: [
          { id: "lst-cebu-501", resourceId: "res-cebu-501", resourceType: "UNIT", propertyName: "Skyline Luxury Tower", areaLabel: "Brgy. Apas", cityLabel: "Cebu City", kind: "SHORT_TERM", title: "Skyline Penthouse 501", description: "Panoramic view", state: "DRAFT", priceCentavos: 350000, currency: "PHP", photos: [], amenities: [], houseRules: [], terms: [], minStayNights: 2, advanceMonths: 0, depositMonths: 0, availabilityLabel: "Available", isAvailable: true, sharedFacilities: [], ownerName: "Cebu Prime Estates", ownerVerified: true, hasTour: false, sceneCount: 0 },
        ],
        applications: [
          { id: "app-cebu-901", reference: "AP-901", state: "SUBMITTED", listingTitle: "Skyline Penthouse 501", propertyName: "Skyline Luxury Tower", areaLabel: "Brgy. Apas", cityLabel: "Cebu City", monthlyRentCentavos: 350000, desiredMoveIn: "2026-09-10", desiredTermMonths: 6, message: "Corporate executive", decisionReason: null, decidedAt: null, createdAt: "2026-08-20T10:00:00Z", holdExpiresAt: null, documentCount: 2, reservation: null },
        ],
        collection: {
          month: "2026-08",
          claimedCentavos: 50000000,
          receivedCentavos: 48000000,
          outstandingCentavos: 2000000,
          offlineSharePercent: 10,
          history: [{ month: "Aug", claimedCentavos: 50000000, receivedCentavos: 48000000 }],
          arrears: [],
          recentPayments: [{ id: "p-cebu-1", tenantName: "David Sy", resourceLabel: "Suite 401", amountCentavos: 1200000, origin: "ONLINE", reference: "PAY-C1", recordedBy: null, receivedAt: "2026-08-20", recordedAt: "2026-08-20" }],
        },
      },
    };
  }

  // Session Port Adapter Methods
  async signIn(email, password) {
    const user = this.users[email];
    if (!user || user.password !== password) {
      throw new Error("Invalid credentials");
    }
    this.activeUser = user;
    return {
      user: { id: user.id, displayName: user.displayName, email },
      activeOrganizationId: user.memberships[0].organizationId,
      memberships: user.memberships,
      capabilities: user.memberships.map((m) => ({ capability: m.role, organizationId: m.organizationId })),
    };
  }

  async getCurrentSession() {
    if (!this.activeUser) return null;
    return {
      user: { id: this.activeUser.id, displayName: this.activeUser.displayName },
      activeOrganizationId: this.activeUser.memberships[0].organizationId,
      memberships: this.activeUser.memberships,
      capabilities: this.activeUser.memberships.map((m) => ({ capability: m.role, organizationId: m.organizationId })),
    };
  }

  async signOut() {
    this.activeUser = null;
  }

  // Authorize request against current user membership (simulates NestJS + PostgreSQL RLS)
  verifyTenantAccess(organizationId) {
    if (!this.activeUser) {
      throw new Error("401 Unauthorized: no active session");
    }
    const isMember = this.activeUser.memberships.some((m) => m.organizationId === organizationId);
    if (!isMember) {
      throw new Error(`403 Forbidden: User ${this.activeUser.id} is not a member of organization ${organizationId}`);
    }
    const tenantDb = this.database[organizationId];
    if (!tenantDb) {
      throw new Error(`404 Not Found: Tenant database not found for ${organizationId}`);
    }
    return tenantDb;
  }

  // Owner Repository Port Methods
  async getProperties(organizationId) {
    const db = this.verifyTenantAccess(organizationId);
    return db.properties;
  }

  async createProperty(organizationId, input) {
    const db = this.verifyTenantAccess(organizationId);
    const newProp = {
      id: `prop-${Date.now()}`,
      organizationId,
      name: input.name,
      areaLabel: input.areaLabel,
      cityLabel: input.cityLabel,
      photo: input.photoUrl,
      resourceCount: input.unitCount,
      occupied: 0,
      reserved: 0,
      vacant: input.unitCount,
      monthlyPotentialCentavos: input.baseRentCentavos * input.unitCount,
      monthlyContractedCentavos: 0,
    };
    db.properties.unshift(newProp);
    return newProp;
  }

  async getOrganizationListings(organizationId) {
    const db = this.verifyTenantAccess(organizationId);
    return db.listings;
  }

  async createListing(organizationId, input) {
    const db = this.verifyTenantAccess(organizationId);
    const newListing = {
      id: `lst-${Date.now()}`,
      resourceId: input.resourceId,
      resourceType: "UNIT",
      propertyName: "Portfolio Building",
      areaLabel: "Cebu City",
      cityLabel: "Cebu City",
      kind: input.kind,
      title: input.title,
      description: input.description,
      state: "DRAFT",
      priceCentavos: input.pricePesos * 100,
      currency: "PHP",
      photos: input.photos,
      amenities: input.amenities,
      houseRules: input.houseRules,
      terms: input.terms,
      minStayNights: input.minStayNights ?? null,
      advanceMonths: input.advanceMonths,
      depositMonths: input.depositMonths,
      availabilityLabel: "Available immediately",
      isAvailable: true,
      sharedFacilities: [],
      ownerName: this.activeUser.displayName,
      ownerVerified: true,
      hasTour: false,
      sceneCount: 0,
    };
    db.listings.unshift(newListing);
    return newListing;
  }

  async publishListing(organizationId, listingId, publish) {
    const db = this.verifyTenantAccess(organizationId);
    const item = db.listings.find((l) => l.id === listingId);
    if (!item) {
      throw new Error(`404 Not Found: Listing ${listingId} does not exist in organization ${organizationId}`);
    }
    item.state = publish ? "PUBLISHED" : "DRAFT";
    return item;
  }

  async getApplications(organizationId) {
    const db = this.verifyTenantAccess(organizationId);
    return db.applications;
  }

  async decideApplication(organizationId, applicationId, input) {
    const db = this.verifyTenantAccess(organizationId);
    const item = db.applications.find((a) => a.id === applicationId);
    if (!item) {
      throw new Error(`404 Not Found: Application ${applicationId} does not exist in organization ${organizationId}`);
    }
    item.state = input.decision;
    item.decisionReason = input.reason ?? null;
    item.decidedAt = new Date().toISOString();
    return { id: item.id, state: item.state, decisionReason: item.decisionReason };
  }

  async getCollection(organizationId) {
    const db = this.verifyTenantAccess(organizationId);
    return db.collection;
  }
}

// ------------------- TEST SUITE: COMPLETE MVP LIFECYCLE -------------------

test("MVP Lifecycle: Step 1 - Owner A Authentication & Tenant Session Resolution", async () => {
  const backend = new MultiTenantBackendSimulation();
  const signInUseCase = new SignInUseCase(backend);
  const getCurrentSession = new GetCurrentSessionUseCase(backend);

  const session = await signInUseCase.execute("owner-a@example.com", "password123");
  assert.equal(session.user.displayName, "Ramon Santos");
  assert.equal(session.activeOrganizationId, "org-santos-holdings");
  assert.equal(session.memberships[0].organizationName, "Santos Property Holdings");

  const current = await getCurrentSession.execute();
  assert.equal(current?.user.displayName, "Ramon Santos");
});

test("MVP Lifecycle: Step 2 - Owner A Dashboard & Property Creation", async () => {
  const backend = new MultiTenantBackendSimulation();
  await backend.signIn("owner-a@example.com", "password123");

  const loadDashboard = new LoadDashboardUseCase(backend);
  const loadProperties = new LoadPropertiesUseCase(backend);
  const createProperty = new CreatePropertyUseCase(backend);

  // 1. Load Dashboard
  const collection = await loadDashboard.execute("org-santos-holdings");
  assert.equal(collection.claimedCentavos, 24000000);
  assert.equal(collection.receivedCentavos, 19650000);
  assert.equal(collection.arrears[0].tenantName, "Ana Reyes");

  // 2. Load Properties
  const initialProps = await loadProperties.execute("org-santos-holdings");
  assert.equal(initialProps.length, 1);
  assert.equal(initialProps[0].name, "ABC Apartment");

  // 3. Create New Property
  const newProp = await createProperty.execute("org-santos-holdings", {
    name: "Santos Tower B",
    areaLabel: "Brgy. Lahug",
    cityLabel: "Cebu City",
    unitCount: 10,
    baseRentCentavos: 1200000,
  });
  assert.equal(newProp.name, "Santos Tower B");
  assert.equal(newProp.organizationId, "org-santos-holdings");

  // 4. Verify updated property list
  const updatedProps = await loadProperties.execute("org-santos-holdings");
  assert.equal(updatedProps.length, 2);
  assert.equal(updatedProps[0].name, "Santos Tower B");
});

test("MVP Lifecycle: Step 3 - Owner A Listing Creation & Publishing", async () => {
  const backend = new MultiTenantBackendSimulation();
  await backend.signIn("owner-a@example.com", "password123");

  const loadListings = new LoadListingsUseCase(backend);
  const createListing = new CreateListingUseCase(backend);
  const togglePublish = new TogglePublishListingUseCase(backend);

  // 1. Create Draft Listing
  const created = await createListing.execute("org-santos-holdings", {
    resourceId: "res-santos-2",
    kind: "LONG_TERM",
    title: "Deluxe Studio Unit 202",
    description: "Quiet, fiber ready",
    pricePesos: 9500,
    amenities: ["WiFi", "AC"],
    houseRules: ["No smoking"],
    terms: ["1 month advance"],
    advanceMonths: 1,
    depositMonths: 2,
    photos: ["https://example.com/photo.jpg"],
  });
  assert.equal(created.title, "Deluxe Studio Unit 202");
  assert.equal(created.state, "DRAFT");

  // 2. Publish Listing
  const published = await togglePublish.execute("org-santos-holdings", created.id, true);
  assert.equal(published.state, "PUBLISHED");

  // 3. Verify in organization listings
  const allListings = await loadListings.execute("org-santos-holdings");
  assert.equal(allListings.length, 2);
  assert.equal(allListings[0].state, "PUBLISHED");
});

test("MVP Lifecycle: Step 4 - Owner A Application Decision Flow", async () => {
  const backend = new MultiTenantBackendSimulation();
  await backend.signIn("owner-a@example.com", "password123");

  const loadApps = new LoadApplicationsUseCase(backend);
  const decideApp = new DecideApplicationUseCase(backend);

  // 1. Load Pending Applications
  const apps = await loadApps.execute("org-santos-holdings");
  assert.equal(apps.length, 1);
  assert.equal(apps[0].reference, "AP-311");
  assert.equal(apps[0].state, "SUBMITTED");

  // 2. Approve Application
  const decision = await decideApp.execute("org-santos-holdings", "app-santos-311", {
    decision: "APPROVED",
  });
  assert.equal(decision.state, "APPROVED");

  // 3. Verify updated application
  const updatedApps = await loadApps.execute("org-santos-holdings");
  assert.equal(updatedApps[0].state, "APPROVED");
});

test("MVP Lifecycle: Step 5 - Switch to Owner B (Zero Cross-Tenant Leakage)", async () => {
  const backend = new MultiTenantBackendSimulation();

  // Sign in as Owner B
  const sessionB = await backend.signIn("owner-b@example.com", "password456");
  assert.equal(sessionB.user.displayName, "Beatriz Cebu");
  assert.equal(sessionB.activeOrganizationId, "org-cebu-prime-holdings");

  const loadProperties = new LoadPropertiesUseCase(backend);
  const loadListings = new LoadListingsUseCase(backend);
  const loadApps = new LoadApplicationsUseCase(backend);
  const loadDashboard = new LoadDashboardUseCase(backend);

  // Owner B loads data: sees ONLY Owner B portfolio
  const propsB = await loadProperties.execute("org-cebu-prime-holdings");
  assert.equal(propsB.length, 1);
  assert.equal(propsB[0].name, "Skyline Luxury Tower");

  const listingsB = await loadListings.execute("org-cebu-prime-holdings");
  assert.equal(listingsB.length, 1);
  assert.equal(listingsB[0].title, "Skyline Penthouse 501");

  const appsB = await loadApps.execute("org-cebu-prime-holdings");
  assert.equal(appsB.length, 1);
  assert.equal(appsB[0].reference, "AP-901");

  const collectionB = await loadDashboard.execute("org-cebu-prime-holdings");
  assert.equal(collectionB.claimedCentavos, 50000000);
});

test("MVP Lifecycle: Step 6 - IDOR Protection (Owner A cannot access or mutate Owner B resources)", async () => {
  const backend = new MultiTenantBackendSimulation();
  await backend.signIn("owner-a@example.com", "password123");

  const loadProperties = new LoadPropertiesUseCase(backend);
  const loadDashboard = new LoadDashboardUseCase(backend);
  const togglePublish = new TogglePublishListingUseCase(backend);
  const decideApp = new DecideApplicationUseCase(backend);

  // Attempt 1: Owner A tries to load Owner B properties
  await assert.rejects(
    async () => {
      await loadProperties.execute("org-cebu-prime-holdings");
    },
    { message: /403 Forbidden/ },
  );

  // Attempt 2: Owner A tries to load Owner B financials
  await assert.rejects(
    async () => {
      await loadDashboard.execute("org-cebu-prime-holdings");
    },
    { message: /403 Forbidden/ },
  );

  // Attempt 3: Owner A tries to mutate Owner B's listing by ID
  await assert.rejects(
    async () => {
      await togglePublish.execute("org-santos-holdings", "lst-cebu-501", true);
    },
    { message: /404 Not Found/ },
  );

  // Attempt 4: Owner A tries to decide Owner B's application by ID
  await assert.rejects(
    async () => {
      await decideApp.execute("org-santos-holdings", "app-cebu-901", { decision: "APPROVED" });
    },
    { message: /404 Not Found/ },
  );
});
