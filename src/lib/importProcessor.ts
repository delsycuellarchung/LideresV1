import type { SupabaseClient } from '@supabase/supabase-js';

type RawRow = Record<string, unknown>;

type PersonaToUpsert = {
  codigo: string;
  nombre: string;
  cargo: string | null;
  correo: string | null;
  area_name: string | null;
  gerencia_name: string | null;
  tipo: string;
};

const getValue = (row: RawRow, keys: string[]): string | null => {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || value === '') continue;
    return String(value);
  }
  return null;
};

export const processImportRows = async (jsonData: RawRow[], supabase: SupabaseClient) => {
  const personasToUpsert: PersonaToUpsert[] = [];
  const areasSet = new Set<string>();
  const gerenciasSet = new Set<string>();

  for (const row of jsonData) {
    let tipo = 'evaluado';
    let codigo = getValue(row, ['Código del Evaluado', 'Codigo del Evaluado', 'codigo']);
    let nombre = getValue(row, ['Nombre del Evaluado', 'Nombre', 'nombre']);
    let cargo = getValue(row, ['Cargo del Evaluado', 'Cargo', 'cargo']);
    let correo = getValue(row, ['Correo del Evaluado', 'Correo', 'correo', 'Email', 'email']);
    let area = getValue(row, ['Área del Evaluado', 'Area del Evaluado', 'Area', 'area']);
    let gerencia = getValue(row, ['Gerencia del Evaluado', 'Gerencia', 'gerencia']);

    if (!codigo) {
      tipo = 'evaluador';
      codigo = getValue(row, ['Código del Evaluador', 'Codigo del Evaluador', 'codigo']);
      nombre = getValue(row, ['Nombre del Evaluador', 'Nombre', 'nombre']);
      cargo = getValue(row, ['Cargo del Evaluador', 'Cargo', 'cargo']);
      correo = getValue(row, ['Correo del Evaluador', 'Correo', 'correo', 'Email', 'email']);
      area = getValue(row, ['Área del Evaluador', 'Area del Evaluador', 'Area', 'area']);
      gerencia = getValue(row, ['Gerencia del Evaluador', 'Gerencia', 'gerencia']);
    }

    if (!codigo || !nombre) continue;

    if (area) areasSet.add(area);
    if (gerencia) gerenciasSet.add(gerencia);

    personasToUpsert.push({
      codigo,
      nombre,
      cargo: cargo || null,
      correo: correo || null,
      area_name: area || null,
      gerencia_name: gerencia || null,
      tipo,
    });
  }

  const areaNames = Array.from(areasSet);
  const gerenciaNames = Array.from(gerenciasSet);

  const areaMap: Record<string, number | null> = {};
  if (areaNames.length > 0) {
    const { data: existingAreas } = await supabase.from('areas').select('id,nombre').in('nombre', areaNames);
    const existingMap = new Map((existingAreas || []).map((a: { id: number; nombre: string }) => [a.nombre, a.id]));
    const missing = areaNames.filter((n) => !existingMap.has(n));
    if (missing.length > 0) {
      const { data: inserted } = await supabase.from('areas').insert(missing.map((n) => ({ nombre: n }))).select('id,nombre');
      for (const a of inserted || []) existingMap.set(a.nombre, a.id);
    }
    for (const n of areaNames) areaMap[n] = existingMap.get(n) ?? null;
  }

  const gerenciaMap: Record<string, number | null> = {};
  if (gerenciaNames.length > 0) {
    const { data: existingGer } = await supabase.from('gerencias').select('id,nombre').in('nombre', gerenciaNames);
    const existingMapG = new Map((existingGer || []).map((g: { id: number; nombre: string }) => [g.nombre, g.id]));
    const missingG = gerenciaNames.filter((n) => !existingMapG.has(n));
    if (missingG.length > 0) {
      const { data: insertedG } = await supabase.from('gerencias').insert(missingG.map((n) => ({ nombre: n }))).select('id,nombre');
      for (const g of insertedG || []) existingMapG.set(g.nombre, g.id);
    }
    for (const n of gerenciaNames) gerenciaMap[n] = existingMapG.get(n) ?? null;
  }

  const batchSize = 200;
  let insertados = 0;
  for (let i = 0; i < personasToUpsert.length; i += batchSize) {
    const batch = personasToUpsert.slice(i, i + batchSize).map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      cargo: p.cargo,
      correo: p.correo,
      area_id: p.area_name ? areaMap[p.area_name] ?? null : null,
      gerencia_id: p.gerencia_name ? gerenciaMap[p.gerencia_name] ?? null : null,
      tipo: p.tipo,
    }));
    const { error: upErr } = await supabase.from('personas').upsert(batch, { onConflict: 'codigo' });
    if (upErr) console.error('Error upserting batch:', upErr);
    else insertados += batch.length;
  }

  return insertados;
};
