-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb, -- Array of strings
    context_data JSONB DEFAULT '{}'::jsonb, -- Store lesson_id, page_url etc
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Sessions Policies
CREATE POLICY "Users can view own sessions" 
ON chat_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
ON chat_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" 
ON chat_sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Messages Policies
CREATE POLICY "Users can view messages of own sessions" 
ON chat_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id 
        AND chat_sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages to own sessions" 
ON chat_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_sessions 
        WHERE chat_sessions.id = chat_messages.session_id 
        AND chat_sessions.user_id = auth.uid()
    )
);

-- Storage Bucket for Chat Attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Access to Chat Attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-attachments' );

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'chat-attachments' 
    AND auth.role() = 'authenticated'
);
