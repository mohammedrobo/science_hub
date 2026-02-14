import { getDashboardData, getActivityLogs, getStudentReports, getAlerts } from './actions';
import { SafetyDashboardClient } from './_components/SafetyDashboardClient';
import { readSession } from '@/lib/auth/session-read';
import { redirect } from 'next/navigation';

export default async function SafetyDashboardPage() {
    // Safety is super_admin only — redirect others gracefully
    const session = await readSession();
    if (!session || session.role !== 'super_admin') {
        redirect('/admin');
    }

    // Fetch all initial data in parallel — students come from dashboardData (single fetch)
    const [dashboardData, logsRes, reportsRes, alertsRes] = await Promise.all([
        getDashboardData(),
        getActivityLogs(1, 50),
        getStudentReports(1, 50),
        getAlerts(1, 30),
    ]);

    return (
        <SafetyDashboardClient
            dashboardData={dashboardData}
            initialStudents={dashboardData.allStudents}
            initialLogs={logsRes.logs || []}
            initialLogCount={logsRes.count || 0}
            initialReports={reportsRes.reports || []}
            initialAlerts={alertsRes.alerts || []}
        />
    );
}

