# Capability Map: Commerce Microservices Learning Platform

This map is the dependency index for the local, multi-repository project.
Every item below is an independently buildable local Git repository.

| Module ID | Responsibility | Depends on |
|---|---|---|
| commerce-infra | Local PostgreSQL, Kafka, observability and container orchestration | - |
| commerce-contracts | Versioned OpenAPI and JSON Schema event contracts | - |
| commerce-catalog-service | Products, variants, categories and publication | contracts, infra |
| commerce-web | Customer storefront | contracts, catalog |
| commerce-api-gateway | Browser edge routing and BFF composition | contracts, catalog, cart, pricing, order |
| commerce-pricing-service | Quotes, price lists and promotions | contracts, infra |
| commerce-cart-service | Carts and cart-item versioning | contracts, infra |
| commerce-order-service | Orders, idempotency, Saga coordination and outbox | contracts, infra, cart, pricing |
| commerce-inventory-service | Stock, reservations and movement ledger | contracts, infra |
| commerce-payment-service | Payment attempts, webhook records and reconciliation | contracts, infra |
| commerce-fulfillment-service | Pick, pack, shipment and tracking lifecycle | contracts, infra |
| commerce-readmodel-service | Rebuildable customer and operations projections | contracts, infra |
| commerce-search-service | Rebuildable catalog search projection | contracts, infra |
| commerce-notification-service | Notification jobs and delivery results | contracts, infra |
| commerce-ops-web | Operations user interface | contracts, gateway |
| commerce-e2e-tests | Cross-service local acceptance tests | all implemented services |

Build order: `infra + contracts` -> `catalog + web` -> `pricing + cart` ->
`gateway + order` -> `Kafka + inventory` -> `payment + Saga` ->
`fulfillment + readmodel + search + notification + ops` -> `e2e-tests`.

Identity remains a deliberate later decision: no production authentication design is invented before
an identity provider and policy are selected.
