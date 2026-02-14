import { getDashboardData, getStudentsWithEngagement, getActivityLogs, getStudentReports, getAlerts } from './actions';
import { SafetyDashboardClient } from './_components/SafetyDashboardClient';
import { readSession } from '@/lib/auth/session-read';
import { redirect } from 'next/navigation';

export default async function SafetyDashboardPage() {
    // Safety is super_admin only — redirect others gracefully
    const session = await readSession();
    if (!session || session.role !== 'super_admin') {
        redirect('/admin');
    }

    // Fetch all initial data in parallel
    const [dashboardData, students, logsRes, reportsRes, alertsRes] = await Promise.all([
        getDashboardData(),
        getStudentsWithEngagement(),
        getActivityLogs(1, 50),
        getStudentReports(1, 50),
        getAlerts(1, 30),
    ]);

    return (
        <SafetyDashboardClient
            dashboardData={dashboardData}
            initialStudents={students}
            initialLogs={logsRes.logs || []}
            initialLogCount={logsRes.count || 0}
            initialReports={reportsRes.reports || []}
            initialAlerts={alertsRes.alerts || []}
        />
    );
}

