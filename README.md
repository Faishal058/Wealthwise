<p align="center">
  <img src="frontend/src/assets/hero.png" alt="WealthWise Logo" width="120" />
</p>

<h1 align="center">WealthWise</h1>

<p align="center">
  <strong>Smart Mutual Fund Portfolio Management & Goal Planning Platform</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#testing">Testing</a> •
  <a href="#team">Team</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17"/>
  <img src="https://img.shields.io/badge/Spring_Boot-3.2.3-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring Boot"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19"/>
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

---

## 📋 Overview

**WealthWise** is a full-stack, analytics-first mutual fund portfolio management platform designed for Indian retail investors. It consolidates holdings across AMCs, automates FIFO-based capital gains tracking, enables goal-based financial planning with Monte Carlo simulations, and delivers quantitative risk analytics — all in a single, self-hostable web application.

> **VTU Internship 2026 — Team 8 (Java)**

### The Problem

India's mutual fund industry manages over ₹65 lakh crore in AUM, yet retail investors face:

| Challenge | Impact |
|-----------|--------|
| **Fragmented Portfolio Visibility** | Holdings spread across 5–10 AMCs with no consolidated dashboard |
| **No Cost-Basis Tracking** | Manual spreadsheets for FIFO-based capital gains computation |
| **Opaque Tax Implications** | STCG/LTCG liabilities discovered post-facto during ITR filing |
| **No Goal-to-Fund Linkage** | No free tool links specific holdings to specific financial goals |
| **SIP vs. Lumpsum Ambiguity** | No empirical evidence for strategy comparison on actual holdings |
| **Inadequate Risk Profiling** | Static risk scores that don't reflect portfolio allocation changes |

WealthWise solves all of the above with a **production-grade, data-driven platform**.

---

## ✨ Features

### 📊 Portfolio Management
- **Consolidated Dashboard** — Aggregate holdings across AMCs with live NAV pricing, gain/loss metrics, and XIRR computation (Newton-Raphson method)
- **Immutable Transaction Ledger** — Support for 11 transaction types: Purchase (SIP/Lumpsum), Redemption, Switch In/Out, STP In/Out, SWP, Dividend Payout/Reinvest, Reversal
- **CSV Bulk Import** — Parse CAS-format CSV exports with multi-format date handling and scheme-code auto-resolution
- **FIFO Lot Tracking** — Automatic lot creation on purchases and FIFO depletion on redemptions for precise cost-basis tracking

