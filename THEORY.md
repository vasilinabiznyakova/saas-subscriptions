# Theoretical Questions

This file contains answers to the theoretical part of the test assignment.
The answers focus on architectural decisions, data consistency, and production-ready approaches.

---

## 1. Zero-downtime migration of a legacy PostgreSQL database

### Stage 0. Preparation and safe migration planning

Before applying any changes in the production environment, a pre-migration checklist must be completed.
This stage minimizes risks and is mandatory for zero-downtime migrations.

**Data backup (disaster recovery)**  
Before the migration, a full database backup is created. The backup is a *last-resort* measure in case of a critical failure, but **it is not the primary rollback mechanism** in a zero-downtime scenario.

For PostgreSQL, `pg_dump` can be used to create a consistent snapshot.

**Testing in a staging environment**  
The staging environment must be as close to production as possible (PostgreSQL version, database schema, configuration, application code) and contain a snapshot of production data or a representative dataset.

In staging:
- all migrations and backfill processes are executed;
- the absence of long-running locks (`ALTER TABLE`, indexes) is verified;
- the impact on performance and application stability is evaluated;
- a `lock_timeout` can be configured for migrations to avoid long lock waits and to fail a deployment safely instead of causing downtime.

The following tools can be used:
- PostgreSQL views (`pg_stat_activity`, `pg_locks`, `pg_stat_statements`);
- GUI tools (pgAdmin, DataGrip, DBeaver);
- database metrics (e.g., PostgreSQL exporter + Prometheus).

**Performance monitoring**  
During the migration and after the read switch, the following are monitored:
- slow queries and latency;
- locks and the number of active transactions;
- database load;
- application errors (5xx) and API response times;
- key business metrics (payment failures, conversion rate).

In practice, this is implemented using:
- metrics (Prometheus + Grafana);
- centralized application logs (ELK stack / Winston / NestJS Logger);
- error tracking (e.g., Sentry).

---

### Stage 1. Expand (schema preparation)

At this stage, all changes required by the new architecture are introduced **without breaking** the old version of the application:

- new tables and columns are added **in parallel** to existing ones; old structures are not removed or renamed;
- changes are **backward-compatible**, allowing old and new application versions to operate simultaneously during the transition;
- blocking operations and “heavy” `ALTER TABLE` statements are avoided in production (e.g., `NOT NULL` without prepared data, type changes, `DROP` columns);
- indexes are added with minimal locking (for active tables in production, `CREATE INDEX CONCURRENTLY` where appropriate);
- creating or modifying `FOREIGN KEY` constraints is done carefully, as it may block not only the new table but also the referenced table;
- constraints (`NOT NULL`, `UNIQUE`, `FOREIGN KEY`) on new structures are enabled **gradually after backfill** to avoid long locks and failures caused by invalid historical data.

---

### Stage 2. Dual-write and backfill

During the transition phase, **dual-write** is applied to keep the old and new schemas in sync:

- new records are written simultaneously to the old and the new schemas at the application layer;
- database triggers may be used as a temporary solution, but preference is given to dual-write in application code for better transparency and control;
- dual-write allows both schemas to remain consistent until the migration is complete.

All dual-write operations must be **idempotent**, for example by:
- using stable business keys or `legacy_id` enforced with database-level `UNIQUE` constraints;
- applying idempotency keys for critical operations;
- using `UPSERT` operations (`ON CONFLICT DO NOTHING / UPDATE`);
- handling duplicate writes at the application level.

Historical data is migrated using **backfill**.  
Backfill is typically orchestrated at the application level, leveraging database mechanisms
(transactions, `UNIQUE`, `UPSERT`) to ensure consistency.

- backfill is executed in **batches** with a controlled rate to avoid overloading the database;
- the process is idempotent and can be safely restarted;
- backfill progress is tracked (cursor, timestamp, offset, or a dedicated status field);
- data consistency between the old and new schemas is maintained during backfill.

