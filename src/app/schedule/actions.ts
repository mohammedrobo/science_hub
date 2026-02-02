'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/app/login/actions';
import { revalidatePath } from 'next/cache';
import scheduleData from '@/../secure_data/structured_schedules.json';

export interface ScheduleEntry {
    id?: string;
    section_id: string;
    day_of_week: string;
    slot_order: number;
    subject: string;
    class_type: string;
    room?: string;
    time_start?: string;
    time_end?: string;
}

// Get schedule for a specific section
export async function getSchedule(sectionId: string) {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('section_id', sectionId)
        .order('slot_order', { ascending: true });

    if (error) {
        console.error('Error fetching schedule:', error);
        // Fallback to JSON data
        return getScheduleFromJSON(sectionId);
    }

    // If database is empty, return JSON data
    if (!data || data.length === 0) {
        return getScheduleFromJSON(sectionId);
    }

    // Group by day
    const schedule: Record<string, ScheduleEntry[]> = {};
    for (const entry of data) {
        if (!schedule[entry.day_of_week]) {
            schedule[entry.day_of_week] = [];
        }
        schedule[entry.day_of_week].push(entry);
    }

    return schedule;
}

// Get schedule from JSON file (fallback)
function getScheduleFromJSON(sectionId: string) {
    const data = scheduleData as Record<string, Record<string, Array<{
        subject: string;
        type: string;
        room: string;
        time: string;
        slot: number;
    }>>>;

    const sectionData = data[sectionId];
    if (!sectionData) return {};

    const schedule: Record<string, ScheduleEntry[]> = {};

    for (const [day, entries] of Object.entries(sectionData)) {
        schedule[day] = entries.map(e => ({
            section_id: sectionId,
            day_of_week: day,
            slot_order: e.slot,
            subject: e.subject,
            class_type: e.type,
            room: e.room,
            time_start: e.time?.split(':')[0],
            time_end: e.time?.split(':')[1]
        }));
    }

    return schedule;
}

// Check if user is leader of a section
export async function isLeaderOfSection(sectionId: string): Promise<boolean> {
    const session = await getSession();
    if (!session?.username) return false;

    // Leader username format: [Group]_[Section]-[Number]-[ID]
    // e.g., "C_C2-36-4da3" is leader of section C2
    const username = session.username;
    const role = session.role;

    // Admins can edit any section
    if (role === 'admin') return true;

    // Leaders can only edit their own section
    if (role === 'leader') {
        // Extract section from username (e.g., "C_C2-36-4da3" -> "C2")
        const match = username.match(/^[A-D]_([A-D]\d)/i);
        if (match && match[1].toUpperCase() === sectionId.toUpperCase()) {
            return true;
        }
    }

    return false;
}

// Check if user can access (view) a section's schedule
export async function canAccessSection(sectionId: string): Promise<boolean> {
    const session = await getSession();
    if (!session?.username) return false;

    const role = session.role;

    // Admins can view any section
    if (role === 'admin') return true;

    // Extract user's section from username
    const match = session.username.match(/^[A-D]_([A-D]\d)/i);
    const userSection = match ? match[1].toUpperCase() : null;

    // Students and leaders can only view their own section
    return userSection === sectionId.toUpperCase();
}

// Update schedule entry (leaders only)
export async function updateScheduleEntry(entry: ScheduleEntry) {
    const session = await getSession();
    if (!session) return { error: 'Not authenticated' };

    // Check if user can edit this section
    const canEdit = await isLeaderOfSection(entry.section_id);
    if (!canEdit) {
        return { error: 'You do not have permission to edit this schedule' };
    }

    const supabase = await createServiceRoleClient();

    if (entry.id) {
        // Update existing
        const { error } = await supabase
            .from('schedule_entries')
            .update({
                subject: entry.subject,
                class_type: entry.class_type,
                room: entry.room,
                time_start: entry.time_start,
                time_end: entry.time_end,
                updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

        if (error) return { error: error.message };
    } else {
        // Insert new
        const { error } = await supabase
            .from('schedule_entries')
            .insert(entry);

        if (error) return { error: error.message };
    }

    revalidatePath(`/schedule/${entry.section_id}`);
    return { success: true };
}

// Get all sections
export async function getAllSections() {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('id');

    if (error || !data) {
        // Fallback to static list
        return [
            'A1', 'A2', 'A3', 'A4',
            'B1', 'B2', 'B3', 'B4',
            'C1', 'C2', 'C3', 'C4',
            'D1', 'D2', 'D3', 'D4'
        ].map(id => ({ id, name: `Section ${id}` }));
    }

    return data;
}

// Get current class info for notification
export async function getCurrentClass(sectionId: string) {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];
    const currentHour = now.getHours();

    const schedule = await getSchedule(sectionId);
    const todaySchedule = schedule[today] || [];

    // Find current or next class
    for (const entry of todaySchedule) {
        const startHour = parseInt(entry.time_start || '0');
        const endHour = parseInt(entry.time_end || '0');

        if (currentHour >= startHour && currentHour < endHour) {
            return { status: 'current', class: entry };
        }

        if (currentHour < startHour) {
            return { status: 'next', class: entry };
        }
    }

    return { status: 'none', class: null };
}
