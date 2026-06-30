import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });

  // Authenticate the caller via their JWT — the user_id to delete comes from
  // the verified token, never from the request body.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ success: false, error: 'Missing authorization.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await authClient.auth.getUser();
  if (authErr || !user) {
    return json({ success: false, error: 'Invalid or expired session.' }, 401);
  }

  try {
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Best-effort: remove the user's storage objects first (defense-in-depth;
    // the parser normally deletes raw files already).
    const { data: files } = await admin.storage.from('statements').list(user.id);
    if (files && files.length > 0) {
      await admin.storage
        .from('statements')
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }

    // Delete the auth user. FK `on delete cascade` wipes profile, statements,
    // and transactions automatically.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;

    return json({ success: true });
  } catch (err: any) {
    console.error('[delete-account] ERROR:', err.message);
    return json({ success: false, error: err.message }, 500);
  }
});
