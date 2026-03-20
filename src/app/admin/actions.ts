'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session-read';
import { revalidatePath, updateTag } from 'next/cache';
import { hashPassword } from '@/lib/auth/password';
import fs from 'node:fs/promises';
import path from 'node:path';

// Super admin = full power (old admin). New admin = limited admin.
async function ensureSuperAdmin() {
    const session = await readSession();
    if (session?.role !== 'super_admin') {
        throw new Error('Unauthorized: Super Admin access required');
    }
    return session;
}

// Allow super_admin or admin
async function ensureAnyAdmin() {
    const session = await readSession();
    if (!session?.role || !['super_admin', 'admin'].includes(session.role)) {
        throw new Error('Unauthorized: Admin access required');
    }
    return session;
}

// Allow super_admin, admin, and leader roles for CMS operations
async function ensureLeaderOrAdmin() {
    const session = await readSession();
    if (!session?.role || !['super_admin', 'admin', 'leader'].includes(session.role)) {
        throw new Error('Unauthorized: Leader or Admin access required');
    }
    return session;
}



// ============ CMS OPERATIONS ============

import { MOCK_COURSES } from '@/lib/data/mocks';

const DEFAULT_RESET_PASSWORD = 'student123';

interface AccessKeyRecord {
    username?: string;
    password?: string;
}

const ACCESS_KEYS_CANDIDATE_PATHS = [
    path.join(process.cwd(), 'secure_data', 'access_keys.json'),
    path.join(process.cwd(), 'secure_data', 'acces_keys.json'),
    '/home/satoru/projects/science_hub/secure_data/access_keys.json',
    '/home/satoru/projects/science_hub/secure_data/acces_keys.json',
    path.join(process.cwd(), '..', 'secure_data', 'access_keys.json'),
    path.join(process.cwd(), '..', 'secure_data', 'acces_keys.json'),
];

const normalizeUsername = (value: string) => (
    value ? value.trim().toLowerCase().normalize('NFKC') : ''
);

async function loadAccessKeyRecords(): Promise<AccessKeyRecord[]> {
    for (const candidatePath of Array.from(new Set(ACCESS_KEYS_CANDIDATE_PATHS))) {
        try {
            const raw = await fs.readFile(candidatePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed as AccessKeyRecord[];
            }
            console.error(`[AccessKeys] Expected an array in ${candidatePath}`);
        } catch (error: unknown) {
            const errorCode = (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                typeof (error as { code?: unknown }).code === 'string'
            ) ? (error as { code: string }).code : undefined;

            if (errorCode !== 'ENOENT') {
                console.error(`[AccessKeys] Failed reading ${candidatePath}:`, error);
            }
        }
    }

    return [];
}

async function loadAccessPasswordMap(): Promise<Record<string, string>> {
    const keys = await loadAccessKeyRecords();
    const passwordMap: Record<string, string> = {};

    for (const key of keys) {
        const normalized = normalizeUsername(key.username || '');
        const password = typeof key.password === 'string' ? key.password.trim() : '';
        if (normalized && password) {
            passwordMap[normalized] = password;
        }
    }

    return passwordMap;
}

function getOriginalPasswordForUsername(username: string, passwordMap: Record<string, string>): string {
    return passwordMap[normalizeUsername(username)] || DEFAULT_RESET_PASSWORD;
}

// Helper to extract storage path from Supabase public URL
function extractStoragePath(url: string, bucket: string = 'pdfs'): string | null {
    try {
        if (!url || !url.includes(`/storage/v1/object/public/${bucket}/`)) return null;
        const parts = url.split(`/storage/v1/object/public/${bucket}/`);
        if (parts.length > 1) {
            return parts[1];
        }
        return null;
    } catch {
        return null;
    }
}

// ... existing code ...