---

### Stage 3. Read switch

After dual-write has stabilized and the main backfill is completed, a **gradual read switch**
from the old schema to the new one is performed:

- reads are switched incrementally using **feature flags** or configuration;
- initially, **low-risk** parts of the system or a limited portion of traffic
  (e.g., 5–10% of users) are migrated, followed by critical user flows and full traffic;
- during the transition, **shadow reads** may be used to detect and resolve discrepancies
  between the old and new schemas without affecting users;
- stability is monitored through error rates, latency, and business metrics.

The read switch provides a **fast rollback** mechanism:
- in case of issues, reads can be immediately reverted to the old schema without data loss;
- dual-write keeps both schemas up to date until full stabilization.

---

### Stage 4. Contract (migration completion)

After the system has been running stably on the new schema, the **contract stage** completes the migration:

- dual-write is disabled only after the read switch is fully completed and stability is confirmed;
- legacy code that depends on the old schema is removed or disabled;
- old tables and columns are marked as deprecated and removed **gradually**
  after an agreed stabilization period;
- constraints and indexes on the new schema are finally enabled or strengthened
  if some of them were deferred until after backfill;
- a final validation (consistency checks and monitoring) is performed before
  fully removing legacy structures.

---
## 2. Concurrent purchase of the last item in stock

### Potential problems

- **Overselling:** both users successfully place an order even though only one item is available.
- **Race conditions:** availability check and stock deduction are performed non-atomically.
- **Double or stuck payments:** both users may complete payment, after which one requires a refund.
- **Inconsistent UI:** due to caching, replicas, or update delays, users see outdated stock information.
- **Lock contention / deadlocks:** an incorrect locking strategy leads to performance degradation.
- **Repeated requests:** retries or repeated clicks without idempotency create duplicate orders or reservations.

---

### Architectural approaches

#### Approach 1. Pessimistic locking in the database

**Idea:** availability check and stock deduction are performed within a single transaction with row-level locking.

- use `SELECT ... FOR UPDATE` on the product or inventory row;
- verify that `stock > 0`;
- decrement stock with `stock = stock - 1`;
- commit the transaction and create the order.

**Pros:**
- simple implementation;
- strong consistency (ACID).

**Cons:**
- does not scale well for “hot” products;
- increased latency due to lock queues.

---

#### Approach 2. Optimistic concurrency (CAS / conditional update)

**Idea:** stock deduction is performed as an atomic conditional operation without pre-locking.

- `UPDATE products SET stock = stock - 1 WHERE id = :id AND stock > 0`;
- if `rows_affected = 1` — the item is successfully reserved or deducted;
- if `0` — the item is no longer available.

**Pros:**
- minimal locking;
- performs well under high contention.

**Cons:**
- harder to handle edge cases;
- requires strict idempotency and compensation logic.

---

#### Approach 3. Reservations with TTL + asynchronous processing

**Idea:** separate product reservation from the payment process.

- when the user clicks “Pay”, a **reservation** with a TTL (e.g., 10 minutes) is created;
- the item is moved from `available` to `reserved`;
- after successful payment, the reservation is confirmed;
- if payment is not completed before the TTL expires, the reservation is automatically released;
- under high load, operations can be processed via a queue.

To handle high contention for a single product, a queue with guaranteed processing order (**FIFO**) can be used:

- reservation events for a given product are processed sequentially in arrival order;
- this eliminates race conditions between parallel requests;
- the first request in the queue gets the reservation, subsequent ones receive a proper rejection or wait.

**Pros:**
- no overselling;
- better UX and fewer refund scenarios;
- good scalability.

**Cons:**
- more complex architecture;
- eventual consistency between components.

---

#### Saga and compensating actions

For multi-step flows (reserve → pay → confirm), the **Saga pattern** can be applied:

- each step has a compensating action;
- on failure or timeout, a compensation is executed (e.g., `releaseReservation`);
- consistency is achieved without using distributed transactions.

---

### Additional notes

- all order creation, reservation, and payment handling operations must be **idempotent**;
- the UI should display not the physical stock count, but the actual availability for ordering,
  taking active reservations into account, to avoid overselling and failed payments.
---
## 3. Bug in the discount calculator and order recalculation

### Technical approach to identify affected orders

1. Identify the exact time window when the bug was active and the specific calculator logic/version that caused it.
2. Recalculate the **expected order total** for all orders within this window using the fixed pricing logic.
3. Store recalculation results in a dedicated technical table (e.g. `order_adjustments`) with fields such as:
   - `order_id`, `customer_id`, `charged_amount`, `expected_amount`, `delta`, `status`.
4. Classify orders:
   - `delta < 0` — customer **overpaid**;
   - `delta > 0` — customer **underpaid**.
5. Run aggregate checks (order counts, total delta) and selective validation of edge cases.

All recalculation operations are **idempotent** and safe to rerun.

To automate further processing, the `order_adjustments` table also stores technical and contact data required for payments and communication:

- `customer_email` — for customer communication;
- `payment_provider` and `payment_reference_id` (payment intent / charge ID) —
  to perform refunds or additional charges via the payment provider;
- `payment_method_status` — to determine whether an automatic charge is possible.

Additional charges are executed **via the payment provider**, using stored reference IDs and
tokenized payment methods (when a valid mandate exists), not by handling raw card data.

---

### Automating refunds / charges with expired cards in mind

The process is designed with business priorities in mind and aims to minimize negative customer impact.

#### Orders with underpayment (~4,000)

- **If the payment method is valid**:
  - automatically charge the difference (off-session charge, if supported by the provider);
  - notify the customer with an explanation and an apology;
  - offer compensation (e.g. a 5% promo code for future purchases above a certain amount).
- **If the card is expired or automatic charging is not possible**:
  - send an email explaining the issue and requesting updated payment details;
  - send a limited number of follow-up reminders;
  - escalate to customer support for manual contact if needed;
  - stop further attempts after a defined limit to avoid disproportionate operational costs.

#### Orders with overpayment (~8,000)

- Refunds are **not issued automatically**.
- Customers receive a message offering a choice:
  - receive a refund;
  - receive store credit (wallet balance) for future purchases;
  - take no action.
- If the customer does not respond, no further action is taken.
- The selected option is processed in an automated and idempotent manner.

This approach reduces churn and limits unnecessary cash outflow.

---

### Customer communication

- Transparent and proactive communication:
  - clear explanation of the technical issue;
  - explicit description of the impact on the specific order;
  - apology for the inconvenience.
- Messages are personalized based on the scenario (overpayment / underpayment).
- The tone is customer-centric and avoids shifting responsibility.
- Customer support is involved for complex or disputed cases.

---

### Preventing similar incidents in the future

- Versioning and isolation of discount calculation logic.
- Unit and integration tests for key pricing scenarios
  (promo codes, annual plans, combined discounts).
- Periodic shadow recalculation in production with result comparison.
- Alerts for abnormal deviations in average order value or discount amounts.
- Audit logging of pricing rule changes.
- Use of feature flags for safe rollouts:
  new pricing rules are enabled gradually (e.g. for a subset of orders or users),
  with the ability to instantly disable them if anomalies are detected,
  without redeploying the application and with minimal customer impact.
---

## 4. Architecture of a multi-tenant SaaS e-commerce platform

### Single database vs database-per-tenant

**Baseline approach: shared PostgreSQL database + `merchant_id`**
- All tables include a `merchant_id` (tenant identifier).
- Simpler operations: migrations, backups, monitoring, analytics.
- Scales via proper indexing, partitioning, read replicas, and caching.

