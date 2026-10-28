# E-commerce & Order Fulfillment Platform

## End-to-End Architecture Blueprint: Wireframes, Microservices, Kafka, Database Tables, APIs, and Roadmap

**Status:** Revised draft for review \| **Version:** 0.2\
**Frontend:** React + TypeScript \| **Backend:** Node.js + TypeScript\
**Messaging:** Apache Kafka \| **Data:** PostgreSQL per service
boundary, Redis where useful\
**Local:** Docker Compose \| **Later:** Kubernetes

> This is a proposed design to review and edit, not a final production
> migration. Confirm business policies, payment provider behavior,
> schema format, and operational targets before implementation.

------------------------------------------------------------------------

# 1. Executive summary

Build a realistic e-commerce platform where customers browse products,
manage carts, check out, pay, reserve inventory, track shipments, cancel
eligible orders, and request returns/refunds. Internal users manage
catalog, inventory, fulfillment, and operational recovery.

The learning objective is to implement distributed business workflows
correctly when services have independent databases, deployments, and
failure modes.

## Key architecture skills

-   Domain decomposition, service ownership, and multiple Git
    repositories.
-   REST versus Kafka versus SSE/WebSockets.
-   Kafka topics, partitions, keys, consumer groups, offsets, replay,
    and schema evolution.
-   Durable order Saga orchestration and compensation.
-   Inventory reservation under concurrency.
-   Payment idempotency, provider webhooks, and reconciliation.
-   Transactional outbox/inbox and duplicate-event handling.
-   Eventual consistency and read models.
-   Security, observability, contract testing, load testing, CI/CD,
    Docker, and Kubernetes.

## First vertical slice

**Browse product → add to cart → checkout → create order → reserve
inventory → authorize payment → confirm order → display status in
React.**

Do not implement every service on day one. Build this path reliably
first, including failure paths.

------------------------------------------------------------------------

# 2. Product scope

## Customer capabilities

-   Browse/search published products and variants.
-   Add/remove cart items and change quantity.
-   Review server-calculated prices, discounts, shipping, and tax.
-   Submit an order and pay through a provider-hosted/tokenized flow.
-   View order history, payment status, and shipment tracking.
-   Request eligible cancellation, return, or refund.
-   Receive email/in-app notifications.

## Internal capabilities

-   Catalog administration and product publication.
-   Inventory receiving, adjustments, reservations, and audits.
-   Order operations and Saga timeline.
-   Fulfillment pick/pack/dispatch.
-   Refund approvals and payment reconciliation.
-   Kafka lag, outbox backlog, dead-letter queue (DLQ), and
    provider-error dashboards.

## Assumptions to validate

-   Start with one store and one currency; keep store/tenant identifiers
    in the model.
-   Support product variants/SKUs.
-   Inventory is tracked by SKU and warehouse, initially one warehouse.
-   Use payment sandbox and shipping simulator initially.
-   Payment data must never include raw card number or CVV in your
    application.
-   AI is not required for checkout correctness. Optional AI features
    can be added later.

------------------------------------------------------------------------

# 3. Logical architecture

``` mermaid
flowchart TB
    C[Customer Storefront] --> GW[API Gateway / BFF]
    OPS[Operations UI] --> GW
    GW --> ID[Identity Service]
    GW --> CAT[Catalog Service]
    GW --> CART[Cart Service]
    GW --> PRICE[Pricing Service]
    GW --> ORD[Order Service / Saga Orchestrator]
    GW --> READ[Order Read Model]
    CAT <--> K[(Apache Kafka)]
    CART <--> K
    PRICE <--> K
    ORD <--> K
    INV[Inventory Service] <--> K
    PAY[Payment Service] <--> K
    FUL[Fulfillment Service] <--> K
    NOTIF[Notification Service] <--> K
    SEARCH[Search Service] <--> K
    ID --> DB[(Service-owned PostgreSQL)]
    CAT --> DB
    CART --> DB
    PRICE --> DB
    ORD --> DB
    INV --> DB
    PAY --> DB
    FUL --> DB
    NOTIF --> DB
    READ --> DB
    CART --> R[(Redis, optional)]
    CAT --> OBJ[(Object storage)]
    PAY <--> PSP[Payment Provider]
    FUL <--> CARRIER[Carrier Provider]
    GW -. traces/logs/metrics .-> OBS[OpenTelemetry + Monitoring]
    ORD -. traces/logs/metrics .-> OBS
    K -. broker metrics .-> OBS
```

This is a logical diagram, not a shared-database design. Each service
owns its data and credentials. Other services do not query its tables
directly.

## Architectural rules

1.  REST for immediate queries/commands that need a response.
2.  Kafka for asynchronous domain events and background workflows.
3.  SSE or WebSockets for live UI updates; the browser never connects
    directly to Kafka.
4.  The Order Service owns the initial Saga state machine.
5.  Inventory and Payment services own their own business records.
6.  Consumers assume at-least-once delivery and implement idempotency.
7.  Outbox/inbox patterns protect against database/broker failure
    windows.
8.  External provider timeouts require reconciliation, not blind
    retries.
9.  Read models are derived and eventually consistent.
10. No service may claim payment or shipment success without
    authoritative evidence.

------------------------------------------------------------------------

# 4. Git repositories and service boundaries

  ---------------------------------------------------------------------------------
  Repository                        Responsibility          Data ownership
  --------------------------------- ----------------------- -----------------------
  `commerce-web`                    Customer storefront,    Frontend only
                                    cart, checkout, order   
                                    history                 

  `commerce-ops-web`                Admin, inventory,       Frontend only
                                    fulfillment, operations 

  `commerce-api-gateway`            Routing, BFF            Gateway config
                                    aggregation, rate       
                                    limits, request IDs     

  `commerce-identity-service`       Users, addresses,       Identity DB
                                    roles/permissions       

  `commerce-catalog-service`        Products, variants,     Catalog DB
                                    categories, media       
                                    metadata                

  `commerce-pricing-service`        Price lists, quotes,    Pricing DB
                                    promotions              

  `commerce-cart-service`           Carts and cart items    Cart DB/cache

  `commerce-order-service`          Orders, item snapshots, Order DB
                                    Saga state              

  `commerce-inventory-service`      Stock, reservations,    Inventory DB
                                    movements               

  `commerce-payment-service`        Payment attempts,       Payment DB
                                    transactions, refunds,  
                                    webhooks                

  `commerce-fulfillment-service`    Pick/pack, shipments,   Fulfillment DB
                                    tracking                

  `commerce-notification-service`   Notification jobs and   Notification DB
                                    delivery results        

  `commerce-search-service`         Product search index    Search index

  `commerce-readmodel-service`      Customer order history  Read-model DB
                                    and operations          
                                    projections             

  `commerce-contracts`              OpenAPI, event schemas, Versioned contracts
                                    compatibility checks    

  `commerce-infra`                  Docker Compose, Kafka,  Infrastructure
                                    observability, CI/CD,   
                                    deployment              

  `commerce-e2e-tests`              Cross-service journeys  Test fixtures/code
  ---------------------------------------------------------------------------------

**Start with:** web, gateway, catalog, cart, order, inventory, payment,
contracts, and infra. Add pricing, fulfillment, notification, search,
and read models after checkout works.

Do not create a service just because a table exists. A service should
own a coherent business capability. For an early prototype, some
capabilities can remain modules and be extracted later.

------------------------------------------------------------------------

# 5. Wireframes

These are low-fidelity wireframes for requirements review, not
pixel-perfect visual designs.

## 5.1 Storefront

``` text
+--------------------------------------------------------------------------------+
| LOGO    [ Search products................................ ] Account   Cart(2)  |
+--------------------------------------------------------------------------------+
| Categories: Electronics | Home | Fashion | Books | Offers                      |
+--------------------------------------------------------------------------------+
| Featured campaign / hero banner                              [Browse offers]   |
+--------------------------------------------------------------------------------+
| Popular categories                                                               |
| [Category] [Category] [Category] [Category]                                    |
+--------------------------------------------------------------------------------+
| Recommended products                                                           |
| +----------------+ +----------------+ +----------------+ +----------------+   |
| | Product image  | | Product image  | | Product image  | | Product image  |   |
| | Product name   | | Product name   | | Product name   | | Product name   |   |
| | Price          | | Price          | | Price          | | Price          |   |
| | Availability   | | Availability   | | Availability   | | Availability   |   |
| | [View] [Add]   | | [View] [Add]   | | [View] [Add]   | | [View] [Add]   |   |
| +----------------+ +----------------+ +----------------+ +----------------+   |
+--------------------------------------------------------------------------------+
```

## 5.2 Product details

``` text
+--------------------------------------------------------------------------------+
| LOGO   Search products                                        Account  Cart     |
+--------------------------------------------------------------------------------+
| Home > Category > Product                                                      |
+-----------------------------------+--------------------------------------------+
| [ Main image ]                    | Product name                               |
| [thumb] [thumb] [thumb]           | Price / promotion                          |
|                                   | Variant: [Color v] [Size v]                |
|                                   | Quantity [-] 1 [+]                         |
|                                   | Availability (informational)               |
|                                   | [Add to cart] [Buy now]                    |
+-----------------------------------+--------------------------------------------+
| Description | Specifications | Shipping / Returns                              |
+--------------------------------------------------------------------------------+
```

