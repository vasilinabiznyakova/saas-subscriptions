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
