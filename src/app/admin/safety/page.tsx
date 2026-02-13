import { getActivityLogs, getStudentReports, getSafetyStats } from './actions';
import { SafetyStats } from './_components/SafetyStats';
import { ReportsTable } from './_components/ReportsTable';
import { ActivityLogsTable } from './_components/ActivityLogsTable';
import { WatchlistTable } from './_components/WatchlistTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield } from 'lucide-react';

export default async function SafetyDashboardPage() {
    // Fetch all data in parallel
    const [statsRes, logsRes, reportsRes] = await Promise.all([
        getSafetyStats(),
        getActivityLogs(1, 100), // Initial load 100 logs
        getStudentReports(1, 100) // Initial load 100 reports
    ]);

    const stats = statsRes.stats || { totalReports: 0, openReports: 0, totalLogs: 0 };
    const chartData = statsRes.chartData || [];
    const logs = logsRes.logs || [];
    const reports = reportsRes.reports || [];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="w-8 h-8 text-emerald-400" />
                Safety & Monitoring Center
            </h1>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-zinc-900 border-zinc-800 p-1 overflow-x-auto justify-start w-full sm:w-auto flex-nowrap">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="reports">
                        Reports
                        {stats.openReports > 0 && (
                            <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                                {stats.openReports}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="activity">Live Activity</TabsTrigger>
                    <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <SafetyStats stats={stats} chartData={chartData} />
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                    <ReportsTable initialReports={reports} />
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                    <ActivityLogsTable initialLogs={logs} initialCount={logsRes.count || 0} />
                </TabsContent>

                <TabsContent value="watchlist" className="space-y-4">
                    <WatchlistTable />
                </TabsContent>
            </Tabs>
        </div>
    );
}