## 5.3 Cart

``` text
+--------------------------------------------------------------------------------+
| Shopping Cart                                                                  |
+--------------------------------------------------------------------------------+
| Item            Variant       Unit price      Qty          Line total           |
| Product A       Black         ₹2,000          [-] 1 [+]    ₹2,000 [Remove]     |
| Product B       Large         ₹1,000          [-] 2 [+]    ₹2,000 [Remove]     |
+--------------------------------------------------------------------------------+
| Promo code [____________] [Apply]                                              |
| Subtotal                                  ₹4,000                               |
| Discount                                  -₹200                                |
| Shipping                                  Calculated at checkout               |
| Tax                                       Calculated at checkout               |
| Estimated total                           ₹3,800 + final charges               |
| [Continue shopping]                                  [Proceed to checkout]     |
+--------------------------------------------------------------------------------+
```

The server recalculates all prices, discounts, taxes, and shipping.
Never trust client-supplied totals.

## 5.4 Checkout

``` text
+--------------------------------------------------------------------------------+
| Checkout — Delivery                                                            |
| Recipient [____________________] Phone [____________________]                 |
| Address 1 [__________________________________________________]                 |
| Address 2 [__________________________________________________]                 |
| City [____________] Region [____________] Postal code [________]              |
| Country [_________]                                                              |
| Delivery: ( ) Standard, cost/estimate  ( ) Express, cost/estimate              |
| [Back to cart]                                           [Continue to payment] |
+--------------------------------------------------------------------------------+
| Payment and review                                                             |
| Items | Discounts | Shipping | Tax | Final total                              |
| Use provider-hosted checkout or tokenized payment UI                           |
| [Continue to secure payment]                                                   |
| Final step: [Place order]                                                     |
+--------------------------------------------------------------------------------+
```

The exact order of authorization/capture depends on provider
capabilities and business policy. Do not store raw card details.

## 5.5 Order confirmation

``` text
+--------------------------------------------------------------------------------+
| Order confirmed / Processing                                                   |
| Order #ORD-2026-001042                                                         |
| Items, quantities, shipping summary, total, payment status                     |
| [View order details] [Continue shopping]                                       |
+--------------------------------------------------------------------------------+
```

Do not show "paid" merely because the browser returned from the payment
page. Use verified backend state and provider webhooks.

## 5.6 Order history and tracking

``` text
+--------------------------------------------------------------------------------+
| My Account > Orders                                                            |
| Order #          Date       Total       Status           Action                 |
| ORD-001042       28 Oct     ₹3,900      Processing       [Details]              |
| ORD-001011       21 Oct     ₹1,200      Shipped           [Track]               |
+--------------------------------------------------------------------------------+
| Order detail: placed -> payment -> inventory -> processing -> shipped -> done  |
| Payment status: Authorized / Captured / Failed / Refunded                      |
| Shipment: carrier, tracking number, last tracking event                        |
| [Cancel if eligible] [Contact support]                                        |
+--------------------------------------------------------------------------------+
```

Keep order, payment, and fulfillment states separate. One status field
cannot represent all distributed state.

## 5.7 Operations dashboard

``` text
+--------------------------------------------------------------------------------+
| Commerce Operations                                                            |
| Orders today | Pending payments | Inventory alerts | Delayed shipments          |
+--------------------------------------------------------------------------------+
| Order ID       Order state       Payment        Inventory      Updated          |
| ORD-001042     Processing        Authorized     Reserved       1 min ago        |
| ORD-001041     Confirmed         Authorized     Reserved       3 min ago        |
| ORD-001040     Checkout failed   Failed         Released       5 min ago       |
+--------------------------------------------------------------------------------+
| Saga timeline | Kafka consumer lag | Outbox backlog | DLQ | Provider errors    |
+--------------------------------------------------------------------------------+
```

Recovery actions must be audited and state-aware. Never provide a blind
"replay all" control for payment/refund/shipment events.

## 5.8 Catalog administration

``` text
+--------------------------------------------------------------------------------+
| Catalog Admin                                      [Create product]            |
| Search [____________] Status [All v] Category [All v]                          |
| SKU       Product          Price       Publication        Inventory link        |
| SKU-001   Headphones       ₹2,000      Published          [View stock]         |
| SKU-002   Desk lamp        ₹1,000      Draft              [View stock]         |
+--------------------------------------------------------------------------------+
| Editor: title, description, category, variants, images, status                  |
| [Save draft] [Publish] [Archive]                                               |
+--------------------------------------------------------------------------------+
```

Catalog owns product metadata; Inventory owns stock. The UI may
aggregate the two, but mutations go to their owning services.

## 5.9 Inventory and fulfillment operations

``` text
+--------------------------------------------------------------------------------+
| Inventory                                                                      |
| SKU      Warehouse   On hand   Reserved   Available   Action                   |
| SKU-001  WH-01       100       12         88          [Details]                |
| SKU-002  WH-01       20        20         0           [Details]                |
| [Adjust stock] requires permission + reason + audit record                     |
+--------------------------------------------------------------------------------+
| Fulfillment: Order -> Pick -> Pack -> Label -> Dispatch -> Tracking             |
| Order        Payment readiness   Pick status    Action                          |
| ORD-001042   Authorized/Captured  Ready to pick  [Open]                         |
+--------------------------------------------------------------------------------+
```

Available quantity must be defined once by Inventory Service,
e.g. on-hand minus reserved minus safety stock. Fulfillment must verify
order eligibility and inventory state before dispatch.

------------------------------------------------------------------------

# 6. Order state and domain model

## 6.1 Keep state dimensions separate

-   **Order:** `pending`, `confirmed`, `processing`,
    `partially_fulfilled`, `shipped`, `delivered`, `cancelled`,
    `completed`, `failed`.
-   **Payment:** `not_started`, `requires_action`, `authorized`,
    `captured`, `failed`, `unknown`, `partially_refunded`, `refunded`,
    `voided`.
-   **Inventory reservation:** `pending`, `reserved`, `committed`,
    `released`, `expired`, `failed`.
-   **Fulfillment:** `not_ready`, `ready_to_pick`, `picking`, `packed`,
    `shipped`, `delivered`, `exception`, `cancelled`.
-   **Refund:** `requested`, `approved`, `processing`, `succeeded`,
    `failed`, `rejected`.

These are proposed enums; define allowed transitions and enforce them in
the owning service.

``` mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Confirmed: Required payment and inventory steps succeed
    Pending --> Failed: Non-recoverable checkout failure
    Pending --> Cancelled: Eligible cancellation
    Confirmed --> Processing
    Processing --> Shipped
    Shipped --> Delivered
    Delivered --> Completed
    Confirmed --> Cancelled: Policy allows cancellation
```

------------------------------------------------------------------------

# 7. Checkout Saga: happy path and failures

## 7.1 Orchestration model

Use the Order Service as Saga orchestrator initially. It persists
workflow state, decides the next command, and correlates responses.
Inventory, Payment, and Fulfillment own their local records.

``` mermaid
sequenceDiagram
    actor Customer
    participant UI as React
    participant GW as Gateway
    participant CART as Cart
    participant PRICE as Pricing
    participant ORD as Order/Saga
    participant K as Kafka
    participant INV as Inventory
    participant PAY as Payment
    participant FUL as Fulfillment
    participant N as Notification

    Customer->>UI: Checkout
    UI->>GW: POST /api/v1/checkout + Idempotency-Key
    GW->>CART: Validate cart/version
    GW->>PRICE: Recalculate quote
    GW->>ORD: Create order snapshot
    ORD-->>UI: 202 Accepted + orderId/status URL
    ORD->>K: OrderCheckoutStarted
    K->>INV: Reservation request
    INV->>K: InventoryReserved
    K->>ORD: InventoryReserved
    ORD->>K: PaymentAuthorizationRequested
    K->>PAY: Authorize payment
    PAY->>K: PaymentAuthorized
    K->>ORD: PaymentAuthorized
    ORD->>K: OrderConfirmed
    K->>FUL: Begin fulfillment
    K->>N: Send confirmation
    UI->>GW: GET /api/v1/orders/{id}
    GW-->>UI: Current authorized order state
```

The API may return `202 Accepted` while checkout continues
asynchronously. Never imply payment or inventory reservation succeeded
until the relevant service has confirmed it.

## 7.2 Detailed flow

1.  Browser submits cart ID/version, address reference, shipping method,
    quote reference, and idempotency key.
2.  Gateway authenticates user, applies rate limits, and forwards.
3.  Cart validates ownership and current version.
4.  Pricing calculates authoritative quote and expiry.
5.  Order Service stores order items and immutable product/price/address
    snapshots.
6.  In the same PostgreSQL transaction, it writes `OrderCheckoutStarted`
    to its outbox.
7.  Outbox publisher sends event to Kafka and records publication.
8.  Inventory reserves all requested quantities atomically or fails the
    reservation.
9.  Inventory emits `InventoryReserved` or `InventoryReservationFailed`.
10. Order Saga verifies the response belongs to the active order
    attempt.
11. Payment Service uses a stable idempotency key for provider
    authorization.
12. Payment Service verifies provider result/webhook and emits a
    normalized event.
13. Order Service confirms the order only when policy-required steps
    succeed.
