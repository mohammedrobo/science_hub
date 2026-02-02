/**
 * Security Monitoring & Audit Logging
 * 
 * Features:
 * - Logs security events to database
 * - Optional Discord/Slack webhook alerts
 * - Rate limit breach notifications
 * - Login failure tracking
 * - Admin action auditing
 * 
 * Setup for alerts:
 * Add to .env.local:
 *   SECURITY_WEBHOOK_URL=https://discord.com/api/webhooks/xxx (or Slack)
 *   SECURITY_ALERT_ENABLED=true
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

export type SecurityEventType = 
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SESSION_INVALIDATED'
    | 'ADMIN_ACTION'
    | 'UNAUTHORIZED_ACCESS'
    | 'SUSPICIOUS_ACTIVITY';

export interface SecurityEvent {
    type: SecurityEventType;
    username?: string;
    ip?: string;
    userAgent?: string;
    details?: string;
    metadata?: Record<string, any>;
}

interface SecurityLogEntry extends SecurityEvent {
    id?: string;
    timestamp: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// Determine severity based on event type
function getSeverity(type: SecurityEventType): 'INFO' | 'WARNING' | 'CRITICAL' {
    switch (type) {
        case 'LOGIN_SUCCESS':
        case 'LOGOUT':
        case 'PASSWORD_CHANGED':
            return 'INFO';
        case 'LOGIN_FAILED':
        case 'SESSION_INVALIDATED':
        case 'ADMIN_ACTION':
            return 'WARNING';
        case 'RATE_LIMIT_EXCEEDED':
        case 'UNAUTHORIZED_ACCESS':
        case 'SUSPICIOUS_ACTIVITY':
        case 'PASSWORD_RESET':
            return 'CRITICAL';
        default:
            return 'INFO';
    }
}

// In-memory buffer for batch logging (reduces DB writes)
const logBuffer: SecurityLogEntry[] = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

let flushTimer: NodeJS.Timeout | null = null;

/**
 * Log a security event
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
    const entry: SecurityLogEntry = {
        ...event,
        timestamp: new Date().toISOString(),
        severity: getSeverity(event.type)
    };

    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
        const emoji = {
            INFO: 'ℹ️',
            WARNING: '⚠️',
            CRITICAL: '🚨'
        }[entry.severity];
        console.log(`${emoji} [Security] ${entry.type}: ${entry.username || 'anonymous'} - ${entry.details || ''}`);
    }

    // Add to buffer
    logBuffer.push(entry);

    // Immediate flush for critical events
    if (entry.severity === 'CRITICAL') {
        await flushLogs();
        await sendAlert(entry);
    } else if (logBuffer.length >= BUFFER_SIZE) {
        await flushLogs();
    } else if (!flushTimer) {
        // Schedule flush
        flushTimer = setTimeout(async () => {
            await flushLogs();
            flushTimer = null;
        }, FLUSH_INTERVAL);
    }
}

/**
 * Flush log buffer to database
 */
async function flushLogs(): Promise<void> {
    if (logBuffer.length === 0) return;

    const logsToWrite = [...logBuffer];
    logBuffer.length = 0; // Clear buffer

    try {
        const supabase = await createServiceRoleClient();
        
        // Check if table exists first
        const { error: checkError } = await supabase
            .from('security_logs')
            .select('id')
            .limit(1);

        if (checkError?.message?.includes('does not exist')) {
            // Table doesn't exist, skip DB logging
            console.warn('[Security] security_logs table not found. Run migration to enable DB logging.');
            return;
        }

        const { error } = await supabase
            .from('security_logs')
            .insert(logsToWrite.map(log => ({
                event_type: log.type,
                username: log.username,
                ip_address: log.ip,
                user_agent: log.userAgent,
                details: log.details,
                metadata: log.metadata,
                severity: log.severity,
                created_at: log.timestamp
            })));

        if (error) {
            console.error('[Security] Failed to write logs to DB:', error);
        }
    } catch (error) {
        console.error('[Security] Error flushing logs:', error);
    }
}

/**
 * Send webhook alert for critical events
 */
async function sendAlert(event: SecurityLogEntry): Promise<void> {
    const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
    const alertsEnabled = process.env.SECURITY_ALERT_ENABLED === 'true';

    if (!webhookUrl || !alertsEnabled) return;

    try {
        const message = {
            // Discord-compatible format (also works with many Slack webhooks)
            embeds: [{
                title: `🚨 Security Alert: ${event.type}`,
                color: 0xFF0000, // Red
                fields: [
                    { name: 'User', value: event.username || 'N/A', inline: true },
                    { name: 'IP', value: event.ip || 'N/A', inline: true },
                    { name: 'Severity', value: event.severity, inline: true },
                    { name: 'Details', value: event.details || 'No details', inline: false },
                    { name: 'Time', value: event.timestamp, inline: false }
                ],
                footer: { text: 'Science Hub Security Monitor' }
            }]
        };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
    } catch (error) {
        console.error('[Security] Failed to send webhook alert:', error);
    }
}

/**
 * Log admin action (for audit trail)
 */
export async function logAdminAction(
    adminUsername: string,
    action: string,
    targetResource: string,
    details?: string
): Promise<void> {
    await logSecurityEvent({
        type: 'ADMIN_ACTION',
        username: adminUsername,
        details: `${action} on ${targetResource}${details ? `: ${details}` : ''}`,
        metadata: { action, targetResource }
    });
}

/**
 * Get recent security events (for admin dashboard)
 */
export async function getSecurityLogs(options: {
    limit?: number;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    eventType?: SecurityEventType;
    username?: string;
    since?: Date;
} = {}): Promise<SecurityLogEntry[]> {
    try {
        const supabase = await createServiceRoleClient();
        
        let query = supabase
            .from('security_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(options.limit || 100);

        if (options.severity) {
            query = query.eq('severity', options.severity);
        }
        if (options.eventType) {
            query = query.eq('event_type', options.eventType);
        }
        if (options.username) {
            query = query.eq('username', options.username);
        }
        if (options.since) {
            query = query.gte('created_at', options.since.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Security] Failed to fetch logs:', error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            type: row.event_type as SecurityEventType,
            username: row.username,
            ip: row.ip_address,
            userAgent: row.user_agent,
            details: row.details,
            metadata: row.metadata,
            timestamp: row.created_at,
            severity: row.severity
        }));
    } catch (error) {
        console.error('[Security] Error fetching logs:', error);
        return [];
    }
}

/**
 * Get security stats (for monitoring dashboard)
 */
export async function getSecurityStats(hours: number = 24): Promise<{
    totalEvents: number;
    loginFailures: number;
    rateLimitHits: number;
    criticalEvents: number;
}> {
    try {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const supabase = await createServiceRoleClient();

        const { data, error } = await supabase
            .from('security_logs')
            .select('event_type, severity')
            .gte('created_at', since.toISOString());

        if (error || !data) {
            return { totalEvents: 0, loginFailures: 0, rateLimitHits: 0, criticalEvents: 0 };
        }

        return {
            totalEvents: data.length,
            loginFailures: data.filter(e => e.event_type === 'LOGIN_FAILED').length,
            rateLimitHits: data.filter(e => e.event_type === 'RATE_LIMIT_EXCEEDED').length,
            criticalEvents: data.filter(e => e.severity === 'CRITICAL').length
        };
    } catch (error) {
        return { totalEvents: 0, loginFailures: 0, rateLimitHits: 0, criticalEvents: 0 };
    }
}
