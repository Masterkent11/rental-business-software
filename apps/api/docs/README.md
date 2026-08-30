# API Architecture Documentation Suite

Welcome to the **API Architecture Documentation Suite** for `apps/api`.

This documentation set serves as the single source of truth for engineering practices, design patterns, folder layout, naming standards, and architectural testing governance.

---

## Documentation Index

1. **[Master Plan](architecture/master-plan.md)**
   - High-level architecture, Clean & Hexagonal design principles, layer responsibilities, multi-tenancy, and microservices scalability strategy.
2. **[Patterns Catalog](architecture/patterns.md)**
   - Complete reference for all 15 architectural patterns (Entity, Value Object, Domain Error, Domain Event, Use Case, Repository Port, Provider Port, Storage Port, Messaging Port, Unit of Work, Identity Provider, DTO, Mapper, Controller, Composition Root) with code examples and usage guidance.
3. **[Folder Structure & Directory Governance](architecture/folder-structure.md)**
   - Complete directory layout for `src/domain/`, `src/application/`, `src/infrastructure/`, and `src/modules/`.
4. **[Naming Conventions & Import Standards](architecture/naming-conventions.md)**
   - Canonical role suffixes (`*.port.ts`, `*.use-case.ts`, `*.dto.ts`, `*.mapper.ts`, `*.controller.ts`, `*.repository.ts`, `*.adapter.ts`, `*.provider.ts`, `*.module.ts`), natural domain naming, and `@/*` path alias standards.
5. **[Feature Development Workflow Guide](architecture/development-workflow.md)**
   - The 14-step feature implementation guide and an end-to-end walkthrough example (`CreateListing`).
6. **[Testing Governance & Architectural Rules](architecture/testing-governance.md)**
   - Catalog of ARCH-001 through ARCH-028 automated architectural boundary rules and CI/CD quality gates.

---

## Machine-Readable Operational Contract

For automated AI coding agents, refer to **[`AGENTS.md`](../AGENTS.md)** at the root of `apps/api/`.