14. Fulfillment, notifications, and read-model consumers react
    independently.
15. UI polls or subscribes to authorized order status and displays the
    latest state.

## 7.3 Failure and compensation table

  -----------------------------------------------------------------------
  Failure                             Behavior
  ----------------------------------- -----------------------------------
  Price quote expired                 Requote; ask for confirmation if
                                      total changed

  Inventory unavailable               Fail checkout or ask customer to
                                      modify cart

  Payment declined                    Release inventory reservation

  Payment timeout                     Mark outcome unknown; reconcile
                                      provider before retry

  Order service restarts              Resume from persisted Saga state

  Kafka consumer restarts             Resume offsets; idempotency
                                      prevents repeated effects

  Event delivered twice               Deduplicate by event ID and
                                      business idempotency key

  Notification provider fails         Retry independently; do not undo
                                      confirmed order

  Carrier API times out               Reconcile shipment by stable
                                      provider reference

  Cancellation races with dispatch    Conditional state transition;
                                      possibly route to return flow

  Compensation fails                  Persist unresolved step, alert
                                      operations, retry safely
  -----------------------------------------------------------------------

A compensation is a new business operation, not a distributed database
rollback. It may fail and must be observable.

------------------------------------------------------------------------

# 8. Kafka design

## 8.1 What to learn and implement

-   Brokers, topics, partitions, replication, ISR.
-   Producer acknowledgements and retries.
-   Idempotent producer configuration.
-   Consumer groups, offsets, commits, and rebalances.
-   Partition key selection and ordering boundaries.
-   Schema Registry and compatibility.
-   Retry/DLQ strategy.
-   Retention and replay.
-   Outbox/inbox.
-   ACLs, TLS, authentication, and topic ownership.
-   Lag, rebalances, under-replicated partitions, and broker health
    metrics.

## 8.2 Topic naming convention

Adopt one convention such as `commerce.<domain>.<event-name>.v1`.

Suggested topics: - `commerce.catalog.product-published.v1` -
`commerce.cart.checked-out.v1` - `commerce.order.checkout-started.v1` -
`commerce.order.confirmed.v1` - `commerce.order.cancelled.v1` -
`commerce.inventory.reservation-requested.v1` -
`commerce.inventory.reserved.v1` -
`commerce.inventory.reservation-failed.v1` -
`commerce.inventory.reservation-released.v1` -
`commerce.payment.authorization-requested.v1` -
`commerce.payment.authorized.v1` -
`commerce.payment.authorization-failed.v1` -
`commerce.payment.capture-requested.v1` -
`commerce.payment.captured.v1` - `commerce.payment.voided.v1` -
`commerce.payment.refund-requested.v1` -
`commerce.payment.refunded.v1` -
`commerce.fulfillment.shipment-requested.v1` -
`commerce.fulfillment.shipped.v1` -
`commerce.fulfillment.delivered.v1` -
`commerce.notification.delivery-failed.v1`

Commands ask a specific owner to do something (`ReserveInventory`).
Events report facts (`InventoryReserved`). Kafka can carry commands, but
use explicit names and routing so the intended owner is clear.

## 8.3 Event envelope example

``` json
{
  "eventId": "uuid",
  "eventType": "InventoryReserved",
  "eventVersion": 1,
  "occurredAt": "2026-10-28T12:00:00Z",
  "producer": "commerce-inventory-service",
  "correlationId": "order-saga-id",
  "causationId": "previous-event-id",
  "aggregateType": "InventoryReservation",
  "aggregateId": "reservation-id",
  "payload": {
    "orderId": "order-id",
    "reservationId": "reservation-id",
    "items": [
      {"sku": "SKU-001", "warehouseId": "WH-01", "quantity": 2}
    ]
  }
}
```

Use runtime schema validation. Do not put raw addresses, card details,
secrets, or unnecessary personal data in Kafka messages.

## 8.4 Partition key strategy

  -----------------------------------------------------------------------
  Topic                   Suggested key           Reason
  ----------------------- ----------------------- -----------------------
  Order lifecycle         `orderId`               Per-order ordering

  Inventory               `warehouseId:sku` or    SKU contention and
                          reservation ID, based   ordering trade-off
                          on workload             

  Payment                 `paymentAttemptId`      Payment attempt
                                                  ordering

  Shipment                `shipmentId`            Shipment state ordering

  Catalog                 `productId`/`sku`       Product update ordering

  Notifications           notification ID         Distribute independent
                                                  deliveries
  -----------------------------------------------------------------------

Kafka only guarantees order within a partition. A popular SKU can become
a hot key; inventory correctness must come from the Inventory database
transaction, not Kafka ordering alone.

## 8.5 Consumer groups

Use a separate consumer group for each independent responsibility: -
`order-saga-consumer` - `inventory-reservation-consumer` -
`payment-command-consumer` - `notification-delivery-consumer` -
`search-projection-consumer` - `customer-order-readmodel-consumer` -
`analytics-projection-consumer`

Consumers in one group share partitions. Distinct groups each receive
their own logical copy of the topic.

## 8.6 Delivery semantics and idempotency

Design for at-least-once processing. Kafka producer idempotence does not
make a PostgreSQL write plus a payment provider call exactly once.

Consumer processing pattern: 1. Validate event envelope/schema. 2. Begin
local DB transaction. 3. Insert inbox record with unique
`(consumer_name, event_id)`. 4. If already processed, do not repeat
business effect. 5. Apply local state transition. 6. Write outgoing
events to local outbox. 7. Commit database transaction. 8. Commit Kafka
offset only after durable processing, following the client library's
semantics.

Use bounded retries, backoff, and DLQ handling. Avoid committing offsets
before the business effect is durable unless a deliberate recovery
protocol exists.

## 8.7 Schema evolution

Use Avro, Protobuf, or JSON Schema with a Schema Registry. Select one
and automate compatibility checks in CI.

-   Add optional fields safely.
-   Avoid removing/renaming required fields in a breaking release.
-   Keep consumers tolerant of unknown optional fields.
-   Version event contracts intentionally.
-   Test old consumer/new producer and new consumer/old producer.
-   Roll out breaking changes using an explicit migration plan.

## 8.8 Retry and DLQ

For permanent failures, record original topic/partition/offset, event
ID, schema version, error code, attempts, and correlation ID in DLQ
metadata. Alert on DLQ growth. Redrive must revalidate authorization,
idempotency, and state transitions. Replaying an old
payment/refund/shipment command blindly is unsafe.

## 8.9 Outbox and inbox

**Outbox:** business state and outgoing event record are committed in
the same local DB transaction. A publisher sends pending records to
Kafka and marks them published. If it crashes after broker
acknowledgement but before marking published, it may publish again;
consumers must deduplicate.

**Inbox:** each consumer records event IDs in its own DB and applies the
business effect transactionally. A unique key prevents duplicate logical
processing.

Kafka transactions can atomically coordinate Kafka records and offsets
in supported flows, but do not automatically provide one atomic
transaction across Kafka, PostgreSQL, and an external payment provider.

------------------------------------------------------------------------

# 9. Event catalog

  ------------------------------------------------------------------------------------
  Event                                Producer                Consumers
  ------------------------------------ ----------------------- -----------------------
  `ProductPublished.v1`                Catalog                 Search, storefront
                                                               projection

  `OrderCreated.v1`                    Order                   Read model, analytics

  `OrderCheckoutStarted.v1`            Order                   Saga workflow

  `InventoryReservationRequested.v1`   Order                   Inventory

  `InventoryReserved.v1`               Inventory               Order Saga

  `InventoryReservationFailed.v1`      Inventory               Order Saga

  `InventoryReservationReleased.v1`    Inventory               Order, analytics

  `PaymentAuthorizationRequested.v1`   Order                   Payment

  `PaymentAuthorized.v1`               Payment                 Order Saga

  `PaymentAuthorizationFailed.v1`      Payment                 Order Saga

  `PaymentCaptured.v1`                 Payment                 Order, analytics

  `PaymentVoided.v1`                   Payment                 Order

  `OrderConfirmed.v1`                  Order                   Fulfillment,
                                                               Notification, Read
                                                               model

  `OrderCancelled.v1`                  Order                   Inventory, Payment,
                                                               Fulfillment,
                                                               Notification

  `RefundRequested.v1`                 Order/refund workflow   Payment

  `RefundSucceeded.v1`                 Payment                 Order, Notification,
                                                               Read model

  `ShipmentRequested.v1`               Order                   Fulfillment

  `ShipmentCreated.v1`                 Fulfillment             Order, Notification,
                                                               Read model

  `OrderShipped.v1`                    Fulfillment             Order, Notification,
                                                               Read model

  `OrderDelivered.v1`                  Fulfillment             Order, Notification,
                                                               Read model

  `NotificationDeliveryFailed.v1`      Notification            Operations/analytics
  ------------------------------------------------------------------------------------

Avoid competing authorities for the same fact. Define that Order Service
emits `OrderConfirmed` after its state transition; Payment Service is
authoritative for provider payment state.

------------------------------------------------------------------------

# 10. Database tables --- logical schema inventory

These are logical starting definitions. Add constraints, indexes,
migrations, partitioning, and retention rules after workload review.
Cross-service IDs are logical references, not cross-database foreign
keys.

