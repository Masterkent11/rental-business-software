# Architecture assessment at this checkpoint

**Not yet enterprise-audit complete.** The per-file ledger distinguishes detailed content review from automated inventory/import scanning. Do not use this checkpoint as a release approval.

API remains a Nest/Fastify modular monolith: domain policies and application ports/use cases, outbound Postgres/Supabase/storage/payment adapters, inbound controllers/mappers/DTOs and module composition. Existing architecture gates pass after new infrastructure naming was corrected to `.adapter.ts`. Registered routes are traversed from AppModule; no public Swagger endpoint was introduced. Authentication comes from JWKS verification and database-loaded capabilities; user_metadata only contributes display-name data in the inspected identity adapter.

Flutter retains its existing architecture and UI. Compile-time public configuration is centralized. The inspected feature domains no longer depend on Flutter UI. Older repositories combine network DTO mapping with provider wiring, and application folders contain framework-managed state; deeper separation and cross-feature contract ownership still need file-by-file review before further justified changes.

Owner Web keeps existing domain/application ports, infrastructure adapters, composition root and Zustand presentation state. Session lifetime and HTTP recovery improvements add no new service layer. Dashboard ECharts styling and the user-requested original layout scale are preserved; backend metrics are not replaced by mock values.

Authoritative verification remains backend-controlled manual review in the inspected implementation. ML Kit OCR/face detection does not establish document authenticity, face matching, or spoof resistance. No fake success/provider was introduced. Application submission and database authorization paths require the remaining persistence/integration audit before declaring end-to-end verification complete.

Outstanding acceptance: complete semantic audit and dependency-closure review; precise per-operation authorization/error contract reconciliation; fixture-backed ownership/financial/mutation API tests; deployed database/provider reconciliation; Android toolchain/native builds; staging/production iOS failures; signed production release configuration and complete repository secret scanning. Existing tests and static import scans are evidence, not substitutes for these items.

The financial persistence review now includes source-payment ownership/state/budget and invoice-budget invariants under concurrent writes. Application use cases delegate invoice period/total policy to the domain. PostgreSQL row locks and an additive invoker trigger protect the inspected allocation path, including direct SQL tests. This does not certify every financial repository or deployed grants.

F16 confirms concrete infrastructure imports in three Flutter explore application files. This boundary remains open. Search-history lifecycle now rejects stale disk restoration after clear/disposal. The corrected inventory scanner and hash-bound ledger distinguish reviewed content from pending files; neither a passing test suite nor import metadata closes pending reviews.