export async function createLesson(data: {
    course_id: string;
    title: string;
    video_url?: string;
    video_parts?: { title: string; url: string }[];
    pdf_url?: string;
    pdf_parts?: { title: string; url: string }[];
    instructor?: string;
    section?: string;
    quiz_data?: {
        title: string;
        questions: {
            id?: number;
            text: string;
            options: string[];
            correctAnswerIndex: number;
            type?: 'mcq' | 'true_false' | 'fill_blank';
        }[];
    };
}) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        // Resolve Course ID (Handle 'm102' -> UUID lookup)
        let courseId = data.course_id;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);

        if (!isUuid) {
            // It's a mock ID (e.g. 'm102'), find the corresponding code (e.g. 'MATH 102')
            const mockCourse = MOCK_COURSES.find(c => c.id === courseId);
            if (mockCourse) {
                // Find the real course in DB by code
                const { data: dbCourse, error: courseError } = await supabase
                    .from('courses')
                    .select('id')
                    .eq('code', mockCourse.code)
                    .single();

                // If not found, check if it matches the code directly (fallback)
                if (courseError || !dbCourse) {
                    // Try case-insensitive or partial match if needed
                    console.error(`Course lookup failed for code ${mockCourse.code}:`, courseError);
                    throw new Error(`Course not found in database for ID: ${courseId} (Code: ${mockCourse.code})`);
                }
                courseId = dbCourse.id;
            } else {
                throw new Error(`Invalid course ID format and not found in mock constants: ${courseId}`);
            }
        }

        // Get the next order_index for this course
        const { data: existingLessons } = await supabase
            .from('lessons')
            .select('order_index')
            .eq('course_id', courseId)
            .order('order_index', { ascending: false })
            .limit(1);

        const nextOrderIndex = existingLessons && existingLessons.length > 0
            ? (existingLessons[0].order_index || 0) + 1
            : 0;

        // 1. Create Quiz (if data provided)
        let quizId: string | null = null;
        if (data.quiz_data) {
            const { data: quiz, error: quizError } = await supabase
                .from('quizzes')
                .insert({
                    course_id: courseId, // Use resolved UUID
                    title: data.quiz_data.title
                })
                .select()
                .single();

            if (quizError) throw new Error('Failed to create quiz: ' + quizError.message);
            quizId = quiz.id;

            // 2. Add Questions
            const createdQuizId = quiz.id; // capture for closure
            // Filter out questions with out-of-bounds or missing answers
            const validQuestions = data.quiz_data.questions.filter(q =>
                q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length
            );
            const questionsPayload = validQuestions.map((q, idx) => {
                const inferredTF = q.options.length === 2 &&
                    q.options.map(o => o.toLowerCase().trim()).sort().join(',') === 'false,true';
                const qType = q.type || (inferredTF ? 'true_false' : 'mcq');
                return {
                    quiz_id: createdQuizId,
                    text: q.text,
                    type: qType,
                    options: q.options,
                    correct_answer: q.options[q.correctAnswerIndex],
                    order_index: idx
                };
            });

            const { error: questionsError } = await supabase
                .from('questions')
                .insert(questionsPayload);

            if (questionsError) throw new Error('Failed to save questions: ' + questionsError.message);
        }

        // 3. Create Lesson
        const { error } = await supabase
            .from('lessons')
            .insert({
                course_id: courseId, // Use resolved UUID
                title: data.title,
                video_url: data.video_url || null,
                video_parts: data.video_parts && data.video_parts.length > 0 ? data.video_parts : [],
                pdf_url: data.pdf_url || null,
                pdf_parts: data.pdf_parts && data.pdf_parts.length > 0 ? data.pdf_parts : [],
                instructor: data.instructor || null,
                section: data.section || null,
                quiz_id: quizId,
                order_index: nextOrderIndex
            });

        if (error) {
            console.error('Create lesson error:', error);
            return { error: 'Failed to create lesson: ' + error.message };
        }

        revalidatePath('/admin/upload');
        updateTag('lessons');
        return { success: true, message: `Lesson "${data.title}" created successfully!` };
    } catch (e: any) {
        console.error('Create lesson crash:', e);
        return { error: e.message || 'Unexpected server error' };
    }
}