## 10.1 Identity Service

### `users`

`id UUID PK`, `email VARCHAR(320)`, `display_name VARCHAR(200)`,
`identity_provider VARCHAR(100)`, `external_subject_id VARCHAR(255)`,
`status VARCHAR(30)`, `created_at TIMESTAMPTZ`,
`updated_at TIMESTAMPTZ`.

Use unique normalized email or
`(identity_provider, external_subject_id)` according to the identity
model. Prefer OIDC rather than storing passwords yourself.

### `user_addresses`

`id UUID PK`, `user_id UUID`, `label VARCHAR(80)`,
`recipient_name VARCHAR(200)`, protected phone reference/value,
`address_line_1`, `address_line_2`, `city`, `region`, `postal_code`,
`country_code CHAR(2)`, `is_default BOOLEAN`, `created_at`,
`updated_at`.

Order Service stores an immutable address snapshot at order time.

### `roles`, `permissions`, `role_permissions`, `user_roles`

-   `roles(id, name, scope, description)`
-   `permissions(id, key, description)`
-   `role_permissions(role_id, permission_id)`
-   `user_roles(user_id, role_id, store_id nullable, created_at)`

Examples: `catalog.write`, `inventory.adjust`, `order.cancel`,
`refund.approve`, `operations.replay`.

## 10.2 Catalog Service

### `products`

`id UUID PK`, `store_id UUID`, `slug VARCHAR(250)`, `name VARCHAR(300)`,
`description TEXT`, `brand VARCHAR(150) nullable`,
`category_id UUID nullable`, `status VARCHAR(30)`, `attributes JSONB`,
`published_at TIMESTAMPTZ nullable`, `version INTEGER`, `created_at`,
`updated_at`.

Indexes: unique `(store_id, slug)`,
`(store_id, status, updated_at DESC)`.

### `product_variants`

`id UUID PK`, `store_id UUID`, `product_id UUID`, `sku VARCHAR(100)`,
`variant_attributes JSONB`, `weight_grams INTEGER nullable`,
`dimensions JSONB nullable`, `status VARCHAR(30)`, `created_at`,
`updated_at`.

Unique `(store_id, sku)`.

### `product_media`

`id UUID PK`, `product_id UUID`, `object_key VARCHAR(500)`,
`alt_text VARCHAR(300)`, `sort_order INTEGER`, `media_type VARCHAR(30)`,
`created_at`.

### `categories`

`id UUID PK`, `store_id UUID`, `parent_id UUID nullable`,
`name VARCHAR(150)`, `slug VARCHAR(200)`, `status VARCHAR(30)`,
`created_at`, `updated_at`.

## 10.3 Pricing Service

### `price_lists`

`id UUID PK`, `store_id UUID`, `name VARCHAR(150)`, `currency CHAR(3)`,
`status VARCHAR(30)`, `valid_from TIMESTAMPTZ nullable`,
`valid_to TIMESTAMPTZ nullable`, `created_at`, `updated_at`.

### `product_prices`

`id UUID PK`, `store_id UUID`, `price_list_id UUID`, `variant_id UUID`,
`unit_amount_minor BIGINT`, `currency CHAR(3)`,
`valid_from TIMESTAMPTZ`, `valid_to TIMESTAMPTZ nullable`, `created_at`.

Use integer minor units, not floating-point money.

### `promotions`

`id UUID PK`, `store_id UUID`, `code VARCHAR(100) nullable`,
`name VARCHAR(150)`, `promotion_type VARCHAR(30)`, `conditions JSONB`,
`benefit JSONB`, `usage_limit INTEGER nullable`,
`per_customer_limit INTEGER nullable`, `starts_at`, `ends_at`,
`status VARCHAR(30)`, `version INTEGER`.

### `promotion_redemptions`

`id UUID PK`, `store_id UUID`, `promotion_id UUID`, `customer_id UUID`,
`order_id UUID nullable`, `status VARCHAR(30)`,
`redeemed_at TIMESTAMPTZ nullable`, `created_at`. Enforce usage limits
transactionally.

### `price_quotes`

`id UUID PK`, `store_id UUID`, `customer_id UUID nullable`,
`cart_id UUID`, `cart_version INTEGER`, `currency CHAR(3)`,
`line_items JSONB`, `subtotal_minor BIGINT`, `discount_minor BIGINT`,
`shipping_minor BIGINT nullable`, `tax_minor BIGINT nullable`,
`total_minor BIGINT`, `expires_at TIMESTAMPTZ`, `created_at`.

## 10.4 Cart Service

### `carts`

`id UUID PK`, `store_id UUID`, `customer_id UUID nullable`,
`session_id_hash VARCHAR(128) nullable`, `status VARCHAR(30)`,
`currency CHAR(3) nullable`, `version INTEGER`,
`expires_at TIMESTAMPTZ`, `created_at`, `updated_at`.

### `cart_items`

`id UUID PK`, `cart_id UUID`, `variant_id UUID`, `sku VARCHAR(100)`,
`quantity INTEGER`, `added_at`, `updated_at`. Unique
`(cart_id, variant_id)`; quantity positive and bounded.

A cart does not reserve inventory unless a separate reservation policy
explicitly says so.

## 10.5 Order Service

### `orders`

`id UUID PK`, `store_id UUID`, `order_number VARCHAR(40)`,
`customer_id UUID nullable`, `checkout_idempotency_key VARCHAR(255)`,
`status VARCHAR(30)`, `payment_status VARCHAR(30)` (projection),
`fulfillment_status VARCHAR(30)` (projection), `currency CHAR(3)`,
`subtotal_minor BIGINT`, `discount_minor BIGINT`,
`shipping_minor BIGINT`, `tax_minor BIGINT`, `total_minor BIGINT`,
`shipping_address_snapshot JSONB`,
`billing_address_snapshot JSONB nullable`,
`price_quote_id UUID nullable`, `version INTEGER`, `placed_at`,
`confirmed_at nullable`, `cancelled_at nullable`, `created_at`,
`updated_at`.

Indexes: unique `(store_id, order_number)`, unique checkout idempotency
scope, `(store_id, customer_id, created_at DESC)`,
`(store_id, status, updated_at DESC)`.

### `order_items`

`id UUID PK`, `order_id UUID`, `variant_id UUID`, `sku VARCHAR(100)`,
`product_name_snapshot VARCHAR(300)`, `variant_snapshot JSONB`,
`quantity INTEGER`, `unit_price_minor BIGINT`, `discount_minor BIGINT`,
`tax_minor BIGINT`, `line_total_minor BIGINT`, `created_at`.

Snapshots protect historical orders from later catalog/price edits.

### `order_sagas`

`id UUID PK`, `order_id UUID`, `saga_type VARCHAR(100)`,
`state VARCHAR(50)`, `current_step VARCHAR(100)`, `version INTEGER`,
`correlation_id VARCHAR(150)`, `started_at`, `completed_at nullable`,
`last_error_code VARCHAR(100) nullable`, `next_action_at nullable`,
`created_at`, `updated_at`.

Index `(state, next_action_at)` for recovery scans.

### `order_saga_steps`

`id UUID PK`, `saga_id UUID`, `step_name VARCHAR(100)`,
`status VARCHAR(30)`, `attempt_count INTEGER`,
`request_reference VARCHAR(255) nullable`,
`result_reference VARCHAR(255) nullable`, `started_at`,
`completed_at nullable`, `error_code VARCHAR(100) nullable`,
`created_at`.

### `order_status_history`

`id UUID PK`, `order_id UUID`, `from_status VARCHAR(30) nullable`,
`to_status VARCHAR(30)`, `reason_code VARCHAR(100) nullable`,
`actor_type VARCHAR(30)`, `actor_id UUID nullable`,
`correlation_id VARCHAR(150)`, `created_at`.

### `order_cancellations`

`id UUID PK`, `order_id UUID`, `requested_by UUID nullable`,
`reason_code VARCHAR(100)`, `status VARCHAR(30)`, `requested_at`,
`completed_at nullable`, `failure_code VARCHAR(100) nullable`.

### `order_idempotency_records`

`id UUID PK`, `store_id UUID`, `customer_id UUID nullable`,
`idempotency_key VARCHAR(255)`, `request_hash VARCHAR(128)`,
`order_id UUID nullable`, `response_status INTEGER nullable`,
`status VARCHAR(30)`, `expires_at`, `created_at`. Unique within a
documented client/customer scope.

## 10.6 Inventory Service

### `inventory_items`

`id UUID PK`, `store_id UUID`, `warehouse_id UUID`, `variant_id UUID`,
`sku VARCHAR(100)`, `on_hand_quantity INTEGER`,
`reserved_quantity INTEGER`, `safety_stock_quantity INTEGER`,
`version INTEGER`, `updated_at`.

Unique `(warehouse_id, variant_id)`. Check non-negative quantities.
Define available as `on_hand - reserved - safety_stock`.

### `inventory_reservations`

`id UUID PK`, `store_id UUID`, `order_id UUID`, `warehouse_id UUID`,
`status VARCHAR(30)`, `expires_at`, `created_at`, `updated_at`.

### `inventory_reservation_items`

`id UUID PK`, `reservation_id UUID`, `variant_id UUID`,
`sku VARCHAR(100)`, `quantity INTEGER`, `created_at`.

