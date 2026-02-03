# Backend Developer Assignment

---

## 🇺🇦 Опис завдання (Original)

### Контекст

Ви розробляєте backend для SaaS платформи, яка продає підписки на програмне забезпечення.  
Система має підтримувати автентифікацію користувачів, різні моделі тарифікації та базову систему знижок.

### Технічні вимоги

- NestJS
- PostgreSQL
- ORM (Prisma / TypeORM)
- REST Architecture

### Бізнес-вимоги

| План | Base Price | Price per Seat | Включено API calls |
| --- | --- | --- | --- |
| Starter | $29.99/міс | — | 1,000 |
| Professional | $99.49/міс | $15.75/user | 10,000 |
| Enterprise | $299.90/міс | $12.30/user | 100,000 |

### Система знижок

| Тип знижки | Умова | Розмір |
| --- | --- | --- |
| Промокод | Валідний код | Фіксована сума або % |
| Річна підписка | billingPeriod = annual | 17% |

### Платіжні провайдери

Для підвищення конверсії та зручності користувачів система має автоматично підключати регіональний платіжний провайдер, на основі `region`, який був обраний при реєстрації.

| Регіон | Provider |
| --- | --- |
| `UA` | Monobank |
| `BR` | PIX |
| All other regions | Stripe |

⚠️ Імплементувати повну інтеграцію із сервісами не потрібно, достатньо моку сервіс-провайдера.

### User Flow

Register → Login → Calculate Price → Subscribe

### Основні точки оцінювання

- Архітектура та структура проекту
- Коректність бізнес-логіки
- Надійність
- Якість API
- Робота з базою даних

### Очікуваний результат

На виході очікується monolith mini-app на **NestJS**, який реалізує:

- Реєстрацію та авторизацію користувачів зі збереженням у БД
- Контроль доступу та авторизацію
- Mock-сервіси для різних платіжних провайдерів
- Калькулятор ціни з системою знижок (промокоди + річна знижка)
- Оформлення підписки через mock-провайдер оплати з збереженням даних
- CRUD для отримання даних
- **Seed script** з тестовими планами та промокодами
- **Swagger UI** на `/api/docs` (optional)
- Docker (optional)

---
## Теоретичне завдання
### 1. Міграція legacy PostgreSQL системи

У вас є legacy система з PostgreSQL базою даних. Бізнес вирішив перейти на нову архітектуру з оновленою схемою даних.

**Вимоги:**
- Zero downtime — система має працювати безперервно
- Можливість rollback — повернення до попереднього стану
- Консистентність даних — жодних втрачених або дубльованих даних

**Опишіть:**
- стратегію міграції,
- як забезпечите консистентність даних,
- як будете валідувати результат,
- які rollback механізми передбачите.

---

### 2. Конкурентна покупка товару з обмеженою кількістю

На сайті існують товари з обмеженою кількістю. Два користувачі одночасно намагаються купити останній товар на складі. Обидва бачать «1 шт. в наявності» і натискають «Оплатити».

**Опишіть:**
- які проблеми можуть виникнути,
- як би ви архітектурно вирішили цю задачу (мінімум 2 підходи).

---

### 3. Баг у калькуляторі знижок

Виявили баг у калькуляторі знижок, який існував 3 тижні. За цей час 12,000 замовлень отримали неправильну знижку:
- ~8,000 переплатили (в середньому $5),
- ~4,000 недоплатили (в середньому $8).

**Опишіть:**
- технічний підхід до виявлення affected замовлень,
- як автоматизувати refunds/charges з урахуванням того, що частина карток вже expired,
- як комунікувати з клієнтами,
- як запобігти подібному в майбутньому.

---

### 4. Multi-tenant SaaS e-commerce платформа

Ви будуєте e-commerce платформу як SaaS. Кожен клієнт (merchant) має свій магазин.  
Очікується:
- ~500 merchants,
- ~10,000 товарів у кожного,
- ~1,000 замовлень на день на merchant.

