# Mini SaaS Subscriptions API

Production-oriented backend MVP for a SaaS subscription platform.

This project was implemented as a test assignment for a **Backend Developer (Node.js)** position  
and is focused on demonstrating correct business logic, clean architecture,
and a reliable API without unnecessary overengineering.

📄 **Original assignment description:**  
👉 [ASSIGNMENT.md](./ASSIGNMENT.md)

---

## Technology Stack

- **Node.js / TypeScript**
- **NestJS**
- **PostgreSQL**
- **Prisma ORM (v7, config-first)**
- **JWT authentication**
- **Docker (Postgres)**
- **Swagger UI**
- **Jest (unit tests for pricing logic only)**

---

## Overview

The API implements a typical SaaS subscription flow:

1. User registration and authentication
2. Subscription price calculation
3. Subscription creation with payment initialization
4. Protection against duplicate requests via idempotency
5. Access to user-owned subscriptions

Payment confirmation via webhooks is intentionally not implemented,
as it is outside the scope of the assignment.
However, the data model and flow are designed to support such extensions
in a real production system.

---

## User Flow

```

Register → Login → Calculate Price → Create Subscription

```

---

## Architecture Decisions

- The project is implemented as a **monolithic MVP**, as the scope and requirements do not justify a microservice architecture.
- Full Domain-Driven Design (DDD) was intentionally not applied to keep the codebase simple and readable.
- Business logic is encapsulated in services, while controllers are responsible only for the HTTP layer.
- Infrastructure concerns (Prisma, payment providers) are isolated from domain logic.
- Payment providers are implemented as mock services, since real integrations were not required.
- Monetary calculations use `Prisma.Decimal`, with rounding applied only to final monetary values.
- Payment initialization is executed **outside of database transactions** to avoid holding DB locks during network I/O and to reduce the risk of timeouts or deadlocks.
- **UUIDs** are used as primary keys to prevent identifier enumeration in public APIs and to better support scalability.
- Enums are used for small, stable sets of values (billing periods, statuses, etc.) to improve type safety and query simplicity.
- The seed script is idempotent and works directly with Prisma, as it initializes static reference data.
- Unit tests are implemented only for `PricingService`, as it represents the most critical and deterministic business logic.
- Swagger is used for API documentation and contract verification.

---

## Pricing & Discounts

- All monetary calculations are performed using `Prisma.Decimal`
- Rounding is applied only to final monetary values (ROUND_HALF_UP)
- Annual subscriptions have a fixed **17%** discount
- Promo codes apply **only to monthly subscriptions**
- Annual discounts and promo codes **cannot be combined**
- When a discount is not applied, the API response includes an explanatory note

---

## Idempotency

Subscription creation is protected by the `Idempotency-Key` header.

### Idempotency details (POST /subscriptions)

- The client sends an `Idempotency-Key` header to safely retry requests (timeouts, retries, double-clicks).
- The key is stored in the `payment` table and enforced by a unique constraint.
- If a request with the same key is received again, the API returns the previously created result without creating new records.
- Concurrent requests with the same key are handled in a race-safe manner using database constraints: one request succeeds, the other performs a replay.
- The response includes an `idempotentReplay: true` flag so the client can distinguish replayed responses.

---

## Authentication & Access Control

- Minimal JWT-based authentication (access token only)
- All subscription endpoints are protected by a JWT guard
- Users can access only their own resources
- Refresh tokens are intentionally not implemented (MVP scope)

---

## Database & Seed

- All primary keys use **UUIDs**. This is a deliberate choice for public APIs to prevent ID enumeration and to better suit SaaS systems and potential horizontal scaling.
- Enum types are stored as PostgreSQL ENUMs
- The seed script initializes:
  - subscription plans
  - promo codes
  - test users
- The seed process is idempotent and safe to run multiple times

---

## API Documentation

Swagger UI is available at:

```

/api/docs

````

Swagger is publicly accessible for convenience,
but all protected endpoints still require JWT authentication.

---

## Running the Project

### Requirements
- Node.js 18+
- Docker & Docker Compose

### Setup

```bash
npm install
npm run dev:setup
npm run start:dev
````

The `dev:setup` command:

* starts PostgreSQL
* applies database migrations
* generates the Prisma client
* runs the seed script

### Docker

Docker is used to run infrastructure dependencies (PostgreSQL) in the local development environment.
This ensures a smooth and reproducible setup without requiring a local database installation.

A Dockerfile for API deployment was intentionally not included, as it was not required by the assignment
and would depend on specific production deployment requirements.


---

## Testing

Unit tests are implemented only for the pricing logic,
as it is the most critical and deterministic part of the system.

```bash
npm run test
```

---

## Quick Manual Check (Swagger / Postman)

1. `POST /api/auth/register` — register a user
2. `POST /api/auth/login` — obtain an access token
3. In Swagger, click **Authorize** and paste the token
4. `POST /api/pricing/calculate` — test pricing (monthly / annual / promo)
5. `POST /api/subscriptions` with the `Idempotency-Key` header
6. Repeat the same request with the same `Idempotency-Key` — verify that records are not duplicated and `idempotentReplay=true`
7. `GET /api/subscriptions` and `GET /api/subscriptions/:id`

---

## Additional Notes

* Payment providers are implemented as mock services
* Subscription activation is expected to be handled asynchronously (as in real production systems)
* The project is focused on correctness, clarity, and realistic backend design