'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, Loader2, CheckCheck } from 'lucide-react';
import { acknowledgeAlert, dismissAllAlerts } from '../actions';
import { toast } from 'sonner';
import Link from 'next/link';

interface Alert {
    id: string;
    student_username: string | null;
    alert_type: string;
    severity: string;
    title: string;
    description: string | null;
    is_acknowledged: boolean;
    created_at: string;
}

interface AlertsPanelProps {
    initialAlerts: Alert[];
    compact?: boolean;
}

export function AlertsPanel({ initialAlerts, compact = false }: AlertsPanelProps) {
    const [alerts, setAlerts] = useState(initialAlerts);
    const [dismissing, setDismissing] = useState<string | null>(null);
    const [dismissingAll, setDismissingAll] = useState(false);

    const handleAcknowledge = async (alertId: string) => {
        setDismissing(alertId);
        const res = await acknowledgeAlert(alertId);
        if (res.error) {
            toast.error(res.error);
        } else {
            setAlerts(prev => prev.filter(a => a.id !== alertId));
            toast.success('Alert acknowledged');
        }
        setDismissing(null);
    };

    const handleDismissAll = async () => {
        setDismissingAll(true);
        const res = await dismissAllAlerts();
        if (res.error) {
            toast.error(res.error);
        } else {
            setAlerts([]);
            toast.success('All alerts dismissed');
        }
        setDismissingAll(false);
    };

    const getAlertIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <ShieldAlert className="h-4 w-4 text-red-400" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
            default: return <Info className="h-4 w-4 text-blue-400" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'border-red-500/30 bg-red-500/5';
            case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
            default: return 'border-blue-500/30 bg-blue-500/5';
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const displayAlerts = compact ? alerts.slice(0, 5) : alerts;

    if (alerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500/50" />
                <p className="text-sm">No active alerts</p>
                <p className="text-xs">All clear — system is healthy</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {!compact && alerts.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismissAll}
                        disabled={dismissingAll}
                        className="text-xs text-zinc-400 hover:text-white h-7"
                    >
                        {dismissingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCheck className="h-3 w-3 mr-1" />}
                        Dismiss All
                    </Button>
                </div>
            )}

            {displayAlerts.map((alert) => (
                <Card
                    key={alert.id}
                    className={`border ${getSeverityColor(alert.severity)} transition-all hover:border-zinc-700`}
                >
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">{getAlertIcon(alert.severity)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-zinc-200">{alert.title}</span>
                                    <Badge variant="outline" className={`text-[9px] px-1.5 h-4 ${
                                        alert.severity === 'critical' ? 'border-red-500/30 text-red-400' :
                                        alert.severity === 'warning' ? 'border-yellow-500/30 text-yellow-400' :
                                        'border-blue-500/30 text-blue-400'
                                    }`}>
                                        {alert.severity}
                                    </Badge>
                                </div>
                                {alert.description && (
                                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{alert.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] text-zinc-600">{timeAgo(alert.created_at)}</span>
                                    {alert.student_username && (
                                        <Link
                                            href={`/admin/safety/student/${alert.student_username}`}
                                            className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                                        >
                                            View Student →
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={dismissing === alert.id}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-emerald-400 shrink-0"
                            >
                                {dismissing === alert.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {compact && alerts.length > 5 && (
                <p className="text-xs text-center text-zinc-500">
                    +{alerts.length - 5} more alerts
                </p>
            )}
        </div>
    );
}
