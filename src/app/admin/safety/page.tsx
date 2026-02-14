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
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
                    Safety & Monitoring
                </h1>
                <p className="text-sm text-zinc-500 mt-1 hidden sm:block">Monitor student activity, reports, and system health</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                    <TabsList className="bg-zinc-900 border border-zinc-800 p-1 w-max sm:w-auto flex">
                        <TabsTrigger value="overview" className="text-xs sm:text-sm px-3 sm:px-4">Overview</TabsTrigger>
                        <TabsTrigger value="reports" className="text-xs sm:text-sm px-3 sm:px-4">
                            Reports
                            {stats.openReports > 0 && (
                                <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
                                    {stats.openReports}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="text-xs sm:text-sm px-3 sm:px-4">Activity</TabsTrigger>
                        <TabsTrigger value="watchlist" className="text-xs sm:text-sm px-3 sm:px-4">Watchlist</TabsTrigger>
                    </TabsList>
                </div>

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

