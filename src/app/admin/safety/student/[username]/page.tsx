import { getStudentProfile, getStudentSessionHistory, getStudentSecurityLog, getStudentAcademicProgress, getStudentChatHistory } from '../../actions';
import { redirect } from 'next/navigation';
import { StudentDetailClient } from './StudentDetailClient';
import { readSession } from '@/lib/auth/session-read';

interface Props {
    params: Promise<{ username: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
    // Safety is super_admin only
    const session = await readSession();
    if (!session || session.role !== 'super_admin') {
        redirect('/admin');
    }

    const { username } = await params;

    // Parallel fetch all data — wrap each in try/catch so one failure doesn't crash the page
    const [data, sessions, security, academic, chats] = await Promise.all([
        getStudentProfile(username).catch(e => { console.error('Profile error:', e); return { error: 'Failed' }; }),
        getStudentSessionHistory(username).catch(e => { console.error('Session history error:', e); return []; }),
        getStudentSecurityLog(username).catch(e => {
            console.error('Security log error:', e);
            return { logs: [], summary: { uniqueIps: [], uniqueDevices: [], failedLogins: 0, totalLogins: 0, ipCount: 0, deviceCount: 0 } };
        }),
        getStudentAcademicProgress(username).catch(e => {
            console.error('Academic progress error:', e);
            return { progress: [], quizzes: [], stats: { total_xp: 0, current_rank: 'E', quizzes_taken: 0 }, gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }, totalLessonsCompleted: 0, totalQuizzes: 0, averageQuizScore: 0 };
        }),
        getStudentChatHistory(username).catch(e => { console.error('Chat history error:', e); return []; }),
    ]);

    if ('error' in data || !data.profile) {
        redirect('/admin/safety');
    }

    // Ensure arrays are always arrays (not error objects)
    const safeSessionHistory = Array.isArray(sessions) ? sessions : [];
    const safeChatHistory = Array.isArray(chats) ? chats : [];
    const safeSecurityData = security && 'logs' in security ? security : {
        logs: [], summary: { uniqueIps: [], uniqueDevices: [], failedLogins: 0, totalLogins: 0, ipCount: 0, deviceCount: 0 }
    };
    const safeAcademicData = academic && 'progress' in academic ? academic : {
        progress: [], quizzes: [], stats: { total_xp: 0, current_rank: 'E', quizzes_taken: 0 },
        gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }, totalLessonsCompleted: 0, totalQuizzes: 0, averageQuizScore: 0
    };

    return (
        <StudentDetailClient
            data={data}
            username={username}
            sessionHistory={safeSessionHistory}
            securityData={safeSecurityData}
            academicData={safeAcademicData}
            chatHistory={safeChatHistory}
        />
    );
}