/**
 * Uploads a file to Supabase Storage using the Service Role (Server-Side)
 * This avoids client-side "Authorization header missing" or CORS issues.
 */
export async function getSignedUploadUrl(path: string) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        const { data, error } = await supabase.storage
            .from('pdfs')
            .createSignedUploadUrl(path);

        if (error) throw error;
        if (!data) throw new Error('No data returned from signed URL creation');

        return { success: true, token: data.token, path: data.path, signedUrl: data.signedUrl };
    } catch (error: any) {
        console.error('Get Signed URL Error:', error);
        return { error: error.message };
    }
}

// ============ USER MANAGEMENT ============

export async function updateStudentName(username: string, newName: string) {
    try {
        const session = await ensureAnyAdmin();
        const supabase = await createServiceRoleClient();

        if (session.role !== 'super_admin') {
            const { data: target } = await supabase
                .from('allowed_users')
                .select('access_role')
                .eq('username', username)
                .single();
            if (target && (target.access_role === 'admin' || target.access_role === 'super_admin')) {
                return { error: 'Only Super Admins can modify admin accounts' };
            }
        }

        const trimmed = newName.trim();
        if (!trimmed || trimmed.length < 3) {
            return { error: 'Name must be at least 3 characters' };
        }

        const { error } = await supabase
            .from('allowed_users')
            .update({ full_name: trimmed })
            .eq('username', username);

        if (error) {
            console.error('Update Name Error:', error);
            return { error: 'Failed to update name' };
        }

        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Unexpected server error' };
    }
}


export async function deleteUser(username: string) {
    try {
        const session = await ensureAnyAdmin();
        const supabase = await createServiceRoleClient();

        // Non-super admins can only delete students/leaders
        if (session.role !== 'super_admin') {
            const { data: target } = await supabase
                .from('allowed_users')
                .select('access_role')
                .eq('username', username)
                .single();
            if (target && (target.access_role === 'admin' || target.access_role === 'super_admin')) {
                return { error: 'Only Super Admins can delete admin accounts' };
            }
        }

        // 1. Clean up Guild Data (Avoids FK violations or orphaned data)
        await supabase.from('guild_messages').delete().eq('sender_username', username);
        await supabase.from('guild_quests').delete().eq('created_by', username);
        await supabase.from('guild_quests').update({ assigned_to: null, status: 'pending' }).eq('assigned_to', username);

        // 2. allowed_users deletion will CASCADE to user_stats and user_progress (if configured)
        // But let's be safe and try to delete them if needed, though usually tables like user_stats have FK cascade.
        // The main blockers are usually the new tables.

        const { error } = await supabase
            .from('allowed_users')
            .delete()
            .eq('username', username);

        if (error) {
            console.error('Delete User Error:', error);
            return { error: 'Failed to delete user' };
        }

        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        console.error('Delete Action Crash:', e);
        return { error: e.message || 'Unexpected server error' };
    }
}

export async function resetUserProgress(username: string) {
    const session = await ensureAnyAdmin();
    const supabase = await createServiceRoleClient();

    if (session.role !== 'super_admin') {
        const { data: target } = await supabase
            .from('allowed_users')
            .select('access_role')
            .eq('username', username)
            .single();
        if (target && (target.access_role === 'admin' || target.access_role === 'super_admin')) {
            return { error: 'Only Super Admins can modify admin accounts' };
        }
    }

    // 1. Wipe all progress entries (lessons + quizzes)
    const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('username', username);

    if (progressError) return { error: 'Failed to clear progress' };

    // 2. Reset stats completely (XP, rank, GPA)
    const { error: statsError } = await supabase
        .from('user_stats')
        .update({ total_xp: 0, current_rank: 'E', gpa_term_1: null })
        .eq('username', username);

    if (statsError) return { error: 'Failed to reset stats' };

    revalidatePath('/admin');
    revalidatePath('/progress');
    revalidatePath('/');
    return { success: true };
}

