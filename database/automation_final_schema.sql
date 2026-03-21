-- ==============================================================================
-- 🚀 SCIENCE HUB: FINAL AUTOMATION DATABASE SCHEMA
-- This single script creates all necessary tables for the Telegram & n8n pipeline.
-- ==============================================================================

-- 1. n8n_processed_lectures: Tracks finished lectures so n8n avoids duplicates
create table if not exists n8n_processed_lectures (
  id uuid default gen_random_uuid() primary key,
  queue_id text not null unique,
  lesson_id uuid references lessons(id) on delete set null,
  course_code text not null,
  lecture_title text not null,
  processed_at timestamptz default now() not null
);

create index if not exists n8n_processed_lectures_queue_id_idx on n8n_processed_lectures(queue_id);
create index if not exists n8n_processed_lectures_course_code_idx on n8n_processed_lectures(course_code);

-- We don't need RLS because this is purely a backend processing table for n8n

-- 2. automation_queue: Replaces the JSON queue with a robust Database tracking system
create table if not exists automation_queue (
    id uuid default gen_random_uuid() primary key,
    status text not null default 'pending', -- pending, processing, done, failed
    source text not null,                   -- telegram, website_upload
    course_code text not null,
    course_name text,
    course_name_ar text,
    instructor text,
    lecture_number integer,
    lecture_title text not null,
    primary_pdf_path text,
    primary_pdf_type text,
    can_use_gemini boolean default true,
    youtube_url text,
    youtube_from_telegram boolean default false,
    telegram_msg_ids integer[],
    added_at timestamptz default now() not null,
    processed_at timestamptz,
    started_at timestamptz,
    error text,
    retry_count integer default 0
);

create index if not exists automation_queue_status_added_at_idx on automation_queue(status, added_at);

-- 3. Storage Bucket: Create the storage bucket for large uploads securely
insert into storage.buckets (id, name, public) 
values ('automation_uploads', 'automation_uploads', false)
on conflict (id) do nothing;

-- 4. Queue Processing Logic (RPC for picking next pending queue item safely)
create or replace function get_next_pending_lecture()
returns setof automation_queue as $$
declare
    v_record automation_queue%ROWTYPE;
begin
    select * into v_record
    from automation_queue
    where status = 'pending'
    order by added_at asc
    limit 1
    for update skip locked;

    if found then
        update automation_queue
        set status = 'processing', started_at = now()
        where id = v_record.id
        returning * into v_record;
        
        return next v_record;
    end if;
    return;
end;
$$ language plpgsql;

-- 5. Ingestion Logic (RPC for transferring finished n8n content into the website Lessons table)
create or replace function ingest_lesson_data(
    p_queue_id text,
    p_course_code text,
    p_lecture_title text,
    p_course_id uuid,
    p_order_index integer,
    p_video_url text,
    p_pdf_url text,
    p_instructor text,
    p_quiz_title text,
    p_questions jsonb
) returns uuid as $$
declare
    v_lesson_id uuid;
    v_quiz_id uuid;
    v_question_record jsonb;
begin
    -- Create the lesson
    insert into lessons (course_id, title, order_index, video_url, pdf_url, instructor, is_published)
    values (p_course_id, p_lecture_title, p_order_index, p_video_url, p_pdf_url, p_instructor, false)
    returning id into v_lesson_id;

    -- Create quiz and questions if provided
    if p_questions is not null and jsonb_array_length(p_questions) > 0 then
        insert into quizzes (course_id, title)
        values (p_course_id, p_quiz_title)
        returning id into v_quiz_id;

        update lessons set quiz_id = v_quiz_id where id = v_lesson_id;

        for v_question_record in select * from jsonb_array_elements(p_questions)
        loop
            insert into questions (quiz_id, text, type, options, correct_answer, order_index)
            values (
                v_quiz_id,
                v_question_record->>'text',
                v_question_record->>'type',
                (v_question_record->>'options')::jsonb,
                v_question_record->>'correct_answer',
                (v_question_record->>'order_index')::integer
            );
        end loop;
    end if;

    -- Track as processed completely
    insert into n8n_processed_lectures (queue_id, lesson_id, course_code, lecture_title, processed_at)
    values (p_queue_id, v_lesson_id, p_course_code, p_lecture_title, now());

    return v_lesson_id;
end;
$$ language plpgsql;
