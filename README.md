<div align="center">

```
██████╗ ██████╗  ██████╗      ██╗███████╗ ██████╗████████╗    ███████╗ ██████╗██╗  ██╗ ██████╗ 
██╔══██╗██╔══██╗██╔═══██╗     ██║██╔════╝██╔════╝╚══██╔══╝    ██╔════╝██╔════╝██║  ██║██╔═══██╗
██████╔╝██████╔╝██║   ██║     ██║█████╗  ██║        ██║       █████╗  ██║     ███████║██║   ██║
██╔═══╝ ██╔══██╗██║   ██║██   ██║██╔══╝  ██║        ██║       ██╔══╝  ██║     ██╔══██║██║   ██║
██║     ██║  ██║╚██████╔╝╚█████╔╝███████╗╚██████╗   ██║       ███████╗╚██████╗██║  ██║╚██████╔╝
╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚════╝ ╚══════╝ ╚═════╝   ╚═╝       ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ 
```

**VOA V2 — Decentralized Anonymous Operations Triage System**

[![Status](https://img.shields.io/badge/status-ACTIVE-00ff41?style=flat-square&labelColor=0a0a0f)](.)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20SQLite-00d4ff?style=flat-square&labelColor=0a0a0f)](.)
[![AI](https://img.shields.io/badge/AI-Gemini%203.1%20Flash%20Lite-ff3366?style=flat-square&labelColor=0a0a0f)](.)
[![License](https://img.shields.io/badge/license-MIT-ffb800?style=flat-square&labelColor=0a0a0f)](.)

</div>

---

## `> SYSTEM.OVERVIEW`

**Project Echo** is a fully anonymous, two-way school operations triage system built to replace the friction-heavy VOA (Voice of Advocates) Google Form pipeline. It gives students a safe, identity-blind channel to report issues — and gives EXCO and School Leaders a powerful command center to triage, track, and resolve them in real time.

> Zero identity tracking. Maximum operational clarity.

---

## `> ARCHITECTURE`

```
┌─────────────────────────────────────────────────────────────┐
│                     STUDENT PORTAL                          │
│  [Anonymous Submit] → [Category] → [Issue] → [Solution?]   │
└──────────────────────────┬──────────────────────────────────┘
                           │  POST /api/echo/submit
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                        │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────┐               │
│  │ Gemini 3.1 Flash│    │  Cluster Engine  │               │
│  │   Classifier    │    │  (Trend Detect)  │               │
│  └────────┬────────┘    └──────────────────┘               │
│           │                                                 │
│    T1 Infrastructure → Auto-escalate to SL                 │
│    T2 Strategic      → EXCO queue                          │
│    T3 Noise          → Auto-archive                        │
│                                                             │
│  ┌──────────────────────────────────────────┐              │
│  │         SQLite Database (echo.db)        │              │
│  │  submissions │ replies │ global_updates  │              │
│  └──────────────────────────────────────────┘              │
└──────────────┬────────────────────────┬────────────────────┘
               │                        │
               ▼                        ▼
┌──────────────────────┐   ┌────────────────────────────────┐
│   EXCO CONTROL ROOM  │   │   SCHOOL LEADER DASHBOARD      │
│  /admin (EXCO mode)  │   │   /admin (SL mode)             │
│                      │   │                                │
│  • All feedback list │   │  • Escalated tickets only      │
│  • Status control    │   │  • Status control (SL)         │
│  • AI analysis       │   │  • Global broadcast            │
│  • Escalate to SL    │   │  • History reports             │
│  • History + Charts  │   │                                │
└──────────────────────┘   └────────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│      STUDENT TICKET TRACKER  │
│   /track — PIN-gated access  │
│   Multi-ticket history       │
│   2-way EXCO communication   │
└──────────────────────────────┘
```

---

## `> FEATURE MAP`

### 🟢 Student Portal (`/`)
| Feature | Description |
|---------|-------------|
| **Anonymous Submit** | Zero identity tracking — no name, class, or IP collected |
| **Category Selector** | Facilities / Culture / Academics / Safety |
| **Proposed Solution** | Optional field: "How would you solve this?" |
| **Instant Ticket** | Returns a unique Ticket ID + 6-digit PIN |
| **Global Updates** | Live ops announcements from EXCO/SL displayed on homepage |
| **Identity Reassurance** | Clear messaging that identity is unknown and untraceable |

### 🔴 EXCO Control Room (`/admin` → EXCO)
| Feature | Description |
|---------|-------------|
| **Master-Detail Layout** | Compact list + wide detail panel |
| **AI Triage Display** | Gemini-generated reasoning for every ticket |
| **Status Control** | Pending → Investigating → Resolved → Closed → Archived |
| **Escalate to SL** | One-click escalation for critical tickets |
| **Communication Thread** | Reply to students anonymously via ticket |
| **Cluster Alerts** | Detects recurring issues (e.g., "fan broken" × 10) |
| **Global Broadcast** | Post school-wide updates to the Status Board |
| **Export Report** | Download full report as `.md` |

### 🔵 School Leader Dashboard (`/admin` → SL)
| Feature | Description |
|---------|-------------|
| **Escalated Tickets Only** | Only sees T1 Infrastructure + manually escalated |
| **Status Control** | Full status management |
| **2-way Communication** | Reply to tickets as "School Leader" |
| **Global Broadcast** | Post announcements to Status Board |

### 📊 History Tab (Admin)
| Feature | Description |
|---------|-------------|
| **Date Range Picker** | From / To date selection |
| **AI Trend Analysis** | Gemini 3.1 Flash Lite generates full ops report |
| **Donut Pie Chart** | Category distribution visualization |
| **Bar Chart** | Tier breakdown (T1/T2/T3) |
| **Resolution Pipeline** | Status bar showing resolved vs pending |
| **5 KPI Cards** | Total, T1, T2, T3, Resolved at a glance |

### 🎫 Ticket Tracker (`/track`)
| Feature | Description |
|---------|-------------|
| **Multi-Ticket Support** | All your submitted tickets saved locally |
| **PIN Authentication** | 6-digit PIN access (never stored in plaintext) |
| **Resolved/Closed Banners** | Clear status indicators |
| **Proposed Solution Display** | Shows your submitted solution idea |
| **2-way Reply** | Message EXCO or SL directly |

---

## `> TRIAGE ENGINE`

```
Student Input
     │
     ▼
┌────────────────────────────────────────┐
│         Gemini 3.1 Flash Lite          │
│         Classification Prompt          │
│                                        │
│  Tier 1 — Infrastructure               │
│    Physical/facility issues            │
│    → Auto-escalate to SL              │
│                                        │
│  Tier 2 — Strategic                   │
│    Policy/culture/academic issues      │
│    → EXCO queue                       │
│                                        │
│  Tier 3 — Noise                       │
│    Spam/gibberish/non-actionable       │
│    → Auto-archive                     │
└────────────────────────────────────────┘
     │
     ▼
Cluster Detection → Trend Alerts (≥5 similar reports = critical)
```

---

## `> TECH STACK`

```
Frontend                Backend               AI / Data
─────────────────────   ─────────────────────  ─────────────────────
React 18 + TypeScript   Node.js + Express      Gemini 3.1 Flash Lite
Vite+ (unified build)   SQLite (better-sqlite3) Keyword fallback
Tailwind CSS            REST API               Cluster engine
React Router            JWT-free auth          Trend detection
marked (MD rendering)   PIN hashing (SHA-256)
Pure SVG charts
```

---

## `> QUICK START`

### Prerequisites
- Node.js 18+
- A [Gemini API Key](https://aistudio.google.com/apikey)

### Setup

```bash
# Clone the repo
git clone https://github.com/IRSPlays/Project-Echo.git
cd Project-Echo

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values (see below)

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# EXCO Dashboard passphrase
ADMIN_PASSPHRASE=your_exco_passphrase_here

# School Leader Dashboard passphrase
SL_PASSPHRASE=your_sl_passphrase_here

# Server port
PORT=3001
NODE_ENV=development
```

> ⚠️ **Never commit your `.env` file.** It is already in `.gitignore`.

---

## `> ROUTES`

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Anonymous feedback submission portal |
| `/track` | PIN-gated | Student ticket tracker |
| `/admin` | EXCO / SL passphrase | Operations control room |
| `/status` | Public | Live status board |

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/echo/submit` | None | Submit anonymous feedback |
| `GET` | `/api/echo/admin/submissions` | EXCO | List all submissions |
| `PATCH` | `/api/echo/admin/submissions/:id` | EXCO or SL | Update ticket status |
| `POST` | `/api/echo/admin/submissions/:id/escalate` | EXCO | Escalate to SL |
| `GET` | `/api/echo/admin/ticket/:id` | EXCO or SL | Get ticket + replies |
| `POST` | `/api/echo/admin/ticket/:id/reply` | EXCO or SL | Reply to ticket |
| `POST` | `/api/echo/admin/history/summary` | EXCO or SL | AI trend analysis |
| `POST` | `/api/echo/admin/global_updates` | EXCO or SL | Post announcement |
| `GET` | `/api/echo/admin/global_updates` | Public | Get announcements |
| `GET` | `/api/echo/admin/stats` | Public | System statistics |
| `GET` | `/api/echo/ticket/:id` | PIN | Student ticket view |

---

## `> DATABASE SCHEMA`

```sql
submissions       — All feedback entries with tier, status, AI reasoning
ticket_replies    — Threaded messages (Student ↔ EXCO ↔ School Leader)
clusters          — Recurring issue detection
global_updates    — School-wide announcements
```

---

## `> SECURITY MODEL`

```
┌──────────────────────────────────────────────────┐
│  STUDENT                                         │
│  • No account required                           │
│  • No IP logging                                 │
│  • No session tracking                           │
│  • PIN is SHA-256 hashed before storage          │
│  • Ticket ID is a UUID — not guessable           │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  EXCO                                            │
│  • Passphrase-based access (header auth)         │
│  • Cannot see student identity                   │
│  • Rate-limited submission endpoint              │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  SCHOOL LEADER                                   │
│  • Separate passphrase from EXCO                 │
│  • Only sees escalated / T1 tickets              │
│  • Cannot access raw EXCO submission list        │
└──────────────────────────────────────────────────┘
```

---

## `> PROJECT STRUCTURE`

```
Project Echo VOA V2/
├── server/
│   ├── db/
│   │   ├── connection.ts     # SQLite connection + schema
│   │   └── queries.ts        # All DB queries
│   ├── routes/
│   │   ├── submit.ts         # Anonymous submission endpoint
│   │   ├── admin.ts          # EXCO + SL admin routes
│   │   └── ticket.ts         # Student ticket tracker
│   ├── services/
│   │   ├── classifier.ts     # Gemini AI triage classifier
│   │   ├── cluster.ts        # Trend/cluster detection
│   │   └── spam.ts           # Rate limiting + validation
│   └── index.ts              # Express server entry
├── src/
│   ├── components/
│   │   ├── Charts.tsx         # SVG pie/bar/status charts
│   │   ├── ClusterAlert.tsx   # Trend alert component
│   │   ├── CategoryPicker.tsx
│   │   └── EchoInput.tsx
│   ├── lib/
│   │   └── api.ts             # Frontend API client
│   ├── pages/
│   │   ├── SubmitPortal.tsx   # Student submission page
│   │   ├── TicketTracker.tsx  # Multi-ticket tracker
│   │   ├── AdminDashboard.tsx # EXCO + SL dashboard
│   │   └── StatusBoard.tsx    # Public status board
│   └── App.tsx
├── .env.example               # Environment template
├── .gitignore
└── package.json
```

---

## `> STATUS FLOW`

```
[PENDING] → [INVESTIGATING] → [RESOLVED] → [CLOSED]
                                                │
                                            Saved as
                                          historical record
                              [ARCHIVED] ← (Noise/spam)
```

---

<div align="center">

**Built for school operations. Runs on student trust.**

*Project Echo VOA V2 — Anonymous. Accountable. Actionable.*

</div>