### `inventory_movements`

`id UUID PK`, `store_id UUID`, `warehouse_id UUID`, `variant_id UUID`,
`movement_type VARCHAR(30)`, `quantity_delta INTEGER`,
`reference_type VARCHAR(50)`, `reference_id UUID nullable`,
`reason VARCHAR(200)`, `actor_id UUID nullable`, `created_at`.

Use an append-only movement ledger for adjustments/reconciliation.

### `warehouses`

`id UUID PK`, `store_id UUID`, `code VARCHAR(50)`, `name VARCHAR(150)`,
`address JSONB`, `status VARCHAR(30)`, `created_at`, `updated_at`.

## 10.7 Payment Service

### `payment_attempts`

`id UUID PK`, `store_id UUID`, `order_id UUID`, `provider VARCHAR(100)`,
`provider_payment_id VARCHAR(255) nullable`,
`idempotency_key VARCHAR(255)`, `amount_minor BIGINT`,
`currency CHAR(3)`, `status VARCHAR(30)`,
`authorization_reference VARCHAR(255) nullable`,
`capture_reference VARCHAR(255) nullable`,
`failure_code VARCHAR(100) nullable`, `created_at`, `updated_at`.

### `payment_transactions`

`id UUID PK`, `payment_attempt_id UUID`, `transaction_type VARCHAR(30)`
(`authorize`, `capture`, `void`, `refund`),
`provider_transaction_id VARCHAR(255) nullable`, `amount_minor BIGINT`,
`currency CHAR(3)`, `status VARCHAR(30)`,
`provider_response_code VARCHAR(100) nullable`, `created_at`.

### `refunds`

`id UUID PK`, `store_id UUID`, `order_id UUID`,
`payment_attempt_id UUID`, `amount_minor BIGINT`, `currency CHAR(3)`,
`reason_code VARCHAR(100)`, `status VARCHAR(30)`,
`provider_refund_id VARCHAR(255) nullable`,
`requested_by UUID nullable`, `idempotency_key VARCHAR(255)`,
`created_at`, `updated_at`.

### `payment_webhook_events`

`id UUID PK`, `provider VARCHAR(100)`, `provider_event_id VARCHAR(255)`,
`event_type VARCHAR(150)`, `payload_hash VARCHAR(128)`,
`signature_valid BOOLEAN`, `received_at`, `processed_at nullable`,
`status VARCHAR(30)`, `error_code VARCHAR(100) nullable`.

Unique `(provider, provider_event_id)`. Verify signatures and
deduplicate.

## 10.8 Fulfillment Service

### `fulfillment_orders`

`id UUID PK`, `store_id UUID`, `order_id UUID`, `warehouse_id UUID`,
`status VARCHAR(30)`, `priority INTEGER`, `created_at`, `updated_at`.

### `fulfillment_items`

`id UUID PK`, `fulfillment_order_id UUID`, `order_item_id UUID`,
`variant_id UUID`, `sku VARCHAR(100)`, `quantity_ordered INTEGER`,
`quantity_picked INTEGER`, `quantity_packed INTEGER`, `created_at`,
`updated_at`.

### `shipments`

`id UUID PK`, `store_id UUID`, `order_id UUID`,
`fulfillment_order_id UUID`, `carrier VARCHAR(100)`,
`service_level VARCHAR(100)`, `tracking_number VARCHAR(255) nullable`,
`provider_shipment_id VARCHAR(255) nullable`, `status VARCHAR(30)`,
`label_object_key VARCHAR(500) nullable`, `shipped_at nullable`,
`delivered_at nullable`, `created_at`, `updated_at`.

### `shipment_events`

`id UUID PK`, `shipment_id UUID`,
`provider_event_id VARCHAR(255) nullable`, `event_type VARCHAR(100)`,
`description TEXT nullable`, `occurred_at`, `received_at`,
`raw_payload_hash VARCHAR(128) nullable`. Deduplicate and tolerate
out-of-order carrier events.

### `shipping_quotes`

`id UUID PK`, `store_id UUID`, `order_id UUID nullable`,
`destination_postal_code VARCHAR(30)`, `service_level VARCHAR(100)`,
`amount_minor BIGINT`, `currency CHAR(3)`,
`estimated_delivery_from DATE nullable`,
`estimated_delivery_to DATE nullable`, `expires_at`, `created_at`.

## 10.9 Notification Service

### `notification_jobs`

`id UUID PK`, `store_id UUID`, `event_id UUID nullable`,
`recipient_id UUID nullable`, `channel VARCHAR(30)`,
`template_key VARCHAR(100)`, `template_version INTEGER`,
`payload JSONB`, `status VARCHAR(30)`, `attempt_count INTEGER`,
`next_attempt_at`, `created_at`, `updated_at`.

### `notification_deliveries`

`id UUID PK`, `notification_job_id UUID`, `provider VARCHAR(100)`,
`provider_message_id VARCHAR(255) nullable`, `status VARCHAR(30)`,
`error_code VARCHAR(100) nullable`, `sent_at nullable`, `created_at`.

## 10.10 Read models and search

### `customer_order_summary` (derived projection)

`store_id UUID`, `customer_id UUID`, `order_id UUID`,
`order_number VARCHAR(40)`, `order_status VARCHAR(30)`,
`payment_status VARCHAR(30)`, `fulfillment_status VARCHAR(30)`,
`total_minor BIGINT`, `currency CHAR(3)`, `placed_at`, `updated_at`,
`source_version BIGINT`.

Primary key `(store_id, order_id)`; index
`(store_id, customer_id, placed_at DESC)`. This is eventually
consistent; verify authoritative state before high-impact actions.

### `product_search_documents`

`store_id UUID`, `product_id UUID`, `variant_ids JSONB`, `name TEXT`,
`description TEXT`, `category_id UUID nullable`, `attributes JSONB`,
`publication_status VARCHAR(30)`, `updated_at`, `source_version BIGINT`.

Use PostgreSQL full text initially or OpenSearch if advanced search
needs justify it.

## 10.11 Cross-cutting tables --- per service

### `outbox_events`

`id UUID PK`, `aggregate_type VARCHAR(100)`, `aggregate_id UUID`,
`event_type VARCHAR(200)`, `event_version INTEGER`, `payload JSONB`,
`correlation_id VARCHAR(150) nullable`,
`causation_id VARCHAR(150) nullable`, `occurred_at`,
`published_at nullable`, `attempt_count INTEGER`,
`last_error_code VARCHAR(100) nullable`.

### `inbox_messages`

`consumer_name VARCHAR(150)`, `event_id UUID`, `received_at`,
`processed_at nullable`, `status VARCHAR(30)`,
`error_code VARCHAR(100) nullable`. Composite primary key
`(consumer_name, event_id)`.

### `audit_events`

`id UUID PK`, `store_id UUID nullable`, `actor_type VARCHAR(30)`,
`actor_id UUID nullable`, `action VARCHAR(150)`,
`entity_type VARCHAR(100)`, `entity_id UUID nullable`,
`correlation_id VARCHAR(150) nullable`, `before_summary JSONB nullable`,
`after_summary JSONB nullable`, `created_at`.

Keep audit records append-only where practical. Do not log secrets, card
data, or unnecessary personal information.

------------------------------------------------------------------------

# 11. Database ownership overview

``` mermaid
erDiagram
    USERS ||--o{ USER_ADDRESSES : has
    PRODUCTS ||--o{ PRODUCT_VARIANTS : offers
    CATEGORIES ||--o{ PRODUCTS : groups
    CARTS ||--o{ CART_ITEMS : contains
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ ORDER_SAGAS : coordinates
    ORDER_SAGAS ||--o{ ORDER_SAGA_STEPS : records
    INVENTORY_ITEMS ||--o{ INVENTORY_MOVEMENTS : tracks
    INVENTORY_RESERVATIONS ||--o{ INVENTORY_RESERVATION_ITEMS : includes
    PAYMENT_ATTEMPTS ||--o{ PAYMENT_TRANSACTIONS : records
    PAYMENT_ATTEMPTS ||--o{ REFUNDS : may_have
    FULFILLMENT_ORDERS ||--o{ FULFILLMENT_ITEMS : contains
    ORDERS ||--o{ SHIPMENTS : may_have
    SHIPMENTS ||--o{ SHIPMENT_EVENTS : tracks
```

This is conceptual. Cross-service relationships are logical IDs, not
physical foreign keys across databases.

------------------------------------------------------------------------

# 12. REST API inventory

Use `/api/v1`, OpenAPI, runtime validation, consistent pagination,
request IDs, and structured errors. The browser calls the Gateway, not
internal service hosts.

## Customer APIs

  Method   Route                            Purpose
  -------- -------------------------------- -------------------------------------
  GET      `/api/v1/products`               Search/list products
  GET      `/api/v1/products/{id}`          Product detail
  GET      `/api/v1/categories`             Categories
  GET      `/api/v1/cart`                   Current cart
  POST     `/api/v1/cart/items`             Add item
  PATCH    `/api/v1/cart/items/{id}`        Change quantity
  DELETE   `/api/v1/cart/items/{id}`        Remove item
  POST     `/api/v1/checkout/quote`         Revalidate cart and quote
  POST     `/api/v1/checkout`               Start checkout with idempotency key
  GET      `/api/v1/orders`                 Customer order history
  GET      `/api/v1/orders/{id}`            Authorized order detail
  POST     `/api/v1/orders/{id}/cancel`     Request eligible cancellation
  POST     `/api/v1/orders/{id}/returns`    Start return/refund process
  GET      `/api/v1/orders/{id}/tracking`   Authorized tracking view

