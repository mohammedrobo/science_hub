'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { revalidatePath, updateTag } from 'next/cache';

// Super admin = full power (old admin). New admin = limited admin.
async function ensureSuperAdmin() {
    const session = await getSession();
    if (session?.role !== 'super_admin') {
        throw new Error('Unauthorized: Super Admin access required');
    }
    return session;
}

// Allow super_admin or admin
async function ensureAnyAdmin() {
    const session = await getSession();
    if (!session?.role || !['super_admin', 'admin'].includes(session.role)) {
        throw new Error('Unauthorized: Admin access required');
    }
    return session;
}

// Allow super_admin, admin, and leader roles for CMS operations
async function ensureLeaderOrAdmin() {
    const session = await getSession();
    if (!session?.role || !['super_admin', 'admin', 'leader'].includes(session.role)) {
        throw new Error('Unauthorized: Leader or Admin access required');
    }
    return session;
}



// ============ CMS OPERATIONS ============

// ... imports
import { MOCK_COURSES } from '@/lib/data/mocks';

// ... existing code ...

export async function createLesson(data: {
    course_id: string;
    title: string;
    video_url?: string;
    video_parts?: { title: string; url: string }[];
    pdf_url?: string;
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
        await ensureSuperAdmin();
        const supabase = await createServiceRoleClient();

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
    await ensureSuperAdmin();
    const supabase = await createServiceRoleClient();

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
    await ensureSuperAdmin();
    const supabase = await createServiceRoleClient();

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
    await ensureSuperAdmin();
    const supabase = await createServiceRoleClient();

    // 1. Lookup original password from access_keys.json
    let originalPassword = 'student123';
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const pathsToTry = [
            path.join(process.cwd(), 'secure_data', 'access_keys.json'),
            '/home/satoru/projects/science_hub/secure_data/access_keys.json',
        ];

        let keysData = '';
        for (const p of pathsToTry) {
            try {
                keysData = await fs.readFile(p, 'utf-8');
                break;
            } catch { }
        }

        if (keysData) {
            const keys = JSON.parse(keysData);
            const normalize = (s: string) => s ? s.trim().toLowerCase().normalize('NFKC') : '';
            const userKey = keys.find((k: any) => normalize(k.username) === normalize(username));
            if (userKey?.password) {
                originalPassword = userKey.password.trim();
            }
        }
    } catch (e) {
        console.error('[ResetPassword] Error reading access_keys:', e);
    }

    // 2. Hash and update
    const { hashPassword } = await import('@/lib/auth/password');
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
}

export async function createUser(data: { username: string; full_name: string; group: string; section: string }) {
    await ensureAnyAdmin();
    const supabase = await createServiceRoleClient();

    const { hashPassword } = await import('@/lib/auth/password');
    const hashedPassword = await hashPassword('student123');

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
    await ensureSuperAdmin();
    const supabase = await createServiceRoleClient();

    // 1. Lookup original password from access_keys.json
    let originalPassword = ''; // No default fallback yet
    let foundInFile = false;

    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        // Try multiple path resolutions
        const pathsToTry = [
            path.join(process.cwd(), 'secure_data', 'access_keys.json'),
            '/home/satoru/projects/science_hub/secure_data/access_keys.json', // Hardcoded absolute path for reliability
            path.join(process.cwd(), '..', 'secure_data', 'access_keys.json') // In case of monorepo/deployment shifts
        ];

        let keysData = '';
        let loadedPath = '';

        for (const p of pathsToTry) {
            try {
                keysData = await fs.readFile(p, 'utf-8');
                loadedPath = p;
                break;
            } catch { }
        }

        if (!keysData) {
            throw new Error('Access keys file not found in secure_data');
        }

        const keys = JSON.parse(keysData);

        // Normalize string for robust matching (handle weird hyphens/spaces)
        const normalize = (s: string) => s ? s.trim().toLowerCase().normalize('NFKC') : '';
        const targetUsername = normalize(username);

        const userKey = keys.find((k: any) => normalize(k.username) === targetUsername);

        if (userKey?.password) {
            originalPassword = userKey.password.trim();
            foundInFile = true;
        } else {
            originalPassword = 'student123';
            foundInFile = false;
        }
    } catch (e: any) {
        console.error('[Reset] File Error:', e);
        // Fallback on file error too
        originalPassword = 'student123';
        foundInFile = false;
    }

    // Hash the password before storing (NEVER store plaintext)
    const { hashPassword } = await import('@/lib/auth/password');
    const hashedOriginalPassword = await hashPassword(originalPassword);

    // 2. Reset user flags and password

    // Check current role to preserve Admin/Super Admin status if needed
    const { data: currentUser } = await supabase.from('allowed_users').select('access_role').eq('username', username).single();
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

    // 3. Delete all progress
    const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('username', username);

    if (progressError) {
        console.error('Reset progress error:', progressError);
    }

    // 4. Reset stats completely
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

    // 5. Clean up Guild Data (Leader Dashboard Cleanup)
    // Delete messages sent by user
    const { error: msgError } = await supabase
        .from('guild_messages')
        .delete()
        .eq('sender_username', username);

    if (msgError) console.error('Reset guild messages error:', msgError);

    // Delete quests created by user
    const { error: questError } = await supabase
        .from('guild_quests')
        .delete()
        .eq('created_by', username);

    if (questError) console.error('Reset guild quests error:', questError);

    // Unassign quests assigned to user
    const { error: unassignError } = await supabase
        .from('guild_quests')
        .update({ assigned_to: null, status: 'pending' }) // Reset status to pending if unassigned? strictly unassigning is safer.
        .eq('assigned_to', username);

    if (unassignError) console.error('Reset guild assignments error:', unassignError);

    revalidatePath('/admin');
    revalidatePath('/progress');
    revalidatePath('/');

    return { success: true, message: `Account ${username} has been reset.` };
}