export async function removeProfilePicture(username: string) {
    const session = await ensureAnyAdmin();
    const supabase = await createServiceRoleClient();

    if (session.role !== 'super_admin') {
        const { data: target } = await supabase
            .from('allowed_users')
            .select('access_role')
            .eq('username', username)
            .single();
        if (target && (target.access_role === 'admin' || target.access_role === 'super_admin')) {
            return { error: 'Only Super Admins can modify admin accounts' };
        }
    }

    const { error } = await supabase
        .from('user_stats')
        .update({ profile_picture_url: null })
        .eq('username', username);

    if (error) return { error: 'Failed to remove picture' };

    revalidatePath('/admin');
    return { success: true };
}

/**
 * Reset Password Only — resets to original password from access_keys.json
 * or falls back to 'student123'. Forces password change on next login.
 */
export async function resetUserPassword(username: string) {
    try {
        const session = await ensureAnyAdmin();
        const supabase = await createServiceRoleClient();

        if (session.role !== 'super_admin') {
            const { data: target } = await supabase
                .from('allowed_users')
                .select('access_role')
                .eq('username', username)
                .single();
            if (target && (target.access_role === 'admin' || target.access_role === 'super_admin')) {
                return { error: 'Only Super Admins can modify admin accounts' };
            }
        }

        const passwordMap = await loadAccessPasswordMap();
        const originalPassword = getOriginalPasswordForUsername(username, passwordMap);
        const hashedPassword = await hashPassword(originalPassword);

        const { error } = await supabase
            .from('allowed_users')
            .update({
                password: hashedPassword,
                is_first_login: true,
            })
            .eq('username', username);

        if (error) {
            console.error('Reset Password Error:', error);
            return { error: 'Failed to reset password' };
        }

        revalidatePath('/admin');
        return { success: true };
    } catch (error: unknown) {
        console.error('Reset Password Crash:', error);
        return { error: error instanceof Error ? error.message : 'Failed to reset password' };
    }
}

export async function createUser(data: { username: string; full_name: string; group: string; section: string }) {
    await ensureAnyAdmin();
    const supabase = await createServiceRoleClient();

    const hashedPassword = await hashPassword(DEFAULT_RESET_PASSWORD);

    const { error } = await supabase
        .from('allowed_users')
        .insert({
            username: data.username,
            full_name: data.full_name,
            original_group: data.group,
            original_section: data.section,
            password: hashedPassword,
            access_role: 'student',
            is_first_login: true
        });

    if (error) {
        console.error("Create User Error:", error);
        if (error.code === '23505') return { error: 'Username already exists' };
        return { error: 'Failed to create user' };
    }

    revalidatePath('/admin');
    return { success: true };
}

/**
 * Complete Account Reset - Returns user to "first time" state
 * - Resets password to ORIGINAL password from access_keys.json
 * - Forces password change on next login
 * - Clears all progress and stats
 * - Clears onboarding status
 */