### 🎯 Goal-Based Planning
- **Financial Goals** — Define goals (Retirement, Child Education, House Purchase, Custom) with inflation-adjusted target amounts
- **Fund Linking** — Many-to-many goal ↔ fund linking with customizable allocation percentages
- **Real-Time Corpus Tracking** — Live corpus accumulation progress from linked holdings
- **Monte Carlo Simulation** — 10,000-run stochastic analysis with 10th/50th/90th percentile projections in real (today's money) terms
- **Deterministic Projections** — Sensitivity analysis across lower returns, missed SIPs, and higher inflation scenarios

### 📈 Analytics & Intelligence
- **Risk Analytics** — Sharpe ratio, portfolio volatility, max drawdown estimates, diversification scoring
- **Tax Engine** — FY-wise STCG/LTCG summaries with per-transaction gain breakdowns (STCG @20%, LTCG @12.5% above ₹1.25L)
- **Tax-Loss Harvesting** — Unrealised loss identification across active lots for tax-optimisation suggestions
- **SIP Intelligence** — Per-fund SIP vs. lumpsum performance comparison using actual lot-level data
- **Asset Allocation** — Real-time allocation breakdown by fund category with risk-weighted scoring

### 🔐 Authentication & Security
- **JWT-Based Auth** — Stateless authentication with BCrypt password hashing
- **Password Reset** — Email token-based password recovery via SMTP
- **Route Guards** — Protected dashboard routes with guest-only auth pages

### 🔔 Notifications & Settings
- **In-App Alerts** — Severity-based (Info/Watch/Action) notifications with unread count badge
- **Notification Preferences** — Configurable alerts for SIP due dates, goal milestones, missed SIPs, tax reminders
- **User Profile** — Extended KYC info including PAN, DOB, risk tolerance, nominee details

### 🔍 Fund Discovery
- **Scheme Master** — 45,000+ mutual fund schemes from AMFI registry
- **Fuzzy Search** — Trigram-based (`pg_trgm`) scheme name search for fast, typo-tolerant discovery
- **Live NAV** — Daily NAV sync from MFAPI.in with historical NAV storage for charting

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.4 | Component-based UI with concurrent features |
| Vite | 8.0.4 | Sub-second HMR, native ESM build tool |
| React Router DOM | 7.14.0 | Declarative routing with nested layouts |
| Framer Motion | 12.38.0 | Spring-physics animations & layout transitions |
| Recharts | 3.8.1 | Declarative SVG charting with responsive containers |
| Lucide React | 1.8.0 | Tree-shakeable SVG icon library |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Java | 17 (LTS) | Records, sealed classes, pattern matching |
| Spring Boot | 3.2.3 | Auto-configured embedded Tomcat, REST APIs |
| Spring Security | — | Stateless JWT filter chain, BCrypt encoding |
| Spring Data JPA / Hibernate | — | Type-safe repository pattern, auto query generation |
| PostgreSQL | 15+ | JSONB, `pg_trgm` fuzzy search, ACID compliance |
| Caffeine | — | High-performance in-memory cache for NAV/scheme lookups |
| jjwt | 0.12.5 | JWT creation and validation |
| Apache PDFBox | 3.0.1 | CAS PDF statement parsing |
| Lombok | — | Boilerplate reduction for models/DTOs |

### Testing

| Tool | Purpose |
|------|---------|
| JUnit 5 + Mockito | Backend unit & integration tests |
| H2 Database | In-memory DB for test isolation |
| Vitest + Testing Library | Frontend unit tests |
| Playwright | Cross-browser E2E tests with auto-waiting |

### DevOps

| Tool | Purpose |
|------|---------|
| Docker | Containerised backend deployment |
| Maven | Backend build & dependency management |
| npm | Frontend dependency management |

---

## 🏗️ Architecture

```
┌─────────────────┐     HTTPS/REST      ┌──────────────────┐      JDBC       ┌────────────────┐
│   Vite / React   │ ──────────────────▶ │   Spring Boot    │ ─────────────▶ │   PostgreSQL   │
│   SPA Client     │ ◀────── JSON ────── │    REST API      │ ◀───────────── │    Database     │
│   (Port 5173)    │                     │   (Port 8080)    │                │   (Port 5432)  │
└─────────────────┘                      └──────────────────┘                └────────────────┘
                                                │
                                                ▼ HTTPS
                                         ┌──────────────────┐
                                         │  AMFI / MFAPI.in │
                                         │  (External NAV)  │
                                         └──────────────────┘
```

### Backend Layered Architecture

```
Controller Layer    →  REST endpoints, request validation, response mapping
      ↓
Service Layer       →  Business logic, FIFO engine, Monte Carlo, XIRR, tax computation
      ↓
Repository Layer    →  JPA repositories, custom queries, data access
      ↓
Model Layer         →  JPA entities mapped to PostgreSQL tables
```

### Database Schema (12 Tables)

| Table | Purpose |
|-------|---------|
| `users` | Core user accounts with BCrypt password hashes |
| `user_profiles` | Extended KYC — PAN, DOB, risk tolerance, nominee |
| `scheme_master` | 45K+ AMFI-registered mutual fund schemes |
| `nav_daily` | Historical NAV data per scheme per day |
| `investment_transactions` | Immutable transaction ledger (11 types) |
| `investment_lots` | FIFO cost-basis lots per purchase transaction |
| `investment_plans` | SIP/Lumpsum plan tracking with step-up |
| `financial_goals` | User-defined financial goals with targets |
| `goal_fund_links` | Many-to-many goal ↔ fund allocation links |
| `user_alerts` | In-app notifications with severity levels |
| `notification_preferences` | Per-user alert channel configuration |
| `audit_log` | Immutable mutation trail (JSONB diffs) |

---

## 🚀 Getting Started

### Prerequisites

- **Java 17+** (Eclipse Temurin or OpenJDK recommended)
- **Maven 3.8+**
- **Node.js 18+** and **npm 9+**
- **PostgreSQL 15+**
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/Faishal058/VTU_INTERN_2026_Team8_JAVA.git
cd VTU_INTERN_2026_Team8_JAVA
```

### 2. Database Setup

Create a PostgreSQL database and run the schema migration:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE wealthwise;"

# Run schema (idempotent — safe to re-run)
psql -U postgres -d wealthwise -f backend/schema.sql
```

### 3. Backend Setup

```bash
cd backend

# Configure database connection
# Edit src/main/resources/application.properties:
#   spring.datasource.url=jdbc:postgresql://localhost:5432/wealthwise
#   spring.datasource.username=postgres
#   spring.datasource.password=your_password
#   jwt.secret=your_jwt_secret_key

# Build and run
mvn clean install -DskipTests
mvn spring-boot:run
```

The backend API will be available at `http://localhost:8080`.

### 4. Frontend Setup

```bash
cd frontend

# Copy environment config
cp .env.example .env.local

# Edit .env.local:
#   VITE_API_URL=http://localhost:8080

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 5. Docker (Backend Only)

```bash
cd backend

# Build the JAR
mvn clean package -DskipTests

# Build Docker image
docker build -t wealthwise-backend .

# Run container
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/wealthwise \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=your_password \
  wealthwise-backend
```

---

## 📁 Project Structure

```
WealthWise/
├── backend/                          # Spring Boot REST API
│   ├── src/main/java/com/wealthwise/
│   │   ├── config/                   # Security, CORS, cache configuration
│   │   ├── controller/               # REST controllers (12 controllers)
│   │   │   ├── AuthController        # Signup, login, password reset
│   │   │   ├── TransactionController # CRUD, CSV import, FIFO engine
│   │   │   ├── HoldingsController    # Portfolio aggregation, XIRR
│   │   │   ├── GoalController        # Goal CRUD, fund linking
│   │   │   ├── GoalEngineController  # Monte Carlo & projections
│   │   │   ├── TaxController         # STCG/LTCG, tax harvesting
│   │   │   ├── NavController         # NAV history & charting data
│   │   │   ├── SchemeMasterController# Fund search & sync
│   │   │   ├── AlertController       # In-app notifications
│   │   │   ├── ProfileController     # User profile management
│   │   │   ├── SettingsController    # Notification preferences
│   │   │   └── FundSearchController  # Fuzzy fund search
│   │   ├── model/                    # JPA entities (10 models)
│   │   ├── repository/               # Spring Data JPA repositories
│   │   ├── service/                  # Business logic services
│   │   │   ├── AnalyticsService      # Risk profiling, Sharpe, volatility
│   │   │   ├── GoalEngineService     # Monte Carlo simulation engine
│   │   │   ├── GoalProjectionService # Deterministic projections
│   │   │   ├── HoldingsService       # Holdings aggregation
│   │   │   ├── XirrService           # Newton-Raphson XIRR computation
│   │   │   ├── AmfiSeedService       # AMFI scheme master sync
│   │   │   ├── AuthService           # JWT auth & user management
│   │   │   ├── PasswordResetService  # Email-based password recovery
│   │   │   └── FundSearchService     # Trigram fuzzy search
│   │   ├── WealthWiseApplication.java
│   │   └── AppStartupRunner.java     # AMFI data seeding on startup
│   ├── schema.sql                    # PostgreSQL schema (v3.0)
│   ├── Dockerfile
│   └── pom.xml
│
├── frontend/                         # React SPA (Vite)
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   │   ├── DashboardShell        # Sidebar navigation layout
│   │   │   ├── AuthShell             # Auth pages layout
│   │   │   ├── GoalWizard            # Multi-step goal creation wizard
│   │   │   ├── GoalAnalysisModal     # Monte Carlo visualization
│   │   │   ├── GoalLinkModal         # Fund-to-goal linking interface
│   │   │   └── DashboardSurface      # Card container component
│   │   ├── pages/                    # Route-level page components
│   │   │   ├── LandingPage           # Public marketing page
│   │   │   ├── DashboardPage         # Main portfolio overview
│   │   │   ├── TransactionsPage      # Transaction ledger & CSV import
│   │   │   ├── PortfolioPage         # Analytics, risk, allocation charts
│   │   │   ├── InvestmentsPage       # Holdings management
│   │   │   ├── GoalsPage             # Financial goals dashboard
│   │   │   ├── LoginPage / SignupPage# Authentication pages
│   │   │   ├── ProfilePage           # User profile editor
│   │   │   ├── SettingsPage          # Notification preferences
│   │   │   └── NotificationsPage     # In-app alert feed
│   │   ├── lib/                      # Shared utilities
│   │   │   ├── api.js                # Axios HTTP client with JWT interceptor
│   │   │   ├── auth.jsx              # AuthContext & useAuth hook
│   │   │   ├── theme.jsx             # Dark/light theme provider
│   │   │   ├── mfApi.js              # MFAPI.in integration
│   │   │   └── goalHelpers.js        # Goal calculation utilities
│   │   ├── App.jsx                   # Route definitions & guards
│   │   └── index.css                 # Global design system
│   ├── e2e/                          # Playwright E2E tests
│   ├── public/                       # Static assets
│   ├── vite.config.js
│   └── package.json
│
├── docs/                             # Project documentation
│   ├── 01_Synopsis.md                # Detailed project synopsis
│   └── WealthWise_Complete_Documentation.pdf
│
└── wealthwise_transactions_template.csv  # CSV import template
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT token |
| `POST` | `/api/auth/forgot-password` | Send password reset email |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `POST` | `/api/auth/change-password` | Change password (authenticated) |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | List all user transactions |
| `POST` | `/api/transactions` | Create a new transaction |
| `POST` | `/api/transactions/import/csv` | Bulk import from CSV |
| `DELETE` | `/api/transactions/{id}` | Delete a transaction |

### Holdings & Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/holdings` | Get aggregated portfolio holdings |
| `GET` | `/api/holdings/xirr` | Compute portfolio-level XIRR |
| `GET` | `/api/holdings/analytics` | Risk profile, Sharpe ratio, allocation |
| `DELETE` | `/api/holdings/{schemeCode}/{folioNumber}` | Remove a holding |

### Financial Goals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/goals` | List all financial goals |
| `POST` | `/api/goals` | Create a new goal |
| `PUT` | `/api/goals/{id}` | Update a goal |
| `DELETE` | `/api/goals/{id}` | Delete a goal |
| `POST` | `/api/goals/{id}/links` | Link a fund to a goal |
| `DELETE` | `/api/goals/{id}/links/{linkId}` | Unlink a fund from a goal |

### Goal Analysis Engine

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/goal-engine/monte-carlo` | Run Monte Carlo simulation (10K runs) |
| `POST` | `/api/goal-engine/projection` | Deterministic future-value projection |

### Tax

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tax/summary` | FY-wise STCG/LTCG summary |
| `GET` | `/api/tax/transactions` | Taxable transaction details |
| `GET` | `/api/tax/harvest` | Tax-loss harvesting suggestions |

### Fund Search & NAV

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/schemes/search?q={query}` | Fuzzy search mutual fund schemes |
| `GET` | `/api/schemes/sync` | Trigger AMFI scheme master sync |
| `GET` | `/api/nav/{schemeCode}/history` | Historical NAV data for charting |

### User Profile & Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile` | Get user profile |
| `PUT` | `/api/profile` | Update user profile |
| `GET` | `/api/settings/notifications` | Get notification preferences |
| `PUT` | `/api/settings/notifications` | Update notification preferences |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alerts` | List user alerts |
| `PATCH` | `/api/alerts/{id}/read` | Mark alert as read |
| `DELETE` | `/api/alerts/{id}` | Delete an alert |

---

## 🧪 Testing

### Backend Tests (JUnit 5 + Mockito)

```bash
cd backend
mvn test
```

Tests run against an **H2 in-memory database** — no PostgreSQL instance required.

### Frontend Unit Tests (Vitest)

```bash
cd frontend
npm test              # Single run
npm run test:watch    # Watch mode
npm run test:ui       # Vitest UI
```

### E2E Tests (Playwright)

```bash
cd frontend
npm run test:e2e      # Headless
npm run test:e2e:ui   # Interactive UI mode
```

E2E test suites cover:
- **Authentication** — Signup, login, logout flows
- **Dashboard** — Portfolio overview rendering
- **Goals** — Goal creation, fund linking, analysis

---

## 🌐 External API Integrations

| API | Purpose | Endpoint |
|-----|---------|----------|
| **MFAPI.in** | Real-time NAV & scheme metadata | `https://api.mfapi.in/mf/{schemeCode}` |
| **AMFI India** | Daily scheme master sync (~45K funds) | `https://www.amfiindia.com/spages/NAVAll.txt` |
| **SMTP (Gmail/SendGrid)** | Transactional email for password resets | Configurable in `application.properties` |

---

## 📄 CSV Import Format

WealthWise supports bulk transaction import via CSV. Use the provided template:

```csv
date,scheme_code,fund_name,transaction_type,amount,nav,units,folio_number,note
2024-01-15,119551,Axis Bluechip Fund Direct Growth,PURCHASE_SIP,5000,52.3456,,ABC123,Monthly SIP
```

**Supported transaction types:** `PURCHASE_LUMPSUM`, `PURCHASE_SIP`, `REDEMPTION`, `SWITCH_IN`, `SWITCH_OUT`, `STP_IN`, `STP_OUT`, `SWP`, `DIVIDEND_PAYOUT`, `DIVIDEND_REINVEST`, `REVERSAL`

---

## 📜 License

This project is developed as part of the VTU Internship Program 2026.

---

<p align="center">
  Built with ☕ Java + ⚛️ React
</p>
