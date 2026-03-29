export interface PollData {
    id: string;
    question: string;
    options: string[];
    allow_multiple: boolean;
    ends_at: string | null;
    votes: { option: number; count: number }[];
    user_vote: number[] | null;
    total_votes: number;
}

export interface Notification {
    id: string;
    sender_username: string;
    target_section: string | null; // null = All
    category: string | null; // course code (e.g. 'P102') or null for general
    type: string; // 'announcement' | 'urgent' | 'reminder' | 'poll'
    is_pinned: boolean;
    title: string;
    message: string;
    created_at: string;
    sender_full_name?: string;
    sender_role?: string;
    sender_section?: string | null;
    poll?: PollData | null;
    is_read?: boolean;
}
