'use server';

import { getSession } from '@/app/login/actions';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfilePicture(formData: FormData) {
    const session = await getSession();

    if (!session) {
        return { error: 'Not authenticated' };
    }

    const file = formData.get('profile_picture') as File;

    if (!file) {
        return { error: 'No file provided' };
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return { error: 'File must be an image' };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return { error: 'Image must be less than 5MB' };
    }

    const supabase = await createClient();

    // Sanitize filename
    const fileExt = file.name.split('.').pop();
    const cleanUsername = session.username.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanUsername}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Convert file to ArrayBuffer (Fix for Next.js Server Actions)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Uploading file:', filePath, 'Size:', buffer.length, 'Type:', file.type);

    const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: true
        });

    if (uploadError) {
        console.error('Upload detailed error:', uploadError);
        // RETURN THE ACTUAL ERROR MESSAGE
        return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    // Update user_stats with new profile picture URL
    const { error: updateError } = await supabase
        .from('user_stats')
        .update({ profile_picture_url: publicUrl })
        .eq('username', session.username);

    if (updateError) {
        console.error('Update detailed error:', updateError);
        return { error: `Database update failed: ${updateError.message}` };
    }

    revalidatePath('/profile');
    return { success: true, url: publicUrl };
}