export async function resetFullAccount(username: string) {
    try {
        const session = await ensureAnyAdmin();
        const supabase = await createServiceRoleClient();

        if (session.role !== 'super_admin') {
            const { data: target } = await supabase
                .from('allowed_users')
                .select('access_role')
                .eq('username', username)
                .single();
            if (target && (target.access_role === 'admin' || target.access_role === 'super_admin')) {
                return { error: 'Only Super Admins can modify admin accounts' };
            }
        }

        const passwordMap = await loadAccessPasswordMap();
        const originalPassword = getOriginalPasswordForUsername(username, passwordMap);
        const hashedOriginalPassword = await hashPassword(originalPassword);

        const { data: currentUser } = await supabase
            .from('allowed_users')
            .select('access_role')
            .eq('username', username)
            .single();
        const shouldKeepRole = currentUser?.access_role && ['admin', 'super_admin'].includes(currentUser.access_role);
        const newRole = shouldKeepRole ? currentUser.access_role : 'student';

        const { error: userError } = await supabase
            .from('allowed_users')
            .update({
                password: hashedOriginalPassword,
                is_first_login: true,
                has_onboarded: false,
                has_leader_onboarded: false,
                nickname: null,
                access_role: newRole
            })
            .eq('username', username);

        if (userError) {
            console.error('Reset user error:', userError);
            return { error: 'Failed to reset user account' };
        }

        const { error: progressError } = await supabase
            .from('user_progress')
            .delete()
            .eq('username', username);

        if (progressError) {
            console.error('Reset progress error:', progressError);
        }

        const { error: statsError } = await supabase
            .from('user_stats')
            .update({
                total_xp: 0,
                current_rank: 'E',
                gpa_term_1: null,
                profile_picture_url: null
            })
            .eq('username', username);

        if (statsError) {
            console.error('Reset stats error:', statsError);
        }

        const { error: msgError } = await supabase
            .from('guild_messages')
            .delete()
            .eq('sender_username', username);

        if (msgError) console.error('Reset guild messages error:', msgError);

        const { error: questError } = await supabase
            .from('guild_quests')
            .delete()
            .eq('created_by', username);

        if (questError) console.error('Reset guild quests error:', questError);

        const { error: unassignError } = await supabase
            .from('guild_quests')
            .update({ assigned_to: null, status: 'pending' })
            .eq('assigned_to', username);

        if (unassignError) console.error('Reset guild assignments error:', unassignError);

        revalidatePath('/admin');
        revalidatePath('/progress');
        revalidatePath('/');

        return { success: true, message: `Account ${username} has been reset.` };
    } catch (error: unknown) {
        console.error('Reset Full Account Crash:', error);
        return { error: error instanceof Error ? error.message : 'Failed to reset account' };
    }
}


/**
 * Mass Reset ALL Accounts — Returns every user to "first time" state
 * - Resets passwords to originals from access_keys.json
 * - Forces password change on next login
 * - Clears all progress, stats, onboarding, nicknames
 * - Preserves admin/super_admin roles
 */
