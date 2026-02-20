# Science Hub - Project Documentation

**Science Hub** is a robust digital learning platform tailored for first-year science students. It integrates course management, interactive assessments, AI assistance, and gamification to enhance the educational experience.

## 🏗️ Architecture & Tech Stack

The project is built as a modern web application using the Next.js framework with a Supabase backend.

### **Frontend**
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **UI Library:** React 19
*   **Styling:** Tailwind CSS v4, Framer Motion (animations), Lucide React (icons)
*   **State Management:** Zustand (global stores located in `src/stores`)
*   **Forms:** React Hook Form + Zod validation

### **Backend (BaaS)**
*   **Platform:** Supabase
*   **Database:** PostgreSQL
*   **Authentication:** Supabase Auth
*   **Storage:** Supabase Storage (for lecture notes, PDFs)
*   **Serverless Logic:** Next.js Server Actions & API Routes

### **Services**
*   **Caching/Rate Limiting:** Upstash Redis
*   **Deployment:** Vercel

---

## 📂 Project Structure

Verified directory structure and key components:

```
/
├── .env.local             # Environment variables (API keys, secrets)
├── components/            # Shared UI components
├── database/              # SQL schemas and migration scripts
├── public/                # Static assets (images, PDFs, icons)
├── scripts/               # Maintenance and seeding scripts
├── src/
│   ├── app/               # Next.js App Router (pages, layouts)
│   ├── components/        # Application-specific components
│   ├── features/          # Feature-specific business logic (AI, etc.)
│   ├── lib/               # Utilities, database clients, helpers
│   ├── stores/            # Zustand state stores
│   └── types/             # TypeScript type definitions
├── supabase/              # Supabase configuration
└── testsprite_tests/      # End-to-end tests
```

---

## 🗄️ Database Schema

The database is structured around several core domains, defined in the `database/` directory:

### **User Management**
*   `users`: Core user profiles.
*   `allowed_users`: Whitelist or permission management.
*   `onboarding`: Tracking user onboarding status.

### **Content & Learning**
*   `lessons`, `content`: Structure for courses, chapters, and lectures.
*   `quizzes`: Assessment data.
*   `session_tracking`: Logging user study sessions.

### **Gamification & Community**
*   `gamification`: XP, levels, and achievements.
*   `leaderboard`: Rankings based on student performance.
*   `guilds`: Team-based grouping for students.
*   `feedback`: User feedback submission system.

### **System & Security**
*   `notifications`: System and push notifications.
*   `push_subscriptions`: Web push subscription endpoints.
*   `security_logs`: Audit trails for sensitive actions.
*   `storage_policy`: RLS policies for file storage.

---

## 🚀 Key Features

### 1. **Course Management**
Organizes content by Term > Subject > Chapter > Lesson. specific supports for video lectures and PDF notes.

### 2. **Interactive Quizzes**
Chapter-specific assessments with various question types (MCQ, True/False) providing immediate feedback and explanations.

### 3. **Gamification System**
*   **XP & Leveling:** Students earn experience for completing tasks.
*   **Leaderboards:** Competitive tracking.
*   **Guilds:** Social groups for collaborative learning.

### 4. **Admin Dashboard**
Comprehensive tools for content creators and administrators to manage users, upload lessons, and view system analytics.

### 6. **Student Tools**
*   **GPA Calculator:** Utility for grade projection.
*   **Class Schedule:** Personalized schedules with push notification reminders.

---

## ⚡ Getting Started

### Prerequisites
*   Node.js (LTS)
*   npm, yarn, pnpm, or bun

### Installation

1.  **Clone & Install:**
    ```bash
    git clone <repo-url>
    cd science_hub
    npm install
    ```

2.  **Environment Setup:**
    Create `.env.local` with required keys:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY`
    *   `GOOGLE_GENERATIVE_AI_API_KEY`
    *   `UPSTASH_REDIS_REST_URL` & `TOKEN`

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Access via `http://localhost:3000`.

### Production Build
```bash
npm run build
npm start
```