## Admin/operations APIs

  --------------------------------------------------------------------------------------------
  Method                  Route                                        Purpose
  ----------------------- -------------------------------------------- -----------------------
  POST/PATCH              `/api/v1/admin/products` and                 Catalog changes
                          `/products/{id}`                             

  POST                    `/api/v1/admin/products/{id}/publish`        Publish product

  GET                     `/api/v1/admin/inventory`                    Stock inspection

  POST                    `/api/v1/admin/inventory/adjustments`        Audited stock
                                                                       adjustment

  GET                     `/api/v1/admin/orders`                       Search orders

  GET                     `/api/v1/admin/orders/{id}/timeline`         Saga timeline

  POST                    `/api/v1/admin/orders/{id}/cancel`           Admin cancellation
                                                                       request

  POST                    `/api/v1/admin/refunds`                      Request/approve refund
                                                                       under policy

  GET                     `/api/v1/admin/operations/kafka-lag`         Lag dashboard

  GET                     `/api/v1/admin/operations/dlq`               Inspect failed events

  POST                    `/api/v1/admin/operations/dlq/{id}/replay`   Audited controlled
                                                                       replay
  --------------------------------------------------------------------------------------------

The owning service performs authorization and business validation even
when Gateway aggregates data.

### Checkout request example

``` json
{
  "cartId": "cart-example",
  "cartVersion": 12,
  "shippingAddressId": "address-example",
  "shippingMethod": "standard",
  "priceQuoteId": "quote-example",
  "paymentMethodReference": "provider-token-reference"
}
```

Send `Idempotency-Key` as a request header. Server reloads the cart,
validates ownership and quote expiry, and recalculates the total. Never
trust the client total.

### Checkout response example

``` json
{
  "orderId": "order-example",
  "orderNumber": "ORD-2026-001042",
  "status": "pending",
  "checkoutStatus": "processing",
  "statusUrl": "/api/v1/orders/order-example"
}
```

This deliberately does not claim payment or reservation has completed.

------------------------------------------------------------------------

# 13. Inventory correctness

Inventory is a key correctness exercise.

1.  Receive the reservation request.
2.  Deduplicate it using inbox/event ID and business idempotency key.
3.  Begin a local DB transaction.
4.  Lock relevant SKU/warehouse rows in deterministic order or use
    conditional atomic updates.
5.  Verify available quantity for all items.
6.  Reserve all required items atomically or roll back all if any item
    fails, unless partial allocation is a deliberate policy.
7.  Create reservation records and update balance.
8.  Write `InventoryReserved` or `InventoryReservationFailed` to outbox
    in the same transaction.
9.  Commit, then acknowledge/commit Kafka offset according to the
    consumer design.

Conceptual single-SKU update:

``` sql
UPDATE inventory_items
SET reserved_quantity = reserved_quantity + :quantity,
    version = version + 1,
    updated_at = NOW()
WHERE warehouse_id = :warehouse_id
  AND variant_id = :variant_id
  AND on_hand_quantity - reserved_quantity - safety_stock_quantity >= :quantity;
```

Check affected-row count; zero rows means reservation failed. For
multiple SKUs, update/lock all rows within one local transaction and
roll back if any item cannot be reserved.

Reservation states: - `reserved`: held for limited time. - `committed`:
consumed according to fulfillment policy. - `released`: returned to
availability. - `expired`: TTL elapsed and release applied. - `failed`:
stock unavailable.

Expiry must be durable and idempotent; an in-memory timer alone is
insufficient.

------------------------------------------------------------------------

# 14. Payment correctness

A provider may support authorization, capture, void, refund, webhooks,
idempotency, and status lookup. The exact sequence depends on provider
and business policy.

-   Use hosted checkout/tokenized payment UI.
-   Never store raw card number/CVV.
-   Use a stable idempotency key per logical provider action.
-   Verify webhook signatures and deduplicate provider event IDs.
-   Treat a network timeout as an unknown outcome, not proof of failure.
-   Query provider status or reconcile before repeating uncertain
    actions.
-   Maintain a ledger of attempts/transactions and reconcile with
    provider records.
-   Use integer minor units for money.
-   Record partial capture/refund behavior if supported.
-   Audit refund approvals and manual payment actions.

If the provider authorized a payment but the response was lost, retrying
with a new key could create a duplicate authorization. Reuse the same
key for the same logical action and reconcile before creating another
action.

------------------------------------------------------------------------

# 15. Cancellation, returns, and refunds

## Cancellation flow

1.  Customer requests cancellation.
2.  Order Service validates state and policy.
3.  Persist a cancellation Saga.
4.  Fulfillment checks whether dispatch has started.
5.  Inventory releases uncommitted reservation if valid.
6.  Payment voids authorization or refunds captured funds, as
    appropriate.
7.  Order Service marks cancellation complete when policy-required steps
    succeed.
8.  If compensation fails, persist unresolved state and alert
    operations.
9.  Notify customer.

If shipment already left the warehouse, a return flow may be appropriate
instead of cancellation.

## Refund flow

-   Validate eligibility and amount.
-   Require approval if policy says so.
-   Create idempotent refund request.
-   Call provider and process verified webhook/result.
-   Update authoritative refund state.
-   Update order/read model and notify customer.
-   Reconcile stuck/unknown refunds.

A request for a refund is not the same as money successfully refunded.

------------------------------------------------------------------------

# 16. Security

-   Prefer OIDC; validate issuer, audience, signature, expiry, and
    client.
-   Enforce customer ownership for carts and orders.
-   Use least-privilege service identities and Kafka ACLs.
-   Validate admin permissions for inventory adjustments, refunds, and
    replays.
-   Never trust client price, discount, total, status, or role.
-   Use TLS, encryption at rest, secret manager, dependency/container
    scanning.
-   Keep secrets out of Git and logs.
-   Protect webhook signatures and replay attempts.
-   Restrict object storage and use short-lived signed URLs.
-   Define retention, deletion, export, backup, and audit policies.
-   In Kafka, use TLS/authentication/ACLs outside a throwaway local
    environment.
-   Avoid addresses, payment details, and unnecessary PII in event
    payloads.
-   Audit privileged operational actions.

------------------------------------------------------------------------

# 17. Observability and runbooks

Propagate: - `traceId`: distributed trace. - `correlationId`: order
Saga/business journey. - `causationId`: event that caused another
event. - `eventId`: unique event instance. - `orderId`,
`paymentAttemptId`, `reservationId`, `shipmentId`: business references.

Do not confuse these IDs.

## Metrics

**Services:** request rate, p95/p99 latency, error rate, DB
connection/query latency, event-loop lag, CPU/memory, provider latency.

**Kafka:** consumer lag, oldest unprocessed event age, records/bytes
in/out, rebalance count, retry/DLQ count, under-replicated partitions,
outbox backlog/age.

**Business:** checkout completion, inventory reservation failures,
payment success/failure, unknown payment outcomes, stuck Sagas,
compensation failures, shipment delays, notification delivery.

## Alerts

-   High consumer lag.
-   Growing outbox backlog.
-   DLQ growth.
-   Orders stuck in pending.
-   Unknown payment outcome beyond threshold.
-   Reservation release failure.
-   Invalid provider webhook signatures.
-   Refund stuck in processing.
-   Carrier state stale.
-   Database saturation.

Every alert needs a runbook with diagnosis, safe recovery, and
prohibited actions.

------------------------------------------------------------------------

# 18. Testing strategy

## Unit tests

-   Order/Saga transitions.
-   Price rounding and currency handling.
-   Promotion eligibility and usage limits.
-   Concurrent inventory reservations.
-   Reservation expiry/release.
-   Payment status mapping and idempotency.
-   Refund eligibility.
-   Authorization and order ownership.

## Contract tests

-   OpenAPI compatibility.
-   Event schema compatibility.
-   Old consumer/new producer.
-   Unknown optional fields.
-   Required headers and envelope validation.
-   Provider webhook validation.

## Integration tests

-   Service + its own PostgreSQL.
-   Kafka producer/consumer, offsets, retries, and DLQ.
-   Outbox recovery after restart.
-   Inbox deduplication.
-   Concurrent inventory updates.
-   Payment sandbox and webhook signatures.
-   Shipping provider simulator.
-   Read-model projection rebuild.

## End-to-end scenarios

1.  Product browse → cart → checkout → order confirmed.
2.  Duplicate checkout does not create a second order.
3.  Stock shortage causes controlled checkout failure.
4.  Payment decline releases reservation.
5.  Payment timeout triggers reconciliation, not a blind second charge.
6.  Duplicate event does not create duplicate shipment/notification.
7.  Broker outage leaves recoverable outbox rows.
8.  Consumer crash after DB commit does not duplicate business effect.
9.  Cancellation racing with dispatch is handled safely.
10. Provider refund webhook is verified and deduplicated.
11. Customer cannot read another customer's order.
12. DLQ replay cannot bypass idempotency or state validation.
13. Read model can be rebuilt and is eventually consistent.
14. Concurrent demand for one SKU does not oversell under tested load.