export async function resetAllAccounts() {
    try {
        await ensureSuperAdmin();
        const supabase = await createServiceRoleClient();
        const keysMap = await loadAccessPasswordMap();

        const { data: allUsers, error: fetchError } = await supabase
            .from('allowed_users')
            .select('username, access_role');

        if (fetchError || !allUsers) {
            return { error: 'Failed to fetch users' };
        }

        let resetCount = 0;
        let errorCount = 0;

        for (const user of allUsers) {
            try {
                const originalPassword = getOriginalPasswordForUsername(user.username, keysMap);
                const hashedPassword = await hashPassword(originalPassword);

                const keepRole = ['admin', 'super_admin'].includes(user.access_role);
                const newRole = keepRole ? user.access_role : 'student';

                const { error: updateError } = await supabase
                    .from('allowed_users')
                    .update({
                        password: hashedPassword,
                        is_first_login: true,
                        has_onboarded: false,
                        has_leader_onboarded: false,
                        nickname: null,
                        access_role: newRole,
                    })
                    .eq('username', user.username);

                if (updateError) {
                    errorCount++;
                    console.error(`[ResetAll] Failed to reset ${user.username}:`, updateError);
                } else {
                    resetCount++;
                }
            } catch (error) {
                errorCount++;
                console.error(`[ResetAll] Error resetting ${user.username}:`, error);
            }
        }

        await supabase.from('user_progress').delete().neq('username', '');
        await supabase.from('user_stats').update({
            total_xp: 0,
            current_rank: 'E',
            gpa_term_1: null,
            profile_picture_url: null,
        }).neq('username', '');
        await supabase.from('guild_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('guild_quests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        revalidatePath('/admin');
        revalidatePath('/progress');
        revalidatePath('/');

        return {
            success: true,
            message: `Reset ${resetCount} accounts.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
            resetCount,
            errorCount,
        };
    } catch (error: unknown) {
        console.error('Reset All Crash:', error);
        return { error: error instanceof Error ? error.message : 'Failed to reset all accounts' };
    }
}


export async function updateUserRole(username: string, role: 'student' | 'leader' | 'admin' | 'super_admin') {
    const session = await readSession();
    if (!session?.role || !['super_admin', 'admin'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    // Prevent changing own role
    if (session.username === username) {
        return { error: 'Cannot change your own role' };
    }

    // Admin (limited) can only toggle between student ↔ leader
    if (session.role === 'admin') {
        if (!['student', 'leader'].includes(role)) {
            return { error: 'You can only promote students to leader or demote leaders to student' };
        }
        // Admin cannot touch other admins or super_admins
        const supabase = await createServiceRoleClient();
        const { data: target } = await supabase
            .from('allowed_users')
            .select('access_role')
            .eq('username', username)
            .single();
        if (target && ['admin', 'super_admin'].includes(target.access_role)) {
            return { error: 'You cannot modify another admin\'s role' };
        }
        const { error } = await supabase
            .from('allowed_users')
            .update({ access_role: role })
            .eq('username', username);
        if (error) return { error: 'Failed to update user role' };
        revalidatePath('/admin');
        return { success: true };
    }

    // Super admin can change any role
    const supabase = await createServiceRoleClient();

    const { error } = await supabase
        .from('allowed_users')
        .update({ access_role: role })
        .eq('username', username);

    if (error) {
        console.error('Update Role Error:', error);
        return { error: 'Failed to update user role' };
    }

    revalidatePath('/admin');
    return { success: true };
}

// ============ LESSON MANAGEMENT ============

/**
 * Get all lessons, optionally filtered by course
 */
export async function getLessons(courseId?: string) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        let query = supabase
            .from('lessons')
            .select(`
                id,
                title,
                video_url,
                video_parts,
                pdf_url,
                pdf_parts,
                quiz_id,
                order_index,
                created_at,
                is_published,
                course:courses(id, name, code)
            `)
            .order('created_at', { ascending: false });

        if (courseId) {
            query = query.eq('course_id', courseId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Get lessons error:', error);
            return { error: 'Failed to fetch lessons' };
        }

        return { lessons: data || [] };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * Delete a lesson and its associated quiz/questions
 */
export async function deleteLesson(lessonId: string) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        // 1. Get lesson to find associated quiz and pdfs
        const { data: lesson } = await supabase
            .from('lessons')
            .select('quiz_id, pdf_url, pdf_parts')
            .eq('id', lessonId)
            .single();

        // 2. Delete questions first (if quiz exists)
        if (lesson?.quiz_id) {
            await supabase
                .from('questions')
                .delete()
                .eq('quiz_id', lesson.quiz_id);

            // 3. Delete quiz
            await supabase
                .from('quizzes')
                .delete()
                .eq('id', lesson.quiz_id);
        }

        // 4. Delete user progress for this lesson
        await supabase
            .from('user_progress')
            .delete()
            .eq('content_id', lessonId);

        // 5. Delete the lesson
        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', lessonId);

        // 6. Delete PDFs from storage
        const pathsToDelete: string[] = [];
        if (lesson?.pdf_url) {
            const path = extractStoragePath(lesson?.pdf_url);
            if (path) pathsToDelete.push(path);
        }
        if (lesson?.pdf_parts && Array.isArray(lesson.pdf_parts)) {
            for (const part of lesson.pdf_parts as any[]) {
                if (part.url) {
                    const path = extractStoragePath(part.url);
                    if (path) pathsToDelete.push(path);
                }
            }
        }
        if (pathsToDelete.length > 0) {
            const uniquePaths = [...new Set(pathsToDelete)];
            await supabase.storage.from('pdfs').remove(uniquePaths);
        }

        if (error) {
            console.error('Delete lesson error:', error);
            return { error: 'Failed to delete lesson' };
        }

        revalidatePath('/admin/lessons');
        revalidatePath('/course');
        updateTag('lessons');
        return { success: true, message: 'Lesson deleted successfully' };
    } catch (e: any) {
        console.error('Delete lesson crash:', e);
        return { error: e.message };
    }
}

/**
 * Update lesson details (title, video, pdf, quiz)
 */
export async function updateLesson(
    lessonId: string,
    data: {
        title?: string;
        video_url?: string;
        video_parts?: { title: string; url: string }[];
        pdf_url?: string;
        pdf_parts?: { title: string; url: string }[];
        quiz_data?: {
            title: string;
            questions: {
                id?: number;
                text: string;
                options: string[];
                correctAnswerIndex: number;
                type?: 'mcq' | 'true_false' | 'fill_blank';
            }[];
        };
    }
) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        // Get existing lesson
        const { data: existingLesson } = await supabase
            .from('lessons')
            .select('quiz_id, course_id, pdf_url, pdf_parts')
            .eq('id', lessonId)
            .single();

        if (!existingLesson) {
            return { error: 'Lesson not found' };
        }

        // Handle Quiz Update
        let quizId = existingLesson.quiz_id;

        if (data.quiz_data) {
            // If quiz exists, delete old questions and update
            if (quizId) {
                await supabase.from('questions').delete().eq('quiz_id', quizId);

                await supabase
                    .from('quizzes')
                    .update({ title: data.quiz_data.title })
                    .eq('id', quizId);
            } else {
                // Create new quiz
                const { data: newQuiz, error: quizError } = await supabase
                    .from('quizzes')
                    .insert({
                        course_id: existingLesson.course_id,
                        title: data.quiz_data.title
                    })
                    .select()
                    .single();

                if (quizError) throw new Error('Failed to create quiz');
                quizId = newQuiz.id;
            }

            // Add new questions — filter out questions with missing/invalid answers
            const validQuestions = data.quiz_data.questions.filter(q =>
                q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length
            );
            const questionsPayload = validQuestions.map((q, idx) => {
                const inferredTF = q.options.length === 2 &&
                    q.options.map(o => o.toLowerCase().trim()).sort().join(',') === 'false,true';
                const qType = q.type || (inferredTF ? 'true_false' : 'mcq');
                return {
                    quiz_id: quizId,
                    text: q.text,
                    type: qType,
                    options: q.options,
                    correct_answer: q.options[q.correctAnswerIndex],
                    order_index: idx
                };
            });

            const { error: questionsError } = await supabase
                .from('questions')
                .insert(questionsPayload);

            if (questionsError) throw new Error('Failed to save questions');
        }

        // Update lesson
        const updatePayload: any = {};
        if (data.title !== undefined) updatePayload.title = data.title;
        if (data.video_url !== undefined) updatePayload.video_url = data.video_url || null;
        if (data.video_parts !== undefined) updatePayload.video_parts = data.video_parts;
        if (data.pdf_url !== undefined) updatePayload.pdf_url = data.pdf_url || null;
        if (data.pdf_parts !== undefined) updatePayload.pdf_parts = data.pdf_parts;
        if (quizId !== existingLesson.quiz_id) updatePayload.quiz_id = quizId;

        // Handle PDF Deletions
        const pathsToDelete: string[] = [];
        const existingPaths: string[] = [];

        if (existingLesson?.pdf_url) {
            const p = extractStoragePath(existingLesson.pdf_url);
            if (p) existingPaths.push(p);
        }
        if (existingLesson?.pdf_parts && Array.isArray(existingLesson.pdf_parts)) {
            for (const part of existingLesson.pdf_parts as any[]) {
                if (part.url) {
                    const p = extractStoragePath(part.url);
                    if (p) existingPaths.push(p);
                }
            }
        }

        const keptPaths: string[] = [];
        if (data.pdf_url) {
            const p = extractStoragePath(data.pdf_url);
            if (p) keptPaths.push(p);
        }
        if (data.pdf_parts && Array.isArray(data.pdf_parts)) {
            for (const part of data.pdf_parts) {
                if (part.url) {
                    const p = extractStoragePath(part.url);
                    if (p) keptPaths.push(p);
                }
            }
        }

        for (const p of existingPaths) {
            if (!keptPaths.includes(p)) {
                pathsToDelete.push(p);
            }
        }

        if (pathsToDelete.length > 0) {
            const uniquePaths = [...new Set(pathsToDelete)];
            await supabase.storage.from('pdfs').remove(uniquePaths);
        }

        if (Object.keys(updatePayload).length > 0) {
            const { error } = await supabase
                .from('lessons')
                .update(updatePayload)
                .eq('id', lessonId);

            if (error) {
                console.error('Update lesson error:', error);
                return { error: 'Failed to update lesson' };
            }
        }

        revalidatePath('/admin/lessons');
        revalidatePath('/course');
        updateTag('lessons');
        return { success: true, message: 'Lesson updated successfully' };
    } catch (e: any) {
        console.error('Update lesson crash:', e);
        return { error: e.message };
    }
}

/**
 * Get a single lesson with its quiz data for editing
 */
export async function getLesson(lessonId: string) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();

        const { data: lesson, error } = await supabase
            .from('lessons')
            .select(`
                id,
                title,
                video_url,
                video_parts,
                pdf_url,
                pdf_parts,
                quiz_id,
                course_id,
                course:courses(id, name, code)
            `)
            .eq('id', lessonId)
            .single();

        if (error || !lesson) {
            return { error: 'Lesson not found' };
        }

        // Get quiz questions if exists
        let questions: any[] = [];
        if (lesson.quiz_id) {
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('title')
                .eq('id', lesson.quiz_id)
                .single();

            const { data: questionData } = await supabase
                .from('questions')
                .select('id, text, options, correct_answer, order_index')
                .eq('quiz_id', lesson.quiz_id)
                .order('order_index');

            questions = (questionData || []).map(q => ({
                ...q,
                correctAnswerIndex: q.options?.indexOf(q.correct_answer) ?? -1
            }));

            return {
                lesson: {
                    ...lesson,
                    quiz_title: quizData?.title,
                    questions
                }
            };
        }

        return { lesson };
    } catch (e: any) {
        return { error: e.message };
    }
}

// ============ SEARCH ============

/**
 * Search students by name across ALL sections (batch-wide search)
 */
export async function searchUsersByName(query: string) {
    try {
        await ensureAnyAdmin();

        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 2) {
            return { users: [] };
        }

        const supabase = await createServiceRoleClient();

        const { data, error } = await supabase
            .from('allowed_users')
            .select('username, full_name, access_role, original_section, original_group')
            .ilike('full_name', `%${trimmed}%`)
            .order('full_name', { ascending: true })
            .limit(25);

        if (error) {
            console.error('Search users error:', error);
            return { error: 'Search failed' };
        }

        return { users: data || [] };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function toggleLessonPublishStatus(lessonId: string, currentStatus: boolean) {
    try {
        await ensureLeaderOrAdmin();
        const supabase = await createServiceRoleClient();
        
        const { error } = await supabase
            .from('lessons')
            .update({ is_published: !currentStatus })
            .eq('id', lessonId);

        if (error) return { error: 'Failed to update lesson status' };

        revalidatePath('/admin/lessons');
        updateTag('lessons');
        updateTag('course-progress');
        return { success: true, message: `Lesson ${!currentStatus ? 'Published' : 'Unpublished'} successfully` };
    } catch (e: any) {
        return { error: e.message || 'Unexpected error' };
    }
}
