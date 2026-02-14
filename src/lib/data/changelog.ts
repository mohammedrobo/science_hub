export interface ChangeLogEntry {
    version: string; // internal only, not shown to students
    date: string;
    deployedAt?: string;
    title: string;
    changes: string[];
}

export const CHANGELOG: ChangeLogEntry[] = [
    {
        version: '2.5.0',
        date: '2026-02-14',
        deployedAt: '2026-02-14T12:00:00Z',
        title: '📊 My Progress Dashboard',
        changes: [
            '✨ New Progress Page — View your learning journey with interactive charts and detailed analytics.',
            '📉 Chart Options — Switch between Column, Pie, and Line charts to visualize your scores.',
            '🎯 Course Filtering — See overall progress or drill into a specific course.',
            '📖 Lesson Tracking — See which lessons you\'ve completed with dates for each course.',
            '🏆 Quiz Results — View all your quiz scores, grades, and trends over time.',
            '🌟 Profile Upgrade — Your profile now shows your top subject and overall completion at a glance.',
            '🚀 Navigation Update — Progress link added to the navbar with colorful icons for every section.',
        ]
    },
    {
        version: '2.4.0',
        date: '2026-02-10',
        title: '⚡ Performance & Bug Fixes',
        changes: [
            '🔒 Enhanced account security with better session management.',
            '⚡ Faster page loading with optimized database queries.',
            '🐛 Fixed various bugs reported by students.',
            '📱 Improved responsiveness on mobile devices.',
        ]
    },
    {
        version: '2.3.0',
        date: '2026-02-05',
        title: '🏰 Guild Hall & Team Quests',
        changes: [
            '🏰 Guild System — Join your section\'s guild and collaborate with teammates.',
            '⚔️ Quest Board — Track team quests with Active, Pending, and Done statuses.',
            '👑 Leader Dashboard — Section leaders can manage quests and track team progress.',
            '🎮 Gamification Improvements — Earn XP more fairly based on quiz performance.',
        ]
    },
    {
        version: '2.2.0',
        date: '2026-01-28',
        title: '📚 Course & Quiz Enhancements',
        changes: [
            '🎓 Lesson Locking — Score 50%+ on the quiz to unlock the next lesson.',
            '📝 Quiz Retakes — Retake quizzes to improve your high score.',
            '📈 GPA Calculator — Predict your GPA based on quiz performance.',
            '📱 Better Mobile Experience — Improved layout on phones and tablets.',
        ]
    },
    {
        version: '2.1.0',
        date: '2026-01-20',
        title: '🔔 Notifications & Schedule',
        changes: [
            '🔔 Push Notifications — Get notified about upcoming classes and deadlines.',
            '📅 Class Schedule — View your weekly timetable organized by section.',
            '📲 Install as App — Add Science Hub to your home screen for quick access.',
            '🌙 Dark Mode — Beautiful dark theme that\'s easy on your eyes.',
        ]
    },
    {
        version: '2.0.0',
        date: '2026-01-10',
        title: '🌟 Ranking System & Leaderboard',
        changes: [
            '🏆 Rank System — Climb from E-Rank to the legendary SSS-Rank by earning XP.',
            '🥇 Leaderboard — See how you stack up against your classmates.',
            '🖼️ Profile Pictures — Upload your own avatar.',
            '✨ XP Rewards — Earn XP for completing lessons and acing quizzes.',
        ]
    },
    {
        version: '1.0.0',
        date: '2025-12-15',
        title: '🚀 Science Hub Launch',
        changes: [
            '🚀 Science Hub is live! Welcome to your university learning platform.',
            '📚 Browse courses with video lessons and PDF materials.',
            '🧠 Take quizzes to test your knowledge.',
            '🔐 Secure login with your student account.',
        ]
    },
];

export const LATEST_VERSION = CHANGELOG[0].version;