## Chaos/load exercises

-   Kafka unavailable during checkout.
-   Kill consumer after DB commit but before offset commit.
-   Kill outbox publisher after broker acknowledgement but before
    marking published.
-   Simulate provider timeout after provider-side success.
-   Trigger consumer rebalance under load.
-   Test hot SKU reservation contention.
-   Replay retained events into a new projection.

------------------------------------------------------------------------

# 19. CI/CD and deployment

## Per-repository pipeline

1.  Install from lockfile.
2.  Lint/type-check/test.
3.  Scan secrets and dependencies.
4.  Validate OpenAPI and event schemas.
5.  Build immutable image tagged with commit SHA.
6.  Run contract/integration tests.
7.  Publish image.
8.  Deploy development and run smoke tests.
9.  Promote to staging/production with approval and rollback.

## Local Compose environment

-   React UI and Gateway.
-   Services for the current vertical slice.
-   Kafka broker(s) appropriate for local development.
-   Schema Registry if selected.
-   PostgreSQL per service or clearly separated local databases.
-   Redis when needed.
-   MinIO/local object storage if useful.
-   OpenTelemetry Collector, Prometheus, Grafana, and log backend in
    later phases.

A single local Kafka broker is fine for learning but does not
demonstrate replication or broker failure tolerance. Use a multi-broker
staging environment to test replication. Consider managed Kafka for
production unless the team can operate Kafka reliably.

## Kubernetes later

Deployments, Services, ingress/gateway, probes, resource
requests/limits, HPA, ConfigMaps/Secrets, workload identity, network
policies, disruption budgets, rolling upgrades, Kafka client
shutdown/rebalances, storage, and runbooks.

------------------------------------------------------------------------

# 20. Repository template

``` text
commerce-order-service/
  src/
    app.ts
    server.ts
    config/
    modules/
      orders/
        routes.ts
        schemas.ts
        service.ts
        repository.ts
        state-machine.ts
      saga/
        orchestrator.ts
        handlers/
        recovery.ts
    messaging/
      kafka-producer.ts
      kafka-consumer.ts
      outbox-publisher.ts
      inbox.ts
      event-schemas.ts
    observability/
    errors/
    middleware/
    tests/
  migrations/
  openapi/
  Dockerfile
  .env.example
  package.json
  tsconfig.json
  README.md
```

Use TypeScript strict mode, runtime validation, graceful shutdown,
bounded retries, structured logs, OpenTelemetry, health/readiness
endpoints, migrations, and tests. No hardcoded secrets, no unbounded
retries, no cross-service database imports, and no provider calls
without timeouts.

Contracts repository example:

``` text
commerce-contracts/
  openapi/
    catalog.yaml
    cart.yaml
    pricing.yaml
    order.yaml
    inventory.yaml
    payment.yaml
    fulfillment.yaml
  events/
    order-checkout-started.v1.schema.json
    inventory-reservation-requested.v1.schema.json
    inventory-reserved.v1.schema.json
    payment-authorization-requested.v1.schema.json
    payment-authorized.v1.schema.json
    order-confirmed.v1.schema.json
    order-cancelled.v1.schema.json
    shipment-created.v1.schema.json
  compatibility/
  README.md
```

------------------------------------------------------------------------

# 21. Implementation roadmap

## Phase 1 --- skeleton

Create contracts, infra, Gateway, Catalog, and web. Add CI, health
checks, config validation, logging. Deliverable: browse product locally.

## Phase 2 --- cart and pricing

Add cart persistence/versioning, price quotes, promotions, server-side
recalculation. Deliverable: trusted cart totals.

## Phase 3 --- order creation

Create order snapshots, idempotency, Saga state, and outbox.
Deliverable: checkout creates one durable order.

## Phase 4 --- Kafka fundamentals

Add topics, consumer groups, schemas, compatibility checks,
inbox/outbox, retries, DLQ. Deliverable: reliable asynchronous state
updates.

## Phase 5 --- inventory

Implement atomic reservation, release/expiry, and concurrency tests.
Deliverable: no overselling in tested scenarios.

## Phase 6 --- payment

Implement provider adapter, authorization/capture, webhook verification,
and reconciliation. Deliverable: sandbox payment lifecycle.

## Phase 7 --- Saga recovery

Implement compensations, timeouts, stuck-workflow recovery, and safe DLQ
tooling. Deliverable: recovery from injected failures.

## Phase 8 --- fulfillment

Implement pick/pack/ship, carrier adapter, tracking updates.
Deliverable: shipment lifecycle.

## Phase 9 --- notifications/read models/search

Add notifications, order history projection, search, and live UI
updates.

## Phase 10 --- production readiness

Add metrics, traces, alerts, load/security/contract tests, CI/CD,
deployment, and recovery runbooks.

------------------------------------------------------------------------

# 22. Architecture Decision Records (ADRs)

Create ADRs for: 1. Microservices versus modular monolith for this
learning project. 2. Kafka topic naming and event contract format. 3.
Schema Registry and compatibility policy. 4. Saga orchestration versus
choreography. 5. Outbox/inbox and idempotency. 6. Inventory
reservation/expiry. 7. Payment authorization/capture timing. 8. Database
ownership and read models. 9. Identity provider and authorization. 10.
Kafka security, retention, partitioning, and replay. 11. Shipping
provider integration. 12. Observability/SLOs. 13. Kubernetes and managed
Kafka. 14. Data retention/privacy.

Template:

``` markdown
# ADR-NNN: Decision title
- Status: Proposed / Accepted / Superseded
- Date:
- Owners:

## Context
## Decision
## Alternatives
## Consequences
## Validation: tests, metrics, and operational checks
```

------------------------------------------------------------------------

# 23. Review checklist

Mark each `[APPROVED]`, `[CHANGE]`, `[DEFER]`, or `[OPEN QUESTION]`.

## Product

-   [ ] Single store or multi-store?
-   [ ] Currency/tax scope?
-   [ ] Product variants and SKU rules?
-   [ ] Promotions in first release?
-   [ ] Guest checkout or login required?
-   [ ] Payment provider sandbox selected?
-   [ ] Shipping simulator or real carrier?
-   [ ] Refund/cancellation policy?
-   [ ] Single or multiple warehouses?
-   [ ] Split shipments required?

## Architecture

-   [ ] Separate repositories.
-   [ ] React + TypeScript and Node.js + TypeScript.
-   [ ] Kafka for async event backbone.
-   [ ] Schema format/Registry selected.
-   [ ] PostgreSQL ownership boundaries.
-   [ ] Redis now or deferred.
-   [ ] REST/Kafka/live UI boundaries.
-   [ ] Order Service as Saga orchestrator.
-   [ ] Outbox/inbox strategy.
-   [ ] Retry/DLQ policy.
-   [ ] Search engine selected.
-   [ ] OIDC provider selected.
-   [ ] Docker Compose first; Kubernetes later.

## Payment and inventory

-   [ ] Authorization vs capture timing.
-   [ ] Provider idempotency confirmed.
-   [ ] Webhook signature validation.
-   [ ] Payment reconciliation policy.
-   [ ] Reservation TTL and release rules.
-   [ ] Backorder policy.
-   [ ] Cancellation race behavior.
-   [ ] Refund approval/reconciliation.

## Operations

-   [ ] Kafka partitions/replication per environment.
-   [ ] Retention and replay policy.
-   [ ] Schema compatibility.
-   [ ] Consumer lag/outbox/DLQ monitoring.
-   [ ] Replay permissions and audit.
-   [ ] RPO/RTO and latency targets.
-   [ ] Load test profile.
-   [ ] Retention/privacy policy.
-   [ ] Runbooks and incident ownership.

------------------------------------------------------------------------

# 24. First milestone definition of done

-   [ ] Customer browses a published product.
-   [ ] Customer adds a variant to cart.
-   [ ] Checkout recalculates authoritative price.
-   [ ] Idempotency prevents duplicate order creation.
-   [ ] Order, Saga state, and outbox event commit atomically.
-   [ ] Outbox publisher delivers `OrderCheckoutStarted.v1`.
-   [ ] Inventory reserves stock transactionally.
-   [ ] Duplicate reservation request does not reserve twice.
-   [ ] Payment sandbox uses an idempotency key.
-   [ ] Order state transitions are validated.
-   [ ] UI does not claim success before backend confirmation.
-   [ ] Correlation IDs connect logs/traces.
-   [ ] Kafka outage leaves recoverable outbox records.
-   [ ] Consumer crash does not lose or duplicate logical business
    effects.
-   [ ] Tests cover happy path and at least two failure paths.
-   [ ] README explains setup and safe recovery.

------------------------------------------------------------------------

# 25. Final recommendation

This is a strong senior-architect portfolio project if you demonstrate
correctness and recoverability, not simply the number of services.

Prioritize: 1. Domain boundaries and data ownership. 2. REST vs Kafka vs
live UI updates. 3. Kafka partitioning, consumer groups, offsets, schema
evolution, and replay. 4. Outbox/inbox, idempotency, and bounded
retries. 5. Durable Saga orchestration and compensation. 6. Inventory
reservation under concurrency. 7. Payment idempotency, webhooks, and
reconciliation. 8. Eventual-consistency read models. 9. Least-privilege
security and operational recovery. 10. Tracing, failure injection, and
runbooks.

