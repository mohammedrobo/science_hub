# Science Hub — Comprehensive Project Documentation

> **Science Hub** is a full-featured Progressive Web App (PWA) built for first-year science students. It delivers course content, interactive assessments, AI-powered feedback, gamification, and a complete administrative toolkit — all wrapped in a bilingual (English / Arabic) interface with a modern, responsive design.

---

## Table of Contents

1. [Architecture & Tech Stack](#-architecture--tech-stack)
2. [Project Structure](#-project-structure)
3. [Authentication & Security](#-authentication--security)
4. [User Roles & Permissions](#-user-roles--permissions)
5. [Core Features](#-core-features)
   - [Course Management](#1-course-management)
   - [Interactive Quizzes & AI Analysis](#2-interactive-quizzes--ai-analysis)
   - [Gamification System](#3-gamification-system)
   - [Student Profile & Analytics](#4-student-profile--analytics)
   - [Student Tools](#5-student-tools)
   - [Guilds](#6-guilds)
   - [Notifications & Push](#7-notifications--push-system)
6. [Admin & Leader Tools](#-admin--leader-tools)
   - [Admin Dashboard](#admin-dashboard)
   - [Leader Dashboard](#leader-dashboard)
   - [Content Management System (CMS)](#content-management-system-cms)
   - [User Management](#user-management)
   - [Safety Monitoring System](#safety-monitoring-system)
7. [Internationalization (i18n)](#-internationalization-i18n)
8. [Progressive Web App (PWA)](#-progressive-web-app-pwa)
9. [Database Schema](#-database-schema)
10. [API Routes](#-api-routes)
11. [Server Actions](#-server-actions)
12. [UI Component Library](#-ui-component-library)
13. [State Management](#-state-management)
14. [Utility Scripts](#-utility-scripts)
15. [Performance & Optimization](#-performance--optimization)
16. [Security Headers & CSP](#-security-headers--csp)
17. [Getting Started](#-getting-started)
18. [Environment Variables](#-environment-variables)
19. [Deployment](#-deployment)

---

## 🏗️ Architecture & Tech Stack

Science Hub is a **monolithic Next.js application** using the App Router paradigm. The frontend and backend (Server Actions + API Routes) live in the same codebase. Supabase provides the managed PostgreSQL database, authentication primitives, and file storage. Upstash Redis handles caching and rate-limiting. The app is deployed on Vercel with standalone output for Docker/self-hosting compatibility.

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Full-stack React framework |
| **React 19** | UI rendering |
| **TypeScript** | Type safety across the codebase |
| **Tailwind CSS v4** | Utility-first styling |
| **Framer Motion** | Page transitions & micro-animations |
| **Radix UI** | Accessible headless UI primitives (Dialog, Dropdown, Select, Tabs, Accordion, Popover, ScrollArea, etc.) |
| **Lucide React** | Iconography |
| **Zustand** | Lightweight global state management |
| **React Hook Form + Zod** | Form handling with schema validation |
| **next-intl** | Internationalization (English + Arabic with RTL) |
| **KaTeX + react-katex** | LaTeX math & scientific formula rendering |
| **react-markdown + remark-gfm** | Markdown content rendering |
| **Recharts** | Data visualization (XP charts, quiz trends, analytics) |
| **driver.js** | Interactive guided tours for onboarding |
| **Sonner** | Toast notification system |
| **date-fns** | Date formatting and manipulation |

### Backend & Infrastructure

| Technology | Purpose |
|---|---|
| **Supabase** | BaaS — PostgreSQL database, Auth, Storage |
| **Next.js Server Actions** | Secure server-side mutations (1000+ lines of admin actions) |
| **Next.js API Routes** | RESTful endpoints for auth, push, cron, uploads, feedback |
| **Upstash Redis** | Rate limiting & caching layer |
| **jose** | JWT signing/verification for session management |
| **bcryptjs** | Password hashing |
| **web-push** | Web Push API for notifications |
| **pdf-parse** | Server-side PDF text extraction |
| **Google Generative AI** | AI-powered quiz analysis (Gemini models) |
| **Vercel** | Deployment platform |

### Fonts

Three custom Google Fonts are loaded for design consistency:
- **Manrope** — Primary sans-serif (English UI)
- **Fraunces** — Serif accent font
- **IBM Plex Sans Arabic** — Arabic language support

---

## 📂 Project Structure

```
science_hub/
├── database/                    # 33 SQL schema & migration files
│   ├── schema.sql               # Core schema (courses, content)
│   ├── schema_users.sql         # User table definitions
│   ├── schema_gamification.sql  # XP, levels, achievements
│   ├── schema_quizzes.sql       # Quiz & question tables
│   ├── schema_safety.sql        # Activity logs, reports, alerts
│   ├── schema_notifications.sql # Notification system
│   ├── schema_guild.sql         # Guild/team system
│   ├── schema_session_tracking.sql  # Study session tracking
│   ├── schema_security_logs.sql # Security audit trail
│   └── ...                      # Indexes, RLS policies, migrations
│
├── public/                      # Static assets
│   ├── pdfs/                    # Course lecture PDF files
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service Worker
│   ├── icon.png                 # App icon (1024x1024)
│   └── ...                      # Favicons, Apple touch icons
│
├── scripts/                     # 19 utility & maintenance scripts
│   ├── generate-users.ts        # Bulk user generation
│   ├── security-audit.ts        # Automated security audit
│   ├── test-quiz-parser.ts      # Quiz parser test suite
│   ├── extract_schedule.py      # PDF schedule extraction
│   └── ...                      # Migration, validation, diagnostics
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Authentication pages (login)
│   │   ├── (root)/              # Main student dashboard
│   │   │   ├── page.tsx         # Home — course grid, progress
│   │   │   ├── course/          # Individual course view
│   │   │   ├── progress/        # Detailed progress tracking
│   │   │   ├── quiz/            # Quiz taking interface
│   │   │   └── tools/           # Student tools (GPA calculator)
│   │   ├── admin/               # Admin panel
│   │   │   ├── (dashboard)/     # User management dashboard
│   │   │   ├── lessons/         # Lesson CRUD
│   │   │   ├── upload/          # Content upload interface
│   │   │   ├── feedback/        # Feedback review
│   │   │   ├── safety/          # Safety monitoring dashboard
│   │   │   │   ├── _components/ # 15 safety dashboard components
│   │   │   │   ├── student/     # Individual student profile view
│   │   │   │   └── actions.ts   # Safety server actions (755 lines)
│   │   │   ├── users/           # User list & management
│   │   │   └── actions.ts       # Core admin actions (1081 lines)
│   │   ├── leader/              # Leader dashboard with guided tour
│   │   ├── guild/               # Guild management page
│   │   ├── leaderboard/         # Rankings page
│   │   ├── profile/             # Student profile & analytics
│   │   ├── schedule/            # Class schedule with push reminders
│   │   ├── tracking/            # Session tracking page
│   │   ├── onboarding/          # First-time user onboarding flow
│   │   ├── change-password/     # Password change (forced on first login)
│   │   ├── updates/             # What's new / changelog page
│   │   ├── api/                 # API Routes
│   │   │   ├── auth/            # Login/logout endpoints
│   │   │   ├── courses/         # Course data API
│   │   │   ├── push/            # Push notification endpoints
│   │   │   ├── feedback/        # Feedback submission
│   │   │   ├── upload/          # File upload handling
│   │   │   ├── tracking/        # Activity tracking
│   │   │   ├── cron/            # Scheduled cron jobs
│   │   │   └── debug-gemini/    # AI model debugging
│   │   ├── actions/             # Shared server actions
│   │   ├── globals.css          # Global styles (12KB, custom scrollbars, animations)
│   │   ├── layout.tsx           # Root layout (i18n, PWA, safety trackers)
│   │   └── template.tsx         # Page transition animations
│   │
│   ├── components/              # React components
│   │   ├── ui/                  # 20 Radix-based UI primitives
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, form.tsx
│   │   │   ├── dropdown-menu.tsx, select.tsx, tabs.tsx
│   │   │   ├── table.tsx, sheet.tsx, skeleton.tsx
│   │   │   └── ...
│   │   ├── courses/             # Course-specific components
│   │   │   ├── CourseCard.tsx    # Course card with progress ring
│   │   │   ├── CourseGrid.tsx   # Responsive course grid
│   │   │   ├── VideoPlayer.tsx  # YouTube player (25KB, multi-part)
│   │   │   ├── PDFViewer.tsx    # PDF viewer/downloader
│   │   │   └── CompleteButton.tsx
│   │   ├── layout/              # App shell components
│   │   │   ├── Header.tsx       # Top navigation bar
│   │   │   ├── MobileMenu.tsx   # Mobile navigation drawer
│   │   │   ├── SemesterToggle.tsx
│   │   │   └── UserNav.tsx      # User dropdown menu
│   │   ├── notifications/       # Notification system
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── ManageNotifications.tsx
│   │   │   └── SendNotificationForm.tsx
│   │   ├── safety/              # Client-side safety tracking
│   │   │   ├── PageTracker.tsx  # Page view tracking
│   │   │   └── ActivityTracker.tsx
│   │   ├── schedule/            # Schedule display components
│   │   ├── guild/               # Guild UI components (6 files)
│   │   ├── leader/              # Leader-specific components
│   │   ├── auth/                # Auth components (login form, guards)
│   │   ├── admin/               # Admin dashboard components
│   │   ├── tools/               # GPA calculator component
│   │   ├── MathText.tsx         # LaTeX/KaTeX math renderer (12KB)
│   │   ├── LanguageSwitcher.tsx # EN/AR language toggle
│   │   ├── InstallPrompt.tsx    # PWA install prompt
│   │   ├── FeedbackButton.tsx   # Floating feedback FAB
│   │   ├── FeedbackModal.tsx    # Bug report / feature request form
│   │   ├── WhatsNewDialog.tsx   # Changelog popup
│   │   └── ServiceWorkerRegistration.tsx
│   │
│   ├── lib/                     # Core business logic & utilities
│   │   ├── auth/                # Authentication system
│   │   │   ├── session.ts       # JWT session management (sign, verify, create, destroy)
│   │   │   ├── password.ts      # bcrypt password hashing
│   │   │   ├── security-monitor.ts  # Security event logging & webhook alerts (298 lines)
│   │   │   ├── rate-limit.ts    # In-memory rate limiter
│   │   │   ├── rate-limit-redis.ts  # Redis-backed rate limiter (6KB)
│   │   │   └── session-read.ts  # Read-only session helper
│   │   ├── safety/              # Safety monitoring logic
│   │   ├── data/                # Data layer
│   │   │   └── mocks.ts         # Course & lesson definitions (683 lines)
│   │   ├── supabase/            # Supabase client factories
│   │   │   ├── server.ts        # Server-side client (service role)
│   │   │   └── client.ts        # Browser client
│   │   ├── store/               # Server-side cache store
│   │   ├── quiz-parser.ts       # Quiz text parser v5 (1434 lines)
│   │   ├── quiz-data.ts         # Quiz data operations (44KB)
│   │   ├── gamification.ts      # XP, levels, leaderboard, analytics (634 lines)
│   │   ├── latex-constants.ts   # LaTeX command/symbol definitions (14KB)
│   │   ├── push-notifications.ts # Web Push API integration
│   │   ├── security.ts          # Security utilities
│   │   ├── performance.ts       # Performance monitoring helpers
│   │   ├── constants.ts         # Course subsection definitions
│   │   ├── seed.ts              # Database seeding logic
│   │   ├── student-data.ts      # Student data helpers
│   │   ├── youtube-utils.ts     # YouTube URL parsing & embed utilities
│   │   └── utils.ts             # General utilities (cn, grade calc)
│   │
│   ├── stores/                  # Zustand state stores
│   │   └── semester-store.ts    # Persisted semester selection (Term 1/2)
│   │
│   ├── types/                   # TypeScript type definitions
│   │   ├── index.ts             # Core types (Course, Lesson, Semester, etc.)
│   │   ├── database.types.ts    # Supabase-generated DB types
│   │   └── react-katex.d.ts     # KaTeX type declarations
│   │
│   ├── messages/                # i18n translation files
│   │   ├── en.json              # English translations (27KB)
│   │   └── ar.json              # Arabic translations (34KB)
│   │
│   ├── i18n/                    # next-intl configuration
│   │   └── request.ts           # Locale detection & setup
│   │
│   ├── scripts/                 # Build-time scripts
│   │   └── bump-sw.mjs          # Service worker version bumper
│   │
│   └── proxy.ts                 # Request proxy utilities
│
├── supabase/                    # Supabase CLI configuration
├── testsprite_tests/            # End-to-end test suite (70 files)
├── secure_data/                 # Sensitive data (gitignored)
├── next.config.ts               # Next.js config (security headers, CSP, i18n)
├── vercel.json                  # Vercel deployment config
├── package.json                 # Dependencies & scripts
└── SECURITY_AUDIT_REPORT.md     # Security audit findings
```

---

## 🔐 Authentication & Security

Science Hub uses a **custom JWT-based session system** (not Supabase Auth sessions) for maximum control over the authentication flow.

### Session Management (`src/lib/auth/session.ts`)

- **JWT Tokens**: Sessions are signed with `HS256` using the `jose` library and a `SESSION_SECRET` environment variable.
- **Cookie-Based**: The signed JWT is stored in an `httpOnly`, `secure`, `sameSite: lax` cookie named `sciencehub_session` with a **7-day** expiration.
- **Session Data**: Each session token contains: `username`, `name`, `group`, `section`, `role`, `isFirstLogin`, `hasOnboarded`, `loggedInAt`, and a unique `sessionToken`.
- **Single Session Enforcement**: Only one active session per user. When a new login occurs, a new `sessionToken` is generated, invalidating all previous sessions.
- **DB Verification Cache**: For sensitive operations, the session is verified against the database (`allowed_users` table) with a 5-minute in-memory cache to reduce DB queries.

### Password Security (`src/lib/auth/password.ts`)

- **bcryptjs**: All passwords are hashed with bcrypt before storage.
- **First Login Flow**: New users must change their password on first login. The `isFirstLogin` flag triggers a forced redirect to `/change-password`.
- **Password Reset**: Admins can reset passwords to the user's original password from `access_keys.json`, re-triggering the first-login flow.

### Rate Limiting (`src/lib/auth/rate-limit-redis.ts`)

Two rate-limiting strategies are available:
- **In-Memory** (`rate-limit.ts`): Simple token bucket for development.
- **Redis-Backed** (`rate-limit-redis.ts`): Production-grade rate limiting via Upstash Redis with configurable windows for login attempts, API calls, and admin actions.

### Security Monitoring (`src/lib/auth/security-monitor.ts`)

A comprehensive security event logging system:
- **Event Types**: Login failures, rate-limit breaches, admin actions, suspicious activity, session hijacks.
- **Severity Levels**: `INFO`, `WARNING`, `CRITICAL`.
- **Batch Logging**: Events are buffered in memory (up to 10 events or 30 seconds) before flushing to the database to reduce write overhead.
- **Webhook Alerts**: Critical events can trigger Discord/Slack webhook notifications.
- **Functions**: `logSecurityEvent()`, `logAdminAction()`, `getSecurityLogs()`, `getSecurityStats()`.

---

## 👥 User Roles & Permissions

| Role | Access Level |
|---|---|
| `student` | Default role. Access to courses, quizzes, profile, schedule, guilds, leaderboard. |
| `leader` | Everything a student can do + Leader Dashboard for managing their section's students. |
| `admin` | Limited admin capabilities — content management and basic user operations. |
| `super_admin` | Full system access — all admin features, user role management, account resets, safety dashboard, and system configuration. |

Role enforcement is implemented via server-side guard functions:
- `ensureSuperAdmin()` — Restricts to `super_admin` only.
- `ensureAnyAdmin()` — Allows `super_admin` or `admin`.
- `ensureLeaderOrAdmin()` — Allows `super_admin`, `admin`, or `leader` for CMS operations.

---

## 🚀 Core Features

### 1. Course Management

Content is organized in a streamlined **Term > Course > Lesson** hierarchy (chapters were deprecated to simplify navigation).

- **Semester Toggle**: A persistent Zustand store (`semester-store.ts`) lets students switch between Term 1 and Term 2 content. The selection persists across sessions via `localStorage`.
- **Course Catalog**: Courses are defined in `src/lib/data/mocks.ts` (683 lines) with metadata such as code, name, description, semester, and icon. Includes courses across Mathematics, Chemistry (Atomic, Equilibrium, Organic, Practical), Physics, Biology, Computer Science, and general education (Human Rights, Environmental Culture, Societal Issues).
- **Course Sub-Sections**: Some courses support sub-grouping. For example, Physics `P102` is split by instructor (Dr. Essam, Dr. Wagida, Dr. Mohammed), and Chemistry `C102` is split by section (Physical Chemistry, Organic Chemistry). Defined in `src/lib/constants.ts`.
- **Lesson Content**: Each lesson can include:
  - **Video lectures** — Single YouTube URL or multi-part video series.
  - **PDF lecture notes** — Stored in Supabase Storage or served from `/public/pdfs/`.
  - **Attached quizzes** — Linked quiz for post-lesson assessment.
- **Video Player** (`components/courses/VideoPlayer.tsx` - 25KB): Custom YouTube player with multi-part support, error boundary recovery, and thumbnail previews.
- **PDF Viewer** (`components/courses/PDFViewer.tsx`): In-browser PDF viewing with download capabilities. Streamlined upload UX for instructors.
- **Progress Tracking**: Visual completion indicators per lesson and per course (progress rings on course cards). Lessons are marked complete via `CompleteButton.tsx`.

### 2. Interactive Quizzes & AI Analysis

The quiz system is a major feature of the platform, powered by an advanced parser and optional AI analysis.

#### Quiz Parser v5 (`src/lib/quiz-parser.ts` — 1,434 lines)

One of the most sophisticated components in the project. The parser converts raw text (from any source) into structured quiz questions. It handles:

- **Input Formats**: Markdown, HTML tags, plain text, and raw AI-generated output from ChatGPT, Claude, and Gemini.
- **Question Types**: Multiple Choice (MCQ), True/False, and Fill-in-the-Blank — all auto-detected.
- **LaTeX & Scientific Notation**: Full support for inline math (`$...$`), display math (`$$...$$`), `\frac`, `\sqrt`, `\ce{...}` (chemistry), subscripts, superscripts, and 200+ LaTeX commands/symbols defined in `latex-constants.ts` (14KB).
- **Correct Answer Detection**: Recognizes ✅, ✓, `[x]`, `←`, `>>`, `★`, bold markers, "Correct Answer:" labels, answer keys, and more.
- **Preprocessing**: Strips HTML, normalizes whitespace, handles Unicode oddities, removes markdown artifacts.
- **LaTeX Protection**: A sophisticated `protectLatex()` function prevents LaTeX formulas from being corrupted during text splitting. It uses placeholder tokens and a restore mechanism for balanced brace groups across newlines.
- **Roman Numeral Support**: Questions numbered with Roman numerals (I, II, III...) are parsed correctly.
- **Inline Options**: Detects options placed on the same line as the question.
- **Statistics Output**: Returns `totalDetected`, `withAnswers`, `withoutAnswers`, `truefalseCount`, `mcqCount`, `fillBlankCount`.
- **Safety Limit**: Maximum 10,000 input lines to prevent abuse.

#### Quiz Data Layer (`src/lib/quiz-data.ts` — 44KB)

Handles quiz CRUD operations, score recording, and retrieval against Supabase.

#### MathText Component (`src/components/MathText.tsx` — 12KB)

A versatile component that renders text containing LaTeX math formulas using KaTeX. Handles inline and display math, chemical formulas, and fallback rendering for malformed expressions.

### 3. Gamification System (`src/lib/gamification.ts` — 634 lines)

A comprehensive engagement layer:

- **XP & Leveling**: Students earn experience points for completing lessons, quizzes, and other activities.
- **Rank System**: XP maps to ranks (defined in the system).
- **Leaderboard** (`/leaderboard`): Competitive ranking displaying **full student names** for community recognition.
- **Header Stats (Cached)**: Lightweight stats (rank, XP, profile picture) are cached per-user for **120 seconds** using `unstable_cache` to make navigation instant.
- **User Stats**: Comprehensive profile data including XP, rank, completed lessons/quizzes, GPA (Semester 1, Semester 2, Cumulative).
- **Course Progress**: Per-course lesson and quiz completion percentages.
- **Subject Performance Analytics**: Per-subject quiz breakdown showing average scores, best scores, and letter grades.
- **XP History**: Time-series data for XP accumulation charts.
- **Quiz Score History**: Timestamped quiz scores for trend analysis, filterable by course.
- **Detailed Course Progress**: Per-lesson and per-quiz completion data with timestamps.
- **Overall Completion**: Aggregate statistics across all courses.

### 4. Student Profile & Analytics (`/profile`)

A rich analytics dashboard for each student:

- **Profile Picture Upload**: Custom avatar upload stored in Supabase Storage.
- **Performance Charts** (`ProfileCharts.tsx` - 10KB): Recharts-powered visualizations:
  - XP history over time.
  - Quiz score trends per subject.
  - Course completion breakdown.
- **Subject-by-Subject Performance**: Average scores, best grades, quiz counts per course.
- **GPA Display**: Semester 1, Semester 2, and Cumulative GPA calculations.
- **Progress Overview**: Visual progress bars across all enrolled courses.

### 5. Student Tools

#### GPA Calculator (`/tools`)
A dedicated calculator aligned with the university's grading scale, allowing students to project and plan their academic performance.

#### Class Schedule (`/schedule`)
- **Section-Based Schedules**: Students see schedules specific to their section.
- **Push Notification Reminders**: Automated reminders sent **15 minutes** and **5 minutes** before each class via the Web Push API.
- **Schedule Actions** (`schedule/actions.ts` - 14KB): Server-side schedule management and notification scheduling.

### 6. Guilds (`/guild`)

A social grouping system for collaborative learning:
- Guild creation, joining, and management.
- Guild-specific pages and member listings.
- **6 dedicated components** in `src/components/guild/`.
- Server actions for guild CRUD operations (`guild/actions.ts` — 8KB).

### 7. Notifications & Push System

#### In-App Notifications
- **NotificationBell** (`components/notifications/NotificationBell.tsx` — 7KB): Real-time notification indicator in the header.
- **Section-Targeted Delivery**: Admins can send notifications to specific sections (not just "all students").
- **Sender Identity**: Notifications display whether they were sent by an Admin or Leader.
- **Manage Notifications** (`ManageNotifications.tsx` — 7.6KB): Admin UI for viewing and managing sent notifications.
- **Send Notification Form** (`SendNotificationForm.tsx` — 6.3KB): Rich form for composing and targeting notifications.

#### Web Push Notifications
- **Service Worker** (`public/sw.js`): Handles push events and notification display.
- **Push Subscription** (`schema_push_subscriptions.sql`): Stores user push subscription endpoints.
- **Server-Side Push** (`src/lib/push-notifications.ts`): Uses the `web-push` library with VAPID credentials.
- **Cron API** (`api/cron/`): Scheduled jobs for automated notifications (class reminders).

---

## 🛡️ Admin & Leader Tools

### Admin Dashboard (`/admin`)

The central hub for platform management, accessible to `admin` and `super_admin` roles.

#### Admin Dashboard Components (`/admin/(dashboard)/`)
10 specialized components for user management:
- `UserListWithFilter.tsx` — Filterable, paginated user table.
- `UserActions.tsx` — Contextual action menu (reset password, delete, promote, etc.).
- `AddStudentDialog.tsx` — Add new student form.
- `EditNameDialog.tsx` — Rename student.
- `RoleChangeDialog.tsx` — Promote/demote users between roles.
- `SearchStudentDialog.tsx` — Cross-section student search.
- `ResetAllButton.tsx` — Mass account reset with confirmation.
- `SectionSelector.tsx` — Section filter dropdown.

### Leader Dashboard (`/leader`)

For educational leaders managing their sections:
- Section-specific student overview.
- **Guided Tour** (`tour-actions.ts`, `tour-wrapper.tsx`): Interactive onboarding tour using `driver.js` that walks leaders through the dashboard features. Updated to reflect recent UI changes.

### Content Management System (CMS)

Managed through server actions in `src/app/admin/actions.ts` (1,081 lines):

**Lesson Operations:**
- `createLesson()` — Create lessons with title, video (single or multi-part), PDFs (single or multi-part), instructor assignment, and attached quiz with question import.
- `updateLesson()` — Update any lesson field including full quiz question replacement.
- `deleteLesson()` — Cascade delete lesson and associated quiz/questions.
- `getLessons()` / `getLesson()` — Retrieve lesson data with optional course filtering.
- `getSignedUploadUrl()` — Generate Supabase Storage signed URLs for secure server-side file uploads.

### User Management

Extensive user administration through admin actions:

- `createUser()` — Register a new user with username, full name, group, and section.
- `updateStudentName()` — Rename a student.
- `deleteUser()` — Permanently remove a user and all associated data.
- `resetUserProgress()` — Clear all progress, XP, and quiz scores while keeping the account.
- `removeProfilePicture()` — Delete a user's avatar from storage.
- `resetUserPassword()` — Reset to original password from `access_keys.json` (falls back to `student123`). Forces password change on next login.
- `resetFullAccount()` — Complete account reset to "first time" state: password, progress, stats, onboarding — everything.
- `resetAllAccounts()` — Mass reset ALL accounts while preserving admin/super_admin roles.
- `updateUserRole()` — Change user role (student → leader → admin → super_admin).
- `searchUsersByName()` — Cross-section (batch-wide) student search.

### Safety Monitoring System (`/admin/safety`)

A comprehensive, access-controlled administrative safety dashboard (755 lines of server actions + 15 dedicated components):

#### Dashboard Overview
- **Class Overview**: High-level engagement metrics across all sections.
- **Activity Heatmap**: Visual representation of platform usage patterns.
- **Recent Alerts**: Critical safety notifications requiring attention.

#### Student Monitoring
- **Engagement Scores**: Algorithmically computed per-student engagement scores with sorting by score, name, last active date, or risk level.
- **Risk Assessment**: Students flagged with risk indicators based on activity patterns.
- **Student Profiles** (`/admin/safety/student/[username]`): Deep-dive into individual student data including:
  - Activity timeline.
  - Engagement metrics.
  - Risk score breakdown.
  - Recent actions and page views.

#### Watchlist System
- `toggleWatchlist()` — Add/remove students from a monitored watchlist with optional reason notes.
- Watchlist students appear highlighted in the dashboard.

#### Report Management
- `getStudentReports()` — View student-submitted reports (bullying, concerns, etc.).
- `resolveReport()` — Mark reports as `resolved` or `dismissed` with admin notes.

#### Alert System
- `getAlerts()` — Paginated alert feed.
- `acknowledgeAlert()` — Mark individual alerts as reviewed.
- `dismissAllAlerts()` — Bulk dismiss all active alerts.

#### Activity Logs
- `getActivityLogs()` — Filtered, paginated activity logs with search by username, action type, date range, and section.
- Logs grouped by sessions for easier review.

#### Safety Statistics
- `getSafetyStats()` — Aggregate safety metrics for dashboard cards.

#### Client-Side Trackers
- `PageTracker.tsx` — Tracks page navigation events.
- `ActivityTracker.tsx` — Monitors user activity patterns (included in root layout).

---

## 🌐 Internationalization (i18n)

Full bilingual support using `next-intl`:

- **Languages**: English (`en.json` — 27KB) and Arabic (`ar.json` — 34KB).
- **RTL Support**: Automatic `dir="rtl"` on the HTML element when Arabic is selected.
- **Arabic Font**: IBM Plex Sans Arabic loaded from Google Fonts, applied via the `font-arabic` CSS class.
- **Language Switcher** (`LanguageSwitcher.tsx`): Toggle component in the UI for switching languages.
- **Configuration**: `src/i18n/request.ts` handles locale detection and message loading.
- **Coverage**: All UI elements, labels, navigation items, error messages, and system notifications are translated.

---

## 📱 Progressive Web App (PWA)

Science Hub is fully installable as a PWA:

- **Manifest** (`public/manifest.json`): Defines app name, icons, theme color (`#7c3aed` — purple), display mode, and start URL.
- **Service Worker** (`public/sw.js`): Handles caching strategies, offline support, and push notification display. Version is auto-bumped on each build via `src/scripts/bump-sw.mjs`.
- **Install Prompt** (`InstallPrompt.tsx` — 6KB): Smart install banner that detects mobile devices and offers a native-like install experience. Mobile-only display.
- **Service Worker Registration** (`ServiceWorkerRegistration.tsx`): Manages SW lifecycle in the client.
- **App Metadata**: Configured in root `layout.tsx` with Apple Web App capabilities, theme color, and comprehensive icon set.

---

## 🗄️ Database Schema

The database is managed through 33 SQL files in the `database/` directory. Key domains:

### User Management
| Table | Purpose |
|---|---|
| `users` | Core user profiles (username, full_name, group, section, avatar) |
| `allowed_users` | Whitelist with access roles, password hashes, session tokens, first-login flags |
| `onboarding` | User onboarding completion tracking |

### Content & Learning
| Table | Purpose |
|---|---|
| `courses` | Course definitions (code, name, semester) |
| `lessons` | Lesson entries with video URLs, PDF URLs, multi-part support, instructor, order index |
| `content` | Additional content entries |
| `quizzes` | Quiz metadata linked to lessons |
| `quiz_questions` | Individual questions with options, correct answer, type |
| `session_tracking` | Study session duration and activity logging |

### Gamification & Community
| Table | Purpose |
|---|---|
| `gamification` | XP totals, level, rank per user |
| `leaderboard` | Cached leaderboard rankings |
| `guilds` | Guild definitions (name, description, leader) |
| `guild_members` | Guild membership mapping |
| `feedback` | User-submitted bug reports and feature requests |

### Notifications
| Table | Purpose |
|---|---|
| `notifications` | System/admin notifications with section targeting and sender identity |
| `push_subscriptions` | Web Push subscription endpoints per user |

### Security & Safety
| Table | Purpose |
|---|---|
| `security_logs` | Security event audit trail (login failures, rate-limit breaches, etc.) |
| `activity_logs` | User activity tracking (page views, actions) |
| `reports` | Student-submitted safety reports |
| `alerts` | System-generated safety alerts |
| `watchlist` | Admin-maintained student watchlist |

### Policies & Indexes
- **RLS Policies** (`schema_lessons_rls.sql`, `storage_policy.sql`): Row-Level Security for lessons and file storage.
- **Performance Indexes** (`add_performance_indexes.sql`, `add_safety_tracking_indexes.sql`): Optimized queries for gamification, leaderboard, and safety operations.
- **Migrations**: Incremental schema changes (avatar support, PDF parts, video parts, nickname, leader system fixes, safety v2, etc.).

---

## 🔌 API Routes (`src/app/api/`)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | User authentication, session creation |
| `/api/auth/logout` | POST | Session destruction |
| `/api/courses/` | GET | Fetch course listings |
| `/api/push/subscribe` | POST | Register push notification subscription |
| `/api/push/send` | POST | Send push notifications |
| `/api/feedback/` | POST | Submit bug reports / feature requests |
| `/api/feedback/` | GET | Retrieve feedback entries |
| `/api/upload/` | POST | Handle file uploads to Supabase Storage |
| `/api/tracking/` | POST | Log user activity/session data |
| `/api/cron/` | GET | Scheduled jobs (class reminders, cleanup) |


---

## ⚡ Server Actions (`src/app/admin/actions.ts` + `src/app/admin/safety/actions.ts`)

Server Actions are the primary mechanism for secure server-side mutations. Key action files:

| File | Size | Actions Count | Domain |
|---|---|---|---|
| `admin/actions.ts` | 36KB / 1,081 lines | 16 actions | CMS, User Management, Lessons, Search |
| `admin/safety/actions.ts` | 28KB / 755 lines | 12 actions | Safety Dashboard, Reports, Alerts, Watchlist |
| `schedule/actions.ts` | 14KB | ~8 actions | Schedule management, notifications |
| `guild/actions.ts` | 8KB | ~6 actions | Guild CRUD operations |
| `profile/actions.ts` | 2.5KB | ~3 actions | Profile updates, avatar management |
| `app/actions/progress.ts` | — | ~4 actions | Course progress tracking |

---

## 🎨 UI Component Library (`src/components/ui/`)

20 reusable components built on Radix UI primitives with Tailwind CSS styling and `class-variance-authority` (CVA) for variant management:

| Component | Radix Primitive | Notes |
|---|---|---|
| `accordion.tsx` | `@radix-ui/react-accordion` | Expandable content sections |
| `avatar.tsx` | — | Profile picture display with fallback |
| `badge.tsx` | — | Status indicators and tags |
| `button.tsx` | `@radix-ui/react-slot` | Multiple variants (default, destructive, outline, ghost, link) |
| `card.tsx` | — | Content container with header/footer |
| `dialog.tsx` | `@radix-ui/react-dialog` | Modal dialogs with overlay |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | Context menus with sub-items |
| `form.tsx` | — | React Hook Form integration |
| `input.tsx` | — | Styled text input |
| `label.tsx` | `@radix-ui/react-label` | Form labels |
| `popover.tsx` | `@radix-ui/react-popover` | Floating content panels |
| `scroll-area.tsx` | `@radix-ui/react-scroll-area` | Custom scrollbar areas |
| `select.tsx` | `@radix-ui/react-select` | Dropdown selection |
| `separator.tsx` | `@radix-ui/react-separator` | Visual dividers |
| `sheet.tsx` | — | Slide-out panel (mobile menu) |
| `skeleton.tsx` | — | Loading placeholder |
| `sonner.tsx` | — | Toast notifications wrapper |
| `table.tsx` | — | Data table with header/body/footer |
| `tabs.tsx` | `@radix-ui/react-tabs` | Tab navigation |
| `textarea.tsx` | — | Multi-line text input |

---

## 🧠 State Management

### Zustand Store (`src/stores/semester-store.ts`)

A single persisted store managing the selected semester (Term 1 or Term 2):

```typescript
interface SemesterState {
    semester: Semester;      // 1 or 2
    setSemester: (semester: Semester) => void;
    hasHydrated: boolean;    // SSR hydration fix
    setHasHydrated: (state: boolean) => void;
}
```

- Persisted to `localStorage` under the key `semester-storage`.
- Includes a hydration guard to prevent SSR/client mismatch.
- Used throughout the app to filter courses and content by semester.

### Server-Side Caching

- `unstable_cache` from Next.js for header stats (120-second TTL, tagged for revalidation).
- In-memory caches for session verification (5-minute TTL) and safety dashboard data.

---

## 🔧 Utility Scripts (`scripts/`)

19 scripts for development, testing, and maintenance:

| Script | Language | Purpose |
|---|---|---|
| `generate-users.ts` | TypeScript | Bulk user generation for testing |
| `generate_users.py` | Python | Alternative user generation script |
| `security-audit.ts` | TypeScript | Automated security vulnerability scanning (15KB) |
| `test-quiz-parser.ts` | TypeScript | Comprehensive quiz parser test suite (48KB) |
| `test-formula-audit.ts` | TypeScript | LaTeX formula rendering tests |
| `check_db.ts` | TypeScript | Database connectivity verification |
| `promote_admins.ts` | TypeScript | Promote users to admin role |
| `demote_admin.ts` | TypeScript | Demote admin users |
| `migrate-passwords.ts` | TypeScript | Migrate plaintext passwords to bcrypt hashes |
| `force_schema_reload.ts` | TypeScript | Force Supabase schema cache reload |
| `diagnose_onboarding.ts` | TypeScript | Debug onboarding flow issues |
| `extract-pdf.js` | JavaScript | Extract text content from PDFs |
| `extract_schedule.py` | Python | Parse class schedules from PDF files |
| `parse_schedule.py` | Python | Schedule data parsing utility |
| `find_user_names.py` | Python | Search for user names in data files |
| `generate_icons.py` | Python | Generate PWA icon set from source image |
| `validate_urls.py` | Python | Validate all content URLs |
| `validate_video_urls.ts` | TypeScript | Verify YouTube video URL accessibility |

---

## ⚡ Performance & Optimization

### Next.js Configuration (`next.config.ts`)

- **CSS Optimization**: Experimental `optimizeCss` enabled.
- **Package Import Optimization**: Tree-shaking for `lucide-react`, `katex`, `date-fns`, `@supabase/supabase-js`.
- **Image Optimization**: AVIF and WebP formats with 1-year cache TTL. Remote patterns allowed for Supabase and YouTube thumbnails.
- **Standalone Output**: `output: 'standalone'` for Docker/self-hosting deployments.
- **Console Stripping**: `removeConsole` in production (preserving `error` and `warn`).
- **Compression**: gzip/Brotli compression enabled.
- **No Source Maps**: Production browser source maps disabled.
- **Bundle Analysis**: `@next/bundle-analyzer` available via `npm run analyze`.

### Build Pipeline

```json
"build": "node src/scripts/bump-sw.mjs && next build"
```

The build process auto-bumps the service worker version before building to ensure PWA cache updates.

### Caching Strategy

- **Header Stats**: 120-second `unstable_cache` per user.
- **Static Assets**: 1-year immutable cache headers.
- **Manifest**: 24-hour cache.
- **Service Worker**: `must-revalidate` (always fresh).
- **Next.js Static Files**: 1-year immutable cache.

---

## 🛡️ Security Headers & CSP

Configured in `next.config.ts` for all routes:

| Header | Value |
|---|---|
| `X-DNS-Prefetch-Control` | `on` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (production only) |

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob: https://img.youtube.com https://i.ytimg.com;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com;
frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com;
media-src 'self' https://www.youtube-nocookie.com https://www.youtube.com blob:;
frame-ancestors 'self';
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** (LTS version, v20+ recommended)
- **npm**, yarn, pnpm, or bun

### Installation

1. **Clone & Install:**
    ```bash
    git clone <repo-url>
    cd science_hub
    npm install
    ```

2. **Environment Setup:**
    Create `.env.local` with the required keys (see [Environment Variables](#-environment-variables) below).

3. **Database Setup:**
    Run the SQL files in the `database/` directory against your Supabase PostgreSQL instance, starting with `schema.sql` and `schema_users.sql`.

4. **Run Development Server:**
    ```bash
    npm run dev
    ```
    Access via `http://localhost:3000`.

### Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Bump service worker version + production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run analyze` | Analyze bundle size with `@next/bundle-analyzer` |

---

## 🔑 Environment Variables

Create a `.env.local` file with the following keys:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `SESSION_SECRET` | ✅ (prod) | HMAC secret for JWT session signing (min 32 chars) |

| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST endpoint URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis REST authentication token |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ⬜ | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | ⬜ | VAPID private key for Web Push |
| `SECURITY_WEBHOOK_URL` | ⬜ | Discord/Slack webhook for security alerts |
| `SECURITY_ALERT_ENABLED` | ⬜ | Enable webhook security alerts (`true`/`false`) |

---

## 🚀 Deployment

### Vercel (Primary)

The app is configured for Vercel deployment:
- **`vercel.json`**: Contains deployment configuration.
- **`.vercelignore`**: Excludes unnecessary files from deployment.
- **`.deploy_trigger`**: Used to trigger redeployments.
- **Standalone Output**: `output: 'standalone'` in `next.config.ts` enables Docker-compatible builds.

### Docker / Self-Hosting

The standalone output mode generates a minimal production server:
```bash
npm run build
# Output in .next/standalone/
node .next/standalone/server.js
```

### Post-Deployment Checklist

1. Ensure all environment variables are set.
2. Run database migrations in order.
3. Verify Supabase RLS policies are active.
4. Test push notification delivery.
5. Confirm service worker updates correctly.
6. Review security headers via browser DevTools.

---

## 📊 Testing

### End-to-End Tests (`testsprite_tests/`)
70 test files covering critical user flows:
- Authentication flows (login, logout, password change).
- Course navigation and content viewing.
- Quiz taking and submission.
- Admin operations (user management, content upload).
- Safety dashboard functionality.

### Quiz Parser Tests (`scripts/test-quiz-parser.ts` — 48KB)
Comprehensive test suite for the quiz parser covering:
- Markdown input from various AI models.
- LaTeX formula preservation.
- Edge cases (empty input, malformed HTML, mixed formats).
- Correct answer detection across all supported markers.

### Security Audit (`scripts/security-audit.ts` — 15KB)
Automated scanner checking for common vulnerabilities and security best practices.

---

*Last updated: February 2026*
