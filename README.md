# ShopHub

A full-stack e-commerce app with an AI-powered "Recommended for you" feed.

- **Backend** — Node.js + Express + PostgreSQL (`backend/`, port `5000`)
- **Frontend** — React + React Router (`frontend/`, port `3000`)
- **AI recommender** — Hybrid scoring (category/tag affinity, price-fit, rating prior) reranked by a local LLM via **[Ollama](https://ollama.com)**. Falls back to classical-only if no LLM is reachable.

---

## Table of contents

1. [What you need installed](#1-what-you-need-installed)
2. [Get the code](#2-get-the-code)
3. [Install dependencies](#3-install-dependencies)
4. [Set up PostgreSQL](#4-set-up-postgresql)
5. [Configure environment variables](#5-configure-environment-variables)
6. [Initialise the database](#6-initialise-the-database)
7. [Run the app](#7-run-the-app)
8. [Set up the AI recommender (optional but recommended)](#8-set-up-the-ai-recommender-optional-but-recommended)
9. [Default seed accounts](#9-default-seed-accounts)
10. [API surface](#10-api-surface)
11. [Project layout](#11-project-layout)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What you need installed

| Tool        | Version | Why                              |
| ----------- | ------- | -------------------------------- |
| Node.js     | ≥ 18    | Backend runtime, frontend build  |
| npm         | ≥ 9     | Dependency manager               |
| PostgreSQL  | ≥ 14    | Database (16 recommended)        |
| git         | any     | To clone the repo                |
| Ollama      | latest  | Optional — local LLM for the recommender |

### Install on **macOS** (Homebrew)

```bash
brew install node postgresql@16 git
brew install ollama          # optional, only for the AI recommender
brew services start postgresql@16
```

Add Postgres to your PATH (one-time, for your shell rc file):

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Install on **Ubuntu / Debian Linux**

```bash
# Node.js 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git postgresql

# Optional: Ollama for the AI recommender
curl -fsSL https://ollama.com/install.sh | sh

# Start Postgres
sudo systemctl enable --now postgresql
```

### Install on **Windows**

1. **Node.js** — install the LTS from <https://nodejs.org/>
2. **PostgreSQL** — install from <https://www.postgresql.org/download/windows/> (during install, remember the password you set for the `postgres` user; also tick "pgAdmin" if you want a GUI)
3. **git** — install from <https://git-scm.com/download/win>
4. **Ollama** (optional) — install from <https://ollama.com/download/windows>

Open **PowerShell** (or **Git Bash**) for every command below.

---

## 2. Get the code

```bash
git clone https://github.com/kushagrasrivas/E-commerce.git
cd E-commerce
```

---

## 3. Install dependencies

```bash
cd backend  && npm install
cd ../frontend && npm install
cd ..
```

---

## 4. Set up PostgreSQL

The backend defaults to user `postgres` / password `postgres` on `localhost:5432`. The fastest path is to match those defaults. If you already have a different user/password, just put your real values in `backend/.env` later.

### macOS (Homebrew)

Homebrew's Postgres uses your **macOS username** as the superuser with no password. Create a `postgres` role + database to match the defaults:

```bash
psql -d postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
psql -d postgres -c "CREATE DATABASE ecommerce_db OWNER postgres;"
```

### Linux

```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE ecommerce_db OWNER postgres;"
```

### Windows

Open **SQL Shell (psql)** from the Start menu, hit Enter through the prompts (use the password you chose during install), then run:

```sql
CREATE DATABASE ecommerce_db OWNER postgres;
\q
```

---

## 5. Configure environment variables

Create `backend/.env` (this file is git-ignored). Paste the block below and edit the `DB_*` lines if your Postgres credentials differ.

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=replace_me_with_a_long_random_string
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=replace_me_with_another_long_random_string
JWT_REFRESH_EXPIRES_IN=7d

# Razorpay test keys — use placeholders if you don't need payments
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=placeholder_secret

# Optional AI recommender knobs
# LLM_PROVIDER=ollama          # ollama | anthropic | none (default: auto-detect)
# OLLAMA_HOST=http://localhost:11434
# OLLAMA_MODEL=llama3.2:3b
# ANTHROPIC_API_KEY=

# Optional dev rate-limit knobs
# RATE_LIMIT_MAX=5000
# AUTH_RATE_LIMIT_MAX=500
# RATE_LIMIT_DISABLED=true
```

The frontend doesn't need its own `.env` — it proxies to `http://localhost:5000` by default. If you ever deploy the API elsewhere, set `REACT_APP_API_URL` in `frontend/.env`.

---

## 6. Initialise the database

Run from the repo root. Use one of the password-injection forms below for your OS.

### macOS / Linux

```bash
cd backend
export PGPASSWORD=postgres
psql -U postgres -h localhost -d ecommerce_db -f database/schema.sql
psql -U postgres -h localhost -d ecommerce_db -f database/seed.sql
psql -U postgres -h localhost -d ecommerce_db -f database/reccomendation_schema.sql
```

### Windows (PowerShell)

```powershell
cd backend
$env:PGPASSWORD = "postgres"
psql -U postgres -h localhost -d ecommerce_db -f database/schema.sql
psql -U postgres -h localhost -d ecommerce_db -f database/seed.sql
psql -U postgres -h localhost -d ecommerce_db -f database/reccomendation_schema.sql
```

This creates the schema, 10 categories, 5 sample reviews, and the recommender's event/profile tables. There are **no users and no products yet** — add them via the merchant/admin API, or use the optional bulk-seed below.

### (Optional) Bulk product + user seed for a fully populated demo

If you want the demo to look fully stocked (74 products across all categories, plus 4 ready-to-login accounts), save the SQL below as `backend/database/demo_seed.sql` and run it — *but only after* the three steps above.

> The demo seed uses pre-hashed bcrypt passwords. To regenerate them yourself:
>
> ```bash
> cd backend
> node -e "console.log(require('bcryptjs').hashSync('Your@Password', 10))"
> ```

(See the SQL file `backend/database/seed.sql` for what's included by default.)

---

## 7. Run the app

Open **two terminals**.

**Terminal 1 — backend (port 5000)**

```bash
cd backend
npm run dev          # nodemon, auto-restart on file changes
# OR
npm start            # plain node
```

You should see:

```
📦 Connected to PostgreSQL
✅ Database initialized at: …
🚀 E-Commerce API Server  Running on port 5000
```

Health check: <http://localhost:5000/api/health>

**Terminal 2 — frontend (port 3000)**

```bash
cd frontend
npm start
```

Open **<http://localhost:3000>** in your browser.

---

## 8. Set up the AI recommender (optional but recommended)

The backend works without an LLM — it falls back to classical content-based scoring. To get **AI-curated picks with natural-language reasons**, install a small open-source model locally via Ollama. No API keys, no signups, no cost, runs offline.

### macOS / Linux / Windows

```bash
# Start the Ollama service
# macOS:   brew services start ollama
# Linux:   sudo systemctl enable --now ollama   (or: ollama serve)
# Windows: Ollama auto-runs as a tray app after install

# Pull a small but capable model (~2 GB)
ollama pull llama3.2:3b
```

Restart the backend. The `/api/recommendations/for-you` endpoint will now include `meta.llm_provider: "ollama"` and the homepage will show an **`🤖 ollama · llama3.2:3b`** chip next to the "Recommended for you" heading.

**Tune the model** in `backend/.env`:

| Variable        | Examples                              |
| --------------- | ------------------------------------- |
| `OLLAMA_MODEL`  | `llama3.2:3b` *(default)*, `qwen2.5:3b`, `llama3.1:8b`, `mistral:7b` |
| `OLLAMA_HOST`   | `http://localhost:11434` *(default)*  |
| `LLM_PROVIDER`  | `ollama` *(default)* · `anthropic` · `none` |

For Anthropic Claude instead: set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=sk-ant-…`.

---

## 9. Default seed accounts

If you ran the optional bulk seed mentioned above (4 sample users), these credentials work:

| Email                  | Password       | Role     |
| ---------------------- | -------------- | -------- |
| admin@shop.local       | Admin@123      | admin    |
| merchant1@shop.local   | Merchant@123   | merchant |
| merchant2@shop.local   | Merchant@123   | merchant |
| user1@shop.local       | User@123       | user     |

Without the demo seed, register a new account via the **Sign Up** button in the navbar.

---

## 10. API surface

All endpoints live under `/api`. Auth uses JWT bearer tokens (returned by `/api/auth/login`).

| Route                                         | Auth      | What                                       |
| --------------------------------------------- | --------- | ------------------------------------------ |
| `POST /api/auth/register`                     | —         | Create account                             |
| `POST /api/auth/login`                        | —         | Login, returns access + refresh tokens     |
| `GET  /api/auth/me`                           | required  | Current user                               |
| `GET  /api/products`                          | optional  | List products (paginated, filterable)      |
| `GET  /api/products/:id`                      | optional  | Product detail                             |
| `POST /api/cart/items`                        | required  | Add to cart                                |
| `GET  /api/orders`                            | required  | Order history                              |
| `POST /api/recommendations/events`            | optional  | Log view/click/cart/wishlist/purchase      |
| `GET  /api/recommendations/preferences`       | required  | Read user's onboarding prefs               |
| `PUT  /api/recommendations/preferences`       | required  | Save favorite categories + price range     |
| `GET  /api/recommendations/for-you`           | required  | Personalised (LLM-reranked when enabled)   |
| `GET  /api/recommendations/similar/:id`       | —         | Similar products to a given product        |
| `GET  /api/recommendations/trending`          | —         | Site-wide trending products                |

---

## 11. Project layout

```
E-commerce/
├── backend/
│   ├── server.js                # Express entry
│   ├── config/db.js             # PG pool
│   ├── controllers/             # Route handlers
│   ├── middleware/              # auth, validation, rate-limit
│   ├── models/                  # DB queries
│   ├── routes/                  # Express routers
│   ├── services/
│   │   └── recommendationService.js   # AI + classical scoring
│   ├── database/
│   │   ├── schema.sql                 # Core tables
│   │   ├── seed.sql                   # Categories
│   │   └── reccomendation_schema.sql  # Recommender tables
│   └── .env                     # Local config (git-ignored)
│
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.js, App.css
        ├── api/                 # axios + recommendation client
        ├── components/
        │   ├── Layout/          # Navbar, Footer, Hero, TrustStrip, CategoryShowcase
        │   ├── Products/        # ProductList, ProductCard, ProductDetail
        │   ├── Recommendations/ # RecRow, RecommendedForYou, SimilarProducts, PreferencesModal
        │   ├── Cart/, Orders/, Dashboard/, Auth/, Common/
        ├── context/             # AuthContext, ToastContext
        ├── hooks/               # useReveal (scroll-trigger animations)
        └── pages/               # HomePage, ProductPage, CartPage, …
```

---

## 12. Troubleshooting

**`psql: command not found`** — Postgres isn't on your PATH. On macOS with Homebrew, see the export line in [§1](#install-on-macos-homebrew). On Windows, use the **SQL Shell (psql)** app from the Start menu instead.

**`Database not ready. Server starting anyway…`** — Backend started but Postgres isn't reachable. Check that the service is running (`brew services list`, `systemctl status postgresql`, or the Windows Services app) and that `DB_USER`/`DB_PASSWORD` in `backend/.env` match your actual credentials.

**`Too many requests, please try again later`** — Dev rate limit. Either restart the backend (clears the in-memory counter) or set `RATE_LIMIT_DISABLED=true` in `backend/.env`.

**Frontend shows "No products found"** — The default `seed.sql` only inserts categories. Register a merchant account and create products via the dashboard, or run the optional bulk-seed described in §6.

**Recommendations row says "Tell us what you like…" and nothing else** — Click the prompt, pick a few categories, and save. The classical recommender needs at least a preference or an event to score against.

**`Ollama unreachable at http://localhost:11434`** — Either Ollama isn't running (start the service, or `ollama serve`), or the model isn't pulled yet (`ollama pull llama3.2:3b`). Either way, the recommender silently falls back to classical scoring.

**Port `3000` or `5000` already in use** — find and free the port:

```bash
# macOS / Linux
lsof -ti:3000,5000 | xargs kill -9

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 3000,5000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

---

## License

For learning and personal use.