**Start with the checkout vertical slice.** Make it reliable when
messages are duplicated, services restart, stock is unavailable, and
payment times out. Then add the remaining commerce capabilities one at a
time.

# 26. Microservices architecture quality addendum (revision 0.2)

This section strengthens the blueprint for a deliberate microservices learning path. The platform is intended to use independently deployable business services, not merely a modular monolith split into folders. “100% microservices” is not a useful quality metric by itself: the goal is autonomous services with justified boundaries, independently owned data, explicit contracts, and observable failure behavior. A service count does not prove architectural quality.

## 26.1 Service autonomy acceptance checklist

Every service intended to be a microservice must satisfy these criteria before it is considered independently deployable:

- It owns a cohesive business capability and its domain rules.
- It owns its database/schema, migrations, credentials, and persistence lifecycle. Other services cannot read or write its tables directly.
- It exposes documented, versioned APIs and/or events; consumers do not import its internal domain model.
- It can be built, tested, configured, deployed, rolled back, and scaled independently, subject to documented compatibility constraints.
- It has its own health/readiness checks, logs, metrics, trace propagation, alerts, and runbook.
- It has explicit timeout, retry, idempotency, and failure behavior for every remote dependency.
- It has service-level tests and contract tests that do not require every other service to be running for all development tasks.
- Its secrets and runtime identity are distinct and least-privileged.
- It has an owner, SLOs/operational expectations, and a documented data-retention/migration policy.
- Its events are published reliably (normally via transactional outbox where a database transaction and event publication must agree) and consumed idempotently.

A service that fails these checks may still be a useful development module, but should not be described as fully autonomous yet.

## 26.2 Suggested service catalogue and ownership

| Service | Owns | Typical synchronous interface | Typical asynchronous responsibilities |
|---|---|---|---|
| API Gateway/BFF | Routing, edge policy, request correlation; not commerce truth | Public HTTP API | Usually avoid owning domain workflows |
| Identity | Users, roles, permissions, identity links; preferably delegate authentication to OIDC provider | Identity/profile and authorization-facing APIs | User/role lifecycle events where needed |
| Catalog | Products, variants, categories, media metadata | Product browse/detail/admin APIs | Product published/updated events |
| Pricing | Price lists, promotions, quote calculation/redemptions | Authoritative price-quote API | Price/promotion change events |
| Cart | Customer cart and cart items | Cart read/update APIs | Cart lifecycle events only where useful |
| Order | Order snapshots, order state, durable Saga state | Order create/read/cancel APIs | Saga commands/events, order lifecycle events |
| Inventory | Stock, reservations, movements, warehouses | Inventory operations where immediate response is required | Reservation accepted/rejected/released events |
| Payment | Payment attempts/transactions/refunds/webhook deduplication | Payment intent/status APIs where needed | Payment authorized/failed/captured/refunded events |
| Fulfillment | Pick/pack, shipment, tracking lifecycle | Operations APIs | Fulfillment and shipment events |
| Notification | Delivery jobs/results and templates | Operational API if needed | Consumes business events and sends notifications |
| Search | Search index/projection; index is rebuildable | Search API | Consumes catalog events and rebuilds projections |
| Read Model | Query-optimized order/customer/operations projections | Read-only query API | Consumes order, payment, inventory, and fulfillment events |
| Contract/Schema tooling | Versioned API/event contracts and compatibility checks | CI/tooling rather than runtime business API | Schema compatibility and generation workflow |
| Infrastructure | Broker, networking, deployment templates, shared platform automation | Platform interfaces | Broker/cluster operations, not commerce-domain ownership |

The contract repository and infrastructure repository are supporting platform repositories, not commerce-domain microservices. The storefront and operations UI are independently deployable applications, not backend microservices. Avoid counting them as domain services.

## 26.3 Repository topology: choose intentionally

A monorepo can still contain real microservices if each service has independent data ownership, runtime boundaries, build artifacts, deployment configuration, and contract boundaries. Conversely, multiple repositories do not automatically create good microservices.

For learning, begin with a **service-oriented monorepo** if that makes local development and coordinated changes manageable, but enforce independent service builds, Docker images, tests, environment configuration, and deployment workflows. Keep shared packages narrow: API/event schemas, test utilities, and observability helpers only. Do not create a shared package that couples all service domain models.

Once the first vertical slice is stable, practice extracting selected services into separate repositories and demonstrate independent versioning/release. If the explicit learning goal is multi-repository operations from day one, use the repository list in Section 4 and automate local development with a separate `commerce-infra` repository plus a developer bootstrap script. Record the chosen topology in an Architecture Decision Record.

## 26.4 Data and communication rules

1. Each service is the sole authority for its domain data. Cross-service foreign keys and cross-database joins are prohibited.
2. Other services obtain information through documented APIs, events, or locally maintained projections.
3. Synchronous calls are reserved for interactions that need an immediate answer. Use Kafka for durable asynchronous workflows and domain-event propagation, not as a substitute for every query.
4. Do not make a synchronous call chain across many services on a customer request. Keep the critical path short and define timeouts and fallback behavior.
5. Kafka is not a database and does not make a multi-service workflow atomic. Design for duplicate delivery, replay, lag, consumer restarts, and out-of-order events.
6. Event schemas must have an owner, compatibility policy, versioning policy, retention policy, partition key, PII review, and deprecation process.
7. Read models and search indexes are derived data. Document how to rebuild them from retained events or authoritative service APIs.
8. Database migrations must be backward-compatible during rolling deployments where old and new service versions may overlap. Prefer expand-migrate-contract.
9. Avoid a shared database, shared ORM entities, shared domain library, and distributed transaction across service databases.
10. Use API composition or a read model for cross-service views; do not let the gateway become a second business-logic monolith.

## 26.5 Production deployment and failure drills

Before calling a service independently deployable, demonstrate:

- Build and deploy one service without rebuilding or redeploying unrelated services.
- Roll back one service while maintaining compatible API/event contracts.
- Restart a service during message processing and show that no logical business effect is lost or applied twice.
- Stop Kafka temporarily and show durable events/outbox records recover when Kafka returns.
- Stop a downstream service and show timeouts, bounded retries, alerts, and graceful degradation.
- Publish an invalid event and demonstrate quarantine/DLQ, alerting, and audited replay after correction.
- Rebuild the search/read-model projection and compare it against authoritative source data.
- Apply a backward-compatible database migration with old/new application versions in mind.
- Restore a database backup in a test environment and record measured recovery evidence.
- Show per-service resource limits, health/readiness checks, graceful shutdown, secrets, identity, and logs/metrics/traces.

For production, a single-node Kafka broker in Docker Compose is only a development setup. Production broker topology, replication, authentication/authorization, TLS, disaster recovery, and operational ownership must be designed for the chosen environment. A managed Kafka service may be the better real-world choice; learning self-managed Kafka operations can be a separate exercise.

## 26.6 Additional architecture decisions to record as ADRs

Create one ADR for each decision and include context, options, decision, consequences, and revisit triggers:

- Monorepo versus multi-repository strategy.
- REST versus gRPC between services, if gRPC is considered.
- Kafka distribution, schema format/registry, compatibility mode, topic naming, partitioning, retention, and DLQ conventions.
- Service discovery, API gateway, ingress, and internal networking.
- Authentication provider, service identity, and authorization propagation.
- Database-per-service deployment strategy (separate instances versus separate databases/roles on a shared development instance).
- Saga orchestration versus choreography and compensation policy.
- Outbox relay implementation and inbox/deduplication retention.
- Search/read-model rebuild and event retention strategy.
- Deployment platform, secret manager, observability backend, SLOs, RPO/RTO, and load profile.

## 26.7 Microservices mastery roadmap

Do not try to learn every operational concern in the first commit. Demonstrate each competency in a working increment:

1. **Boundaries:** model business capabilities, ownership, dependencies, and ADRs.
2. **Independent service:** Catalog with its own persistence, API, tests, image, and deployment.
3. **Contracts:** OpenAPI/event schemas, compatibility checks, consumer-driven contract tests.
4. **Messaging:** Kafka keys, partitions, consumer groups, offsets, retries, DLQ, replay, schema evolution.
5. **Data consistency:** outbox/inbox, idempotency, projections, eventual consistency.
6. **Distributed workflow:** durable Saga, timeout, compensation, reconciliation, duplicate/out-of-order handling.
7. **Resilience:** bulkheads, timeouts, bounded retries, circuit breakers where justified, load shedding.
8. **Security:** OIDC, least privilege, service identity, Kafka ACLs, secret rotation, threat modeling.
9. **Delivery:** independent pipelines, safe migrations, progressive rollout, rollback, compatibility windows.
10. **Operations:** SLOs, tracing, alerting, incident runbooks, capacity planning, restore drills, chaos/failure testing.
11. **Architecture defense:** explain why each service exists, which boundaries could be merged, the cost of distributed complexity, and when a modular monolith would be the better choice.

The expert outcome is not “maximum number of services.” It is being able to defend boundaries and prove autonomy, reliability, and operational readiness with tests and evidence.
