import test from "node:test";
import assert from "node:assert/strict";

// Pure Use Case implementation for isolation validation
class LoadPropertiesUseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(organizationId) {
    if (!organizationId) {
      throw new Error("Organization ID is required to load properties");
    }
    return this.repository.getProperties(organizationId);
  }
}

// Mock Owner Repository Port implementing strict tenant boundary
class MockTenantRepository {
  constructor() {
    this.organizations = {
      "org-owner-a": {
        properties: [{ id: "prop-a1", name: "Owner A Building", organizationId: "org-owner-a" }],
        listings: [{ id: "list-a1", title: "Owner A Studio", organizationId: "org-owner-a" }],
        applications: [{ id: "app-a1", reference: "AP-A1", organizationId: "org-owner-a" }],
      },
      "org-owner-b": {
        properties: [{ id: "prop-b1", name: "Owner B Condo", organizationId: "org-owner-b" }],
        listings: [{ id: "list-b1", title: "Owner B 2BR", organizationId: "org-owner-b" }],
        applications: [{ id: "app-b1", reference: "AP-B1", organizationId: "org-owner-b" }],
      },
    };
  }

  async getProperties(organizationId) {
    if (!this.organizations[organizationId]) {
      throw new Error(`403 Forbidden: user is not a member of ${organizationId}`);
    }
    return this.organizations[organizationId].properties;
  }

  async getOrganizationListings(organizationId) {
    if (!this.organizations[organizationId]) {
      throw new Error(`403 Forbidden: user is not a member of ${organizationId}`);
    }
    return this.organizations[organizationId].listings;
  }

  async getApplications(organizationId) {
    if (!this.organizations[organizationId]) {
      throw new Error(`403 Forbidden: user is not a member of ${organizationId}`);
    }
    return this.organizations[organizationId].applications;
  }
}

test("Multi-Tenancy: Owner A loads ONLY Owner A properties", async () => {
  const repo = new MockTenantRepository();
  const useCase = new LoadPropertiesUseCase(repo);

  const properties = await useCase.execute("org-owner-a");
  assert.equal(properties.length, 1);
  assert.equal(properties[0].organizationId, "org-owner-a");
  assert.equal(properties[0].name, "Owner A Building");
});

test("Multi-Tenancy: Owner B loads ONLY Owner B properties", async () => {
  const repo = new MockTenantRepository();
  const useCase = new LoadPropertiesUseCase(repo);

  const properties = await useCase.execute("org-owner-b");
  assert.equal(properties.length, 1);
  assert.equal(properties[0].organizationId, "org-owner-b");
  assert.equal(properties[0].name, "Owner B Condo");
});

test("Multi-Tenancy: IDOR attempt with unauthorized organization ID throws 403 error", async () => {
  const repo = new MockTenantRepository();
  const useCase = new LoadPropertiesUseCase(repo);

  await assert.rejects(
    async () => {
      await useCase.execute("unauthorized-foreign-org-id");
    },
    {
      message: /403 Forbidden/,
    },
  );
});

test("Multi-Tenancy: Empty organization ID is rejected before reaching infrastructure", async () => {
  const repo = new MockTenantRepository();
  const useCase = new LoadPropertiesUseCase(repo);

  await assert.rejects(
    async () => {
      await useCase.execute("");
    },
    {
      message: /Organization ID is required/,
    },
  );
});