/**
 * Mass Reset ALL Accounts — Returns every user to "first time" state
 * - Resets passwords to originals from access_keys.json
 * - Forces password change on next login
 * - Clears all progress, stats, onboarding, nicknames
 * - Preserves admin/super_admin roles
 */
export async function resetAllAccounts() {
    await ensureSuperAdmin();
    const supabase = await createServiceRoleClient();

    // 1. Load original passwords from access_keys.json
    let keysMap: Record<string, string> = {};
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const pathsToTry = [
            path.join(process.cwd(), 'secure_data', 'access_keys.json'),
            '/home/satoru/projects/science_hub/secure_data/access_keys.json',
        ];
        let keysData = '';
        for (const p of pathsToTry) {
            try { keysData = await fs.readFile(p, 'utf-8'); break; } catch { }
        }
        if (keysData) {
            const keys = JSON.parse(keysData);
            const normalize = (s: string) => s ? s.trim().toLowerCase().normalize('NFKC') : '';
            for (const k of keys) {
                if (k.username && k.password) {
                    keysMap[normalize(k.username)] = k.password.trim();
                }
            }
        }
    } catch (e) {
        console.error('[ResetAll] Failed to load access keys:', e);
    }

    // 2. Get all users
    const { data: allUsers, error: fetchError } = await supabase
        .from('allowed_users')
        .select('username, access_role');

    if (fetchError || !allUsers) {
        return { error: 'Failed to fetch users' };
    }

    const { hashPassword } = await import('@/lib/auth/password');
    const normalize = (s: string) => s ? s.trim().toLowerCase().normalize('NFKC') : '';

    let resetCount = 0;
    let errorCount = 0;

    // 3. Reset each user
    for (const user of allUsers) {
        try {
            const originalPassword = keysMap[normalize(user.username)] || 'student123';
            const hashedPassword = await hashPassword(originalPassword);

            // Preserve admin/super_admin roles
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
        } catch (e) {
            errorCount++;
            console.error(`[ResetAll] Error resetting ${user.username}:`, e);
        }
    }

    // 4. Bulk-delete progress, stats reset, guild cleanup
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
}


export async function updateUserRole(username: string, role: 'student' | 'leader' | 'admin' | 'super_admin') {
    const session = await getSession();
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
                pdf_url,
                quiz_id,
                order_index,
                created_at,
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

        // 1. Get lesson to find associated quiz
        const { data: lesson } = await supabase
            .from('lessons')
            .select('quiz_id, pdf_url')
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
            .select('quiz_id, course_id')
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
        if (quizId !== existingLesson.quiz_id) updatePayload.quiz_id = quizId;

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