**Hybrid model for large merchants**
- By default, merchants use the shared database.
- Large or enterprise merchants can be moved to a **database-per-tenant** setup or a dedicated cluster.
- This isolates load and allows scaling one merchant without impacting others.

---

### Data isolation between merchants

**Database level**
- Every record includes `merchant_id`.
- Composite indexes (e.g. `(merchant_id, created_at)`, `(merchant_id, sku)`).
- Tenant-aware uniqueness constraints (e.g. `UNIQUE(merchant_id, external_id)`).

**Row-Level Security (RLS) as an additional safety layer**
- PostgreSQL RLS policies restrict row access by `merchant_id`.
- Tenant context is set per connection (e.g. `SET app.merchant_id = ...`).
- Even in case of application-level bugs, cross-tenant data access is prevented.

**Application level**
- Tenant resolution via subdomain, headers, or JWT claims.
- Tenant-aware repositories / ORM scopes.
- Logs and audit records always include `merchant_id`.

---

### Customization without code forks

**1) Configuration-based customization (primary approach)**
- Discount rules, taxes, shipping logic stored as data (tables/configs).
- Calculators use interfaces; implementation is selected by `merchant_id`.

**2) Rules engine / DSL**
- Discounts are described as rules (JSON / DSL), not hardcoded logic.
- Allows changing formulas without redeployments or forks.

**3) Event-driven integrations**
- Event model (e.g. OrderCreated, PaymentSucceeded, RefundIssued).
- Webhooks or adapters per merchant.
- Complex integrations implemented as separate integration apps.

**4) Plugin interfaces for enterprise cases**
- Explicit extension points (`DiscountProvider`, `TaxProvider`, `FulfillmentProvider`).
- Plugins are selected via configuration, not code branches.
- Versioned contracts instead of repository forks.

---

### Boundary between shared and isolated components

**Shared components**
- Core domains: catalog, orders, payments, users, base pricing engine.
- Authentication, API gateway, rate limiting.
- Shared infrastructure: cache, queues, observability.

**Isolated components (when required)**
- Separate databases or schemas for large merchants.
- Dedicated workers and queues.
- Tenant-specific quotas and limits.
- Isolated integrations if they generate significant load.

---

### Scaling when a merchant grows 100x

**Database layer**
- Migrate the merchant to database-per-tenant or a dedicated cluster.
- Partition large tables (orders) by `merchant_id` or time.
- Read replicas and separate connection pools.
- Cache hot reads; use CDN for media assets.

**Application layer**
- Tenant-based rate limits and quotas.
- Dedicated queues and workers.
- Backpressure, retry policies, and circuit breakers for integrations.

**Architecture evolution**
- Modular monolith as a starting point.
- Extract hot domains (Orders / Payments) only when needed.
- Avoid premature microservice decomposition.
- Offer dedicated environments as an enterprise tier.

---

### Analytics and reporting (OLAP) separated from OLTP

The OLTP database is **not used directly for analytics** to avoid performance impact on production workloads.

- Data is exported to an analytical layer (Data Warehouse / columnar storage)
  via ETL/ELT pipelines or an event-driven approach.
- Reporting and analytics run outside the core transactional system.

For fast, merchant-oriented analytics, a **Kimball (bottom-up) approach** is suitable:
- Analytics organized into Data Marts (sales, revenue, refunds, conversion).
- Each Data Mart optimized for specific business queries.
- Scales well with the growth of merchants and data volume.

More centralized or complex models (Inmon / Data Vault) can be considered later
if strong historical tracking or cross-domain analytics become necessary.

---

### Summary

- Core system: **shared PostgreSQL + `merchant_id`** with optional hybrid isolation.
- Data isolation: application-level enforcement combined with RLS.
- Customization: configuration, rules engine, events, and plugin interfaces without forks.
- Scalability: isolate heavy merchants at the database, worker, and quota levels.
- Analytics: separate OLAP layer using a Kimball-style approach for fast business reporting.

