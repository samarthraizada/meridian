# Meridian
### Agentic Analytics Engine — AI-powered executive briefings grounded in a governed semantic layer

**Live demo:** [meridian-jade-rho.vercel.app](https://meridian-jade-rho.vercel.app)

---

## What it does

Meridian is an AI agent that answers business questions by querying a governed semantic layer and returning structured executive briefings — no templates, no hardcoded data, no human prompt required.

Ask it a question like *"What's driving revenue trends this month and which channel is most efficient?"* and it:

1. Decides autonomously which certified metrics to query and at what grain
2. Fires multiple MetricFlow queries against the semantic layer
3. Reasons across the result sets
4. Returns a grounded executive briefing: Executive Summary, Anomaly Flag, and Watch Item

Every number in the output is traceable to a certified metric definition in a version-controlled YAML file. The agent never touches raw tables.

---

## The problem this solves

At Enterprise-scale BI operations, the bottleneck is not data access — it's the analyst layer between data and decision. Hundreds of operational metrics, weekly reporting cycles, and ad hoc leadership requests create a constant queue. An LLM agent that writes raw SQL against undecorated tables doesn't solve this: it hallucinates joins, guesses business logic, and produces wrong numbers with high confidence.

The fix is the same one BI already solved for humans: a semantic layer with certified metric definitions. Point the agent at that instead of raw tables. The agent's job shifts from inventing queries to selecting and composing from a trusted vocabulary.

Meridian is a working implementation of that architecture.

---

## Architecture

```
React Frontend (Vercel)
    │
    │  natural language question
    ▼
FastAPI Backend (Railway)
    │
    │  tool call: query_metrics(metrics, group_by)
    ▼
Claude Agent (claude-sonnet-4-6)
    │
    │  mf query --metrics gross_revenue --group-by metric_time__week
    ▼
MetricFlow CLI
    │
    │  compiles metric definitions → SQL
    ▼
dbt Semantic Layer (MetricFlow + YAML metric definitions)
    │
    │  certified SQL against fct_orders
    ▼
PostgreSQL on Supabase (seeds → staging models → mart)
```

### Why this architecture matters

- **The agent never writes SQL.** It calls `query_metrics` with metric names and dimensions. MetricFlow translates those into correct SQL using certified definitions.
- **Metric definitions are version-controlled.** `gross_revenue`, `promo_attach_rate`, and four other metrics are defined once in `fct_orders.yml` — reviewed, diffable, auditable.
- **The semantic layer enforces grain and joins.** No guessing which tables to join or which date column to filter on. The definition specifies it.
- **Grounding is traceable.** Every number in the briefing links back to a metric YAML and a dbt model.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Server-Sent Events |
| AI Agent | Anthropic Claude API (`claude-sonnet-4-6`), tool use |
| Semantic Layer | dbt Core 1.12, MetricFlow, YAML metric definitions |
| Warehouse | PostgreSQL (Supabase) |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Semantic layer — certified metrics

Defined in `meridian_dbt/models/marts/fct_orders.yml`:

| Metric | Type | Definition |
|---|---|---|
| `gross_revenue` | simple | Sum of order revenue before discounts |
| `order_volume` | simple | Count of completed orders |
| `promo_order_count` | simple | Count of orders with promo code applied |
| `promo_attach_rate` | ratio | promo_order_count ÷ order_volume |
| `total_discount_amount` | simple | Sum of discounts applied |
| `total_acquisition_cost` | simple | Sum of customer acquisition costs |

Available dimensions: `metric_time__week`, `metric_time__day`, `order__channel`, `order__acquisition_channel`, `order__region`, `order__is_new_customer`

---

## Data model

Fictional dataset: **Meridian Retail Co.** — a mid-market home goods e-commerce company.

```
seeds/
  orders.csv       → 60 orders, June 2026
  customers.csv    → 56 customers with acquisition data
  inventory.csv    → 10 SKUs with stock levels

models/
  staging/
    stg_orders.sql
    stg_customers.sql
  marts/
    fct_orders.sql          ← MetricFlow semantic model sits here
    fct_orders.yml          ← metric definitions
    metricflow_time_spine.sql
```

---

## Running locally

**Prerequisites:** Python 3.12, Node 20, PostgreSQL

```bash
# Clone
git clone https://github.com/samarthraizada/meridian.git
cd meridian

# Python environment
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r backend/requirements.txt

# dbt setup
cd meridian_dbt
# Edit profiles.yml with your Postgres credentials
dbt seed
dbt run
dbt parse

# Backend
cd ../backend
export ANTHROPIC_API_KEY=your_key
uvicorn main:app --reload --port 8000

# Frontend
cd ../frontend
npm install
npm run dev
```

---

## Roadmap (v3 and beyond)

The MVP demonstrates the core architecture. The full product vision:

- **Multi-project workspace** — upload your own datasets, define your own metrics, generate briefings against your data
- **Dataset import** — CSV/Excel drag-and-drop, Python dataframe write, SQL create query
- **Metric definition UI** — define and edit MetricFlow metrics through a visual interface, no YAML required
- **Scheduled briefings** — agent runs on a cron schedule and pushes briefings to Slack or email
- **Briefing export** — PDF and Word export with embedded charts
- **Authentication** — multi-user, project-level access control
- **MCP interface** — expose the semantic layer via MCP so any Claude-based agent can query certified metrics directly

---

## About

Built by **Samarth Raizada** — Senior BI Engineer with 7+ years of experience building operational analytics systems at FAANG scale.

This project demonstrates: LLM agent integration in a practical analytics context, semantic layer architecture, dbt + MetricFlow implementation, and full-stack build capability (React + FastAPI + Python agent).

[github.com/samarthraizada](https://github.com/samarthraizada) · [LinkedIn](https://linkedin.com/in/samarthraizada)
