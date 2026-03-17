
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Set env vars and re-run.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Fetching evaluators...');
  const { data, error } = await supabase
    .from('evaluators')
    .select('id, import_batch, row_index')
    .order('import_batch', { ascending: true })
    .order('row_index', { ascending: true })
    .limit(100000);

  if (error) {
    console.error('Error fetching evaluators:', error.message || error);
    process.exit(1);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.log('No rows found in evaluators table. Nothing to do.');
    return;
  }
  const groups = new Map();
  for (const row of data) {
    const key = row.import_batch === null || row.import_batch === undefined ? '__NULL__' : String(row.import_batch);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  console.log(`Found ${groups.size} batch groups. Processing...`);

  let totalUpdated = 0;

  for (const [batchId, rows] of groups.entries()) {
    console.log(`Processing batch: ${batchId === '__NULL__' ? '(null)' : batchId} — ${rows.length} rows`);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const newIndex = i; 

      if (r.row_index === newIndex) {
        continue;
      }

      if (DRY_RUN) {
        console.log(`[DRY] Would update id=${r.id} row_index: ${r.row_index} => ${newIndex}`);
        continue;
      }
      const { error: upErr } = await supabase
        .from('evaluators')
        .update({ row_index: newIndex })
        .eq('id', r.id);

      if (upErr) {
        console.error(`Failed updating id=${r.id}:`, upErr.message || upErr);
      } else {
        totalUpdated++;
      }
    }
  }

  console.log(`Done. Total updated rows: ${totalUpdated}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
