<div align="center">

# Encounter

**Privacy-first intimacy tracker with a Linear-inspired aesthetic**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A progressive web application for tracking intimate encounters with military-grade privacy controls, end-to-end encryption, and a sleek dark-mode-first UI.

[Features](#features) · [Quick Start](#quick-start) · [Documentation](#documentation) · [Contributing](#contributing)

</div>

---

## Overview

Encounter is a privacy-focused web application built for adults who want to maintain a personal log of intimate encounters. It combines a minimal, fast data entry flow with powerful analytics—all while keeping your data strictly private through encryption, PIN protection, and row-level security.

**Key Principles:**
- 🔒 **Privacy First**: All data encrypted at rest and in transit
- ⚡ **Speed**: Log an entry in under 3 seconds on mobile
- 📊 **Insightful Analytics**: Beautiful charts and heatmaps
- 🌐 **Offline-Ready**: Full PWA support with offline capabilities

## Features

### Core Functionality
- **Quick Log** — Single-screen mobile-first form with smart defaults
- **Timeline** — Chronological card view with cursor-based pagination
- **Dashboard** — Comprehensive analytics with 7+ chart types
- **Map** — Mapbox-powered heatmap and point visualization
- **Playback** — Animated journey replay on the map

### Privacy & Security
- **End-to-End Encryption** — AES-256-GCM for notes, HKDF key derivation
- **PIN Lock** — 4-6 digit PIN with brute-force protection
- **Row Level Security** — Database-level user isolation via Supabase RLS
- **Audit Logging** — Track data access and exports

### Data Management
- **Partner Profiles** — Track with multiple partners, custom colors & avatars
- **Tag System** — Categorize encounters with custom tags
- **CSV Export** — Export all data with audit trail
- **Photo Attachments** — Client-side compression before upload

### Advanced Features
- **Couple Sync** — Bind with your partner for shared visibility
- **Location Modes** — Off / City-level / Exact coordinates
- **Activity Heatmap** — GitHub-style yearly activity visualization
- **Dark/Light Theme** — System-aware with manual toggle

### Technical
- **PWA** — Installable on mobile home screens
- **i18n** — English and Chinese language support
- **Mobile-First** — Responsive design with bottom tab navigation

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| **UI Components** | shadcn/ui, Radix UI, Lucide Icons, Recharts, Motion |
| **State Management** | Zustand 5 |
| **Maps** | Mapbox GL 3, Turf.js |
| **Backend** | Next.js Server Actions, Route Handlers |
| **Database** | Supabase (PostgreSQL) with 37 migrations |
| **Authentication** | Supabase Auth (email/password) |
| **Email** | Resend |
| **Rate Limiting** | Upstash Redis |
| **PWA** | Serwist (Service Worker) |
| **Deployment** | Vercel |

## Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **pnpm** (recommended) or npm/yarn
- **Supabase Account** — [supabase.com](https://supabase.com/)
- **Mapbox Token** (optional) — [mapbox.com](https://www.mapbox.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/encounter.git
cd encounter
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required: Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required: Encryption
ENCRYPTION_SECRET=your_random_secret_at_least_32_chars

# Required: Email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Optional: App Config
NEXT_PUBLIC_APP_NAME=Encounter
NEXT_PUBLIC_DEFAULT_TIMEZONE=UTC

# Optional: Mapbox (for map features)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Optional: Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 4. Database Setup

1. Create a new project in [Supabase](https://supabase.com/)
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli)
3. Link your project and run migrations:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation

| Document | Description |
|----------|-------------|
| [Design System](./design.md) | Linear-inspired visual design guidelines |
| [Development Spec](./intimacy-tracker-dev-spec.md) | Complete product specification (Chinese) |
| [AI Collaboration Protocol](./AGENTS.md) | Git workflow and coding standards |
| [AI Code Guidelines](./CLAUDE.md) | AI-assisted development guidelines |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Protected routes (dashboard, timeline, etc.)
│   ├── (public)/           # Public routes (login, register, etc.)
│   └── api/                # API route handlers
├── components/             # React components
│   ├── ui/                 # Base UI components (shadcn)
│   ├── layout/             # Layout components (sidebar, nav)
│   ├── analytics/          # Dashboard & charts
│   ├── forms/              # Form components
│   ├── timeline/           # Timeline views
│   ├── map/                # Map components
│   ├── partners/           # Partner management
│   └── settings/           # Settings panels
├── features/               # Business logic & server actions
│   ├── auth/               # Authentication
│   ├── records/            # Encounter CRUD
│   ├── analytics/          # Statistics queries
│   ├── partners/           # Partner management
│   ├── map/                # Map data queries
│   └── privacy/            # PIN & privacy settings
├── lib/                    # Utilities & configurations
│   ├── supabase/           # Supabase client setup
│   ├── auth/               # PIN hashing & verification
│   ├── encryption/         # AES-256-GCM encryption
│   └── email/              # Resend email templates
├── stores/                 # Zustand state stores
├── hooks/                  # Custom React hooks
└── i18n/                   # Internationalization config
```

## Configuration

### Location Modes

Encounter supports three location precision levels:

| Mode | Description | Storage |
|------|-------------|---------|
| `off` | No location data collected | None |
| `city` | City-level approximation | City/country names |
| `exact` | GPS coordinates | Lat/lng + city/country |

### PIN Security

The PIN system implements progressive lockout protection:

| Failed Attempts | Lockout Duration |
|-----------------|------------------|
| 1-4 | None |
| 5 | 1 minute |
| 6 | 5 minutes |
| 7 | 15 minutes |
| 8+ | 1 hour |

PIN hashes are stored using scrypt (v2) with automatic upgrade from legacy HMAC (v1).

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com/)
3. Configure environment variables
4. Deploy

### Self-Hosted

```bash
pnpm build
pnpm start
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [AGENTS.md](./AGENTS.md) for our Git workflow and coding standards.

## Security

For security concerns, please email [security@yourdomain.com](mailto:security@yourdomain.com) directly.

**Security Features:**
- AES-256-GCM encryption for sensitive data
- Row Level Security (RLS) on all tables
- PIN brute-force protection
- Audit logging for data exports
- No tracking, no analytics, no third-party services

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with care for privacy-conscious individuals**

</div>
