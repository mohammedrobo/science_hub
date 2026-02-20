# Science Hub

**Science Hub** is a comprehensive digital learning companion designed specifically for first-year science students. It provides a centralized platform for accessing course materials, video lectures, and interactive assessments, enhanced with AI-powered assistance and gamification elements to boost student engagement and performance.

## 🚀 Features

### 📚 Course Management
*   **Semester Organization:** Content is structured by academic terms (Term 1 & Term 2).
*   **Course Modules:** Dedicated sections for each subject (e.g., Chemistry, Math, Physics).
*   **Lesson Content:** Organized chapters containing video lectures and downloadable PDF notes.

### 🧠 Interactive Learning
*   **Quizzes:** Chapter-specific quizzes to test understanding.
    *   Supports Multiple Choice, True/False, and Fill-in-the-Blank questions.
    *   Immediate feedback with explanations.
*   **Progress Tracking:** Visual indicators of course and lesson completion rates.

### 🛠️ Academic Tools
*   **GPA Calculator:** specific tool for students to calculate and project their Grade Point Average.
*   **Class Reminders:** Push notifications sent 15 and 5 minutes before scheduled classes.

### 🎮 Gamification & Community
*   **Leaderboards:** Track performance against peers.
*   **Guilds:** (Inferred) System for student groups or teams.
*   **XP System:** Earn experience points for completing lessons and quizzes.

### ⚙️ Admin & System
*   **Admin Dashboard:** Tools for managing content and users.
*   **Feedback System:** Built-in mechanism for users to report bugs or request features.
*   **Authentication:** Secure user login and management via Supabase Auth.

## 🛠️ Tech Stack

### Frontend
*   **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
*   **Library:** [React 19](https://react.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:**
    *   [Tailwind CSS v4](https://tailwindcss.com/)
    *   [Framer Motion](https://www.framer.com/motion/) (Animations)
    *   [Radix UI](https://www.radix-ui.com/) (Headless UI primitives)
    *   [Lucide React](https://lucide.dev/) (Icons)
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
*   **Forms:** React Hook Form + Zod validation

### Backend & Infrastructure
*   **BaaS:** [Supabase](https://supabase.com/)
    *   **Database:** PostgreSQL
    *   **Auth:** Supabase Auth
    *   **Storage:** Supabase Storage (for PDFs/Assets)
*   **Caching/Rate Limiting:** Upstash Redis
*   **Deployment:** [Vercel](https://vercel.com/)

## 📂 Project Structure

```
/
├── components/         # React components (UI, features, shared)
├── database/           # SQL migrations and schema definitions
├── public/             # Static assets (images, PDFs, icons)
├── scripts/            # Utility scripts (seeding, maintenance)
├── src/
│   ├── app/            # Next.js App Router pages and layouts
│   ├── features/       # Feature-specific logic (AI, GPA calc)
│   ├── lib/            # Utilities, constants, API clients
│   ├── stores/         # Global state stores (Zustand)
│   └── types/          # TypeScript type definitions
├── supabase/           # Supabase specific configurations
└── testsprite_tests/   # E2E/Integration tests (Python)
```

## ⚡ Getting Started

### Prerequisites
*   Node.js (LTS version recommended)
*   npm, yarn, pnpm, or bun

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd science_hub
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory and add the necessary environment variables (Supabase keys, etc.).

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the app.

### Building for Production

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```
