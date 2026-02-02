'use client';

import { useState } from 'react';
import { updateProfilePicture } from './actions';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfilePictureUploadProps {
    currentPictureUrl?: string | null;
    username: string;
}

function getInitials(username: string): string {
    return username.substring(0, 2).toUpperCase();
}

export function ProfilePictureUpload({ currentPictureUrl, username }: ProfilePictureUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentPictureUrl || null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('profile_picture', file);

        const result = await updateProfilePicture(formData);

        setIsUploading(false);

        if (result.error) {
            setError(result.error);
            setPreviewUrl(currentPictureUrl || null);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/50 bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-4xl font-bold text-white">
                            {getInitials(username)}
                        </span>
                    )}
                </div>

                {/* Upload Overlay */}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="text-center">
                        {isUploading ? (
                            <Loader2 className="h-8 w-8 text-white animate-spin mx-auto" />
                        ) : (
                            <Camera className="h-8 w-8 text-white" />
                        )}
                        <span className="text-xs text-white mt-2 block">
                            {isUploading ? 'Uploading...' : 'Change Photo'}
                        </span>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="hidden"
                    />
                </label>
            </div>

            {error && (
                <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
                    {error}
                </p>
            )}

            <p className="text-xs text-muted-foreground">
                Click to upload a new profile picture (max 5MB)
            </p>
        </div>
    );
}
