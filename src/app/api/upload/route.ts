import { createServiceRoleClient } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session-read';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
    try {
        // Use app's session auth instead of broken Supabase Auth
        const session = await readSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        // Validate MIME type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
        }

        // Whitelist extensions — block .svg, .html, etc.
        const fileExt = (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(fileExt)) {
            return NextResponse.json({ error: `File type .${fileExt} not allowed. Use jpg, png, gif, or webp.` }, { status: 400 });
        }

        const supabase = await createServiceRoleClient();
        const fileName = `${session.username}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(fileName);

        return NextResponse.json({ url: publicUrl });

    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
