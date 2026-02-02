export default function Head() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseOrigin: string | null = null;

    if (supabaseUrl) {
        try {
            supabaseOrigin = new URL(supabaseUrl).origin;
        } catch {
            supabaseOrigin = null;
        }
    }

    return (
        <>
            {supabaseOrigin && (
                <>
                    <link rel="preconnect" href={supabaseOrigin} />
                    <link rel="dns-prefetch" href={supabaseOrigin} />
                </>
            )}
        </>
    );
}
