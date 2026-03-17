#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    console.log('Querying evaluators (first 20) ...');
    const { data, error } = await supabase
      .from('evaluators')
      .select('id, codigo_evaluador, nombre_evaluador, correo_evaluador, import_batch, row_index')
      .order('import_batch', { ascending: true })
      .order('row_index', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Query error:', error.message || error);
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