Деякі merchants хочуть кастомну бізнес-логіку (свої формули знижок, інтеграції).

**Опишіть архітектуру:**
- одна БД чи database-per-tenant,
- як ізолювати дані між merchants,
- як реалізувати кастомізацію без форків коду,
- де межа між shared і isolated компонентами,
- як масштабувати, коли один merchant виросте в 100x.

---



## 🇬🇧 Assignment Description (English)

### Context

You are building a backend for a SaaS platform that sells software subscriptions.  
The system must support user authentication, multiple pricing models, and a basic discount system.

### Technical Requirements

- NestJS
- PostgreSQL
- ORM (Prisma / TypeORM)
- REST architecture

### Business Requirements

| Plan | Base Price | Price per Seat | Included API calls |
| --- | --- | --- | --- |
| Starter | $29.99/month | — | 1,000 |
| Professional | $99.49/month | $15.75/user | 10,000 |
| Enterprise | $299.90/month | $12.30/user | 100,000 |

### Discount System

| Discount Type | Condition | Value |
| --- | --- | --- |
| Promo code | Valid code | Fixed amount or percentage |
| Annual subscription | billingPeriod = annual | 17% |

### Payment Providers

To improve conversion and user experience, the system should automatically select a regional payment provider based on the `region` chosen during registration.

| Region | Provider |
| --- | --- |
| `UA` | Monobank |
| `BR` | PIX |
| All other regions | Stripe |

⚠️ Full integration with payment services is not required.  
Using mock service providers is sufficient.

### User Flow

Register → Login → Calculate Price → Subscribe

### Evaluation Criteria

- Architecture and project structure
- Correctness of business logic
- Reliability
- API quality
- Database design

### Expected Outcome

The expected result is a monolithic mini-app built with **NestJS** that implements:

- User registration and authentication with database persistence
- Access control and authorization
- Mock services for different payment providers
- Pricing calculator with a discount system (promo codes + annual discount)
- Subscription creation via a mock payment provider with data persistence
- Read-only CRUD endpoints
- **Seed script** with test plans and promo codes
- **Swagger UI** available at `/api/docs` (optional)
- Docker support (optional)


---

## Theoretical Assignment

### 1. Legacy PostgreSQL Migration

You have a legacy system with a PostgreSQL database. The business has decided to migrate to a new architecture with an updated data schema.

**Requirements:**
- Zero downtime — the system must remain fully operational
- Rollback capability — ability to return to the previous state
- Data consistency — no lost or duplicated data

**Describe:**
- the migration strategy,
- how data consistency is ensured,
- how the result is validated,
- which rollback mechanisms are planned.

---

### 2. Concurrent Purchase of Limited Inventory

The system has products with limited stock. Two users simultaneously attempt to purchase the last available item. Both see “1 item in stock” and click “Pay”.

**Describe:**
- what problems may occur,
- how you would solve this architecturally (at least two approaches).

---

### 3. Discount Calculator Bug

A bug in the discount calculator existed for 3 weeks. During this time, 12,000 orders received incorrect discounts:
- ~8,000 customers overpaid (average $5),
- ~4,000 customers underpaid (average $8).

**Describe:**
- the technical approach to identifying affected orders,
- how to automate refunds/charges considering that some cards have expired,
- how to communicate with customers,
- how to prevent similar issues in the future.

---

### 4. Multi-tenant SaaS E-commerce Platform

You are building an e-commerce platform as a SaaS. Each client (merchant) has their own store.  
Expected scale:
- ~500 merchants,
- ~10,000 products per merchant,
- ~1,000 orders per merchant per day.

Some merchants require custom business logic (custom discount formulas, integrations).

**Describe the architecture:**
- single database vs database-per-tenant,
- data isolation between merchants,
- how to implement customization without code forks,
- boundaries between shared and isolated components,
- how to scale when one merchant grows 100x.

---