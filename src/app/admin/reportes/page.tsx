"use client";
import React from "react";
import dynamic from 'next/dynamic';
import { mapLabelToNumeric } from '@/lib/scaleMapper';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false }) as any;

export default function ReportesPage() {
  const [datos, setDatos] = React.useState<any[]>([]);
  const [estilosLabels, setEstilosLabels] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [matches, setMatches] = React.useState<Array<{codigo:string,nombre:string}>>([]);
  const [selectedCodigo, setSelectedCodigo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('form_responses') || '[]';
      const allResponses = JSON.parse(raw) || [];
      const rawA = window.localStorage.getItem('formulario_afirmaciones') || '[]';
      const afirmaciones = JSON.parse(rawA) || [];
      const affByCode: Record<string, any> = {};
      afirmaciones.forEach((a: any) => { if (a.codigo) affByCode[String(a.codigo)] = a; });

      const classify = (a: any) => {
        const txt = ((a.tipo || '') + ' ' + (a.pregunta || '')).toLowerCase();
        if (/comunic|direcci/i.test(txt)) return 'comunicacion';
        if (/respeto|confian/i.test(txt)) return 'respeto';
        if (/desarroll|equipo|empower/i.test(txt)) return 'desarrollo';
        if (/adapt|resil/i.test(txt)) return 'adaptabilidad';
        if (/motiv|influenc/i.test(txt)) return 'motivacion';
        return null;
      };
      const codesByGroup: Record<string, string[]> = { comunicacion: [], respeto: [], desarrollo: [], adaptabilidad: [], motivacion: [] };
      const estilosByTipo: Record<string, string[]> = {};
      Object.values(affByCode).forEach((a: any) => {
        const g = classify(a);
        if (g) codesByGroup[g].push(String(a.codigo));
        // collect estilos by tipo when afirmacion explicitly marked as estilo or tipo suggests estilo
        const isEstilo = a.categoria === 'estilo';
        if (isEstilo) {
          const tipoKey = String(a.tipo || a.codigo || 'est').trim() || 'est';
          estilosByTipo[tipoKey] = estilosByTipo[tipoKey] || [];
          estilosByTipo[tipoKey].push(String(a.codigo));
        }
      });

      const byEvaluado: Record<string, any> = {};
      allResponses.forEach((r: any) => {
        const code = String(r.evaluadoCodigo || r.token || '');
        if (!byEvaluado[code]) byEvaluado[code] = { codigo: code, nombre: r.evaluadoNombre || '', fecha: r.createdAt || '', evaluadoresSet: new Set<string>(), values: [] };
        byEvaluado[code].evaluadoresSet.add(String(r.evaluatorName || '').trim());
        Object.keys(r.responses || {}).forEach(k => {
          const rawVal = r.responses[k];
          const num = mapLabelToNumeric(rawVal);
          if (typeof num === 'number' && !isNaN(num)) byEvaluado[code].values.push(num);
        });
      });

      const rows = Object.values(byEvaluado).map((item: any) => {
        const code = item.codigo;
        const entries = allResponses.filter((r: any) => String(r.evaluadoCodigo || r.token) === code);
        const evaluadores = item.evaluadoresSet.size;

        const computeGroupAvg = (groupCodes: string[]) => {
          if (evaluadores < 3) return null;
          const vals: number[] = [];
          entries.forEach((r: any) => {
            groupCodes.forEach((c) => {
              const raw = r.responses?.[c];
              const num = mapLabelToNumeric(raw);
              if (typeof num === 'number' && !isNaN(num)) vals.push(num);
            });
          });
          return vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : null;
        };

        const comunicacion = computeGroupAvg(codesByGroup.comunicacion);
        const respeto = computeGroupAvg(codesByGroup.respeto);
        const desarrollo = computeGroupAvg(codesByGroup.desarrollo);
        const adaptabilidad = computeGroupAvg(codesByGroup.adaptabilidad);
        const motivacion = computeGroupAvg(codesByGroup.motivacion);

        // compute estilos averages per tipo
        const estilosMap: Record<string, number | null> = {};
        Object.keys(estilosByTipo).forEach(tk => {
          estilosMap[tk] = (function() {
            if (evaluadores < 3) return null;
            const vals: number[] = [];
            entries.forEach((r: any) => {
              estilosByTipo[tk].forEach((c: string) => {
                const raw = r.responses?.[c];
                const num = mapLabelToNumeric(raw);
                if (typeof num === 'number' && !isNaN(num)) vals.push(num);
              });
            });
            return vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : null;
          })();
        });

        const overall = (evaluadores >= 3 && item.values.length) ? +(item.values.reduce((s: number, v: number) => s + v, 0) / item.values.length).toFixed(2) : null;

        return {
          codigo: code,
          nombre: item.nombre,
          fecha: item.fecha ? new Date(item.fecha).toLocaleDateString() : '',
          evaluadores,
          comunicacion: comunicacion ?? null,
          respeto: respeto ?? null,
          desarrollo: desarrollo ?? null,
          adaptabilidad: adaptabilidad ?? null,
          motivacion: motivacion ?? null,
          estilos: estilosMap,
          promedio: overall ?? null
        };
      });

      // determine estilos labels order
      const estilosLabelsArr = Object.keys(estilosByTipo || {});
      setEstilosLabels(estilosLabelsArr);
      setDatos(rows);
    } catch (e) {
      console.warn('Error building report data', e);
      setDatos([]);
    }
  }, []);

  const findMatches = (term: string) => {
    const t = (term || '').trim().toLowerCase();
    if (!t) return [];
    return datos
      .filter(d => (String(d.nombre || d.codigo || '')).toLowerCase().includes(t))
      .slice(0, 20)
      .map(d => ({ codigo: d.codigo, nombre: d.nombre || d.codigo }));
  };

  const barOptions = React.useMemo(() => {
    const categories = datos.map(d => d.nombre || d.codigo || '—');
    const series = [
      { name: 'Comunicación', data: datos.map(d => typeof d.comunicacion === 'number' ? d.comunicacion : null) },
      { name: 'Respeto', data: datos.map(d => typeof d.respeto === 'number' ? d.respeto : null) },
      { name: 'Desarrollo', data: datos.map(d => typeof d.desarrollo === 'number' ? d.desarrollo : null) },
      { name: 'Adaptabilidad', data: datos.map(d => typeof d.adaptabilidad === 'number' ? d.adaptabilidad : null) },
      { name: 'Motivación', data: datos.map(d => typeof d.motivacion === 'number' ? d.motivacion : null) }
    ];
    return {
      series,
      options: {
        chart: { type: 'bar', height: 360, toolbar: { show: true } },
        plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 1, colors: ['transparent'] },
        xaxis: { categories },
        yaxis: { min: 0, max: 5, title: { text: 'Promedio' } },
        tooltip: { y: { formatter: (v:any) => v === null ? '—' : v.toFixed(2) } },
        legend: { position: 'top' },
        responsive: [{ breakpoint: 800, options: { plotOptions: { bar: { columnWidth: '70%' } }, legend: { position: 'bottom' } } }]
      }
    };
  }, [datos]);

  const radarEstilosOptions = React.useMemo(() => {
    const labels = estilosLabels.length ? estilosLabels : [];
    let source = datos;
    if (selectedCodigo) source = datos.filter(d => String(d.codigo) === String(selectedCodigo));
    const series = source.map(d => ({ name: d.nombre || d.codigo, data: labels.map(l => (d.estilos && typeof d.estilos[l] === 'number') ? d.estilos[l] : 0) }));
    return {
      series,
      options: {
        chart: { type: 'radar', height: 640, toolbar: { show: true }, foreColor: '#000000' },
        plotOptions: { radar: { polygons: { strokeColors: '#374151', connectorColors: '#374151', fill: { colors: ['transparent'] }, opacity: 1 } } },
        grid: { show: false },
        xaxis: { categories: labels, labels: { style: { fontSize: '18px', colors: labels.map(() => '#000000') } } },
        yaxis: { min: 0, max: 5, tickAmount: 5, labels: { style: { fontSize: '16px', colors: ['#000000'] } } },
        stroke: { width: 4, curve: 'smooth' },
        markers: { size: 12 },
        fill: { opacity: 0.55 },
        colors: ['#7C3AED', '#1D4ED8', '#0EA5A4', '#F97316', '#EF4444', '#64748B'],
        legend: { position: 'bottom', horizontalAlign: 'center', labels: { colors: '#000000' }, fontSize: '16px' },
        tooltip: { y: { formatter: (v:any) => v === null ? '—' : v.toFixed(2) } }
      }
    };
  }, [datos, estilosLabels]);

  

  const heatmapOptions = React.useMemo(() => {
    const evaluados = datos.map(d => d.nombre || d.codigo || '—');
    const comps = [
      { key: 'comunicacion', label: 'Comunicación' },
      { key: 'respeto', label: 'Respeto' },
      { key: 'desarrollo', label: 'Desarrollo' },
      { key: 'adaptabilidad', label: 'Adaptabilidad' },
      { key: 'motivacion', label: 'Motivación' }
    ];
    const series = comps.map(c => ({
      name: c.label,
      data: evaluados.map((name, idx) => ({ x: name, y: (typeof datos[idx]?.[c.key] === 'number' ? datos[idx][c.key] : 0) }))
    }));

    return {
      series,
      options: {
        chart: { type: 'heatmap', height: 320 },
        dataLabels: { enabled: false },
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.5,
            colorScale: {
              ranges: [
                { from: 0, to: 1.9, color: '#fee2e2', name: 'Bajo' },
                { from: 2, to: 3.4, color: '#fef3c7', name: 'Medio' },
                { from: 3.5, to: 5, color: '#d1fae5', name: 'Alto' }
              ]
            }
          }
        },
        
        xaxis: { type: 'category' }
      }
    };
  }, [datos]);

  const radarOptions = React.useMemo(() => {
    const labels = ['Comunicación', 'Respeto', 'Desarrollo', 'Adaptabilidad', 'Motivación'];
    let source = datos;
    if (selectedCodigo) source = datos.filter(d => String(d.codigo) === String(selectedCodigo));
    const series = source.map(d => ({ name: d.nombre || d.codigo, data: [d.comunicacion ?? 0, d.respeto ?? 0, d.desarrollo ?? 0, d.adaptabilidad ?? 0, d.motivacion ?? 0] }));
    return {
      series,
      options: {
        chart: { type: 'radar', height: 640, toolbar: { show: true }, foreColor: '#000000' },
        plotOptions: { radar: { polygons: { strokeColors: '#374151', connectorColors: '#374151', fill: { colors: ['transparent'] }, opacity: 1 } } },
        grid: { show: false },
        xaxis: { categories: labels, labels: { style: { fontSize: '18px', colors: labels.map(() => '#000000') } } },
        yaxis: { min: 0, max: 5, tickAmount: 5, labels: { style: { fontSize: '16px', colors: ['#000000'] } } },
        stroke: { width: 4, curve: 'smooth' },
        markers: { size: 12 },
        fill: { opacity: 0.55 },
        colors: ['#4F46E5', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'],
        legend: { position: 'bottom', horizontalAlign: 'center', labels: { colors: '#000000' }, fontSize: '16px' },
        tooltip: { y: { formatter: (v:any) => v === null ? '—' : v.toFixed(2) } }
      }
    };
  }, [datos]);

  return (
    <section style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, transform: 'translateY(-80px)' }}>REPORTES</h1>
      <div style={{ marginTop: -40, marginBottom: 14, maxWidth: 520 }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Buscar evaluado por nombre</label>
        <div style={{ position: 'relative' }}>
          <input
            aria-label="Buscar evaluado"
            value={searchTerm}
            onChange={(e) => {
              const v = e.target.value;
              setSearchTerm(v);
              setMatches(findMatches(v));
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && matches.length) { setSelectedCodigo(matches[0].codigo); setMatches([]); } }}
            placeholder="Escribe nombre o código..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          {matches.length > 0 && (
            <ul style={{ position: 'absolute', left: 0, right: 0, zIndex: 40, background: '#fff', border: '1px solid #e5e7eb', marginTop: 6, listStyle: 'none', padding: 8, borderRadius: 6, maxHeight: 220, overflow: 'auto' }}>
              {matches.map(m => (
                <li key={m.codigo} style={{ padding: '6px 8px', cursor: 'pointer' }} onClick={() => { setSelectedCodigo(m.codigo); setMatches([]); setSearchTerm(m.nombre); }}>
                  {m.nombre}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 22, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Competencias</div>
              {typeof window !== 'undefined' && ReactApexChart ? (
                <ReactApexChart options={radarOptions.options} series={radarOptions.series} type="radar" height={640} />
              ) : (
                <div>Gráfico competencias</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Estilos</div>
              {typeof window !== 'undefined' && ReactApexChart ? (
                <ReactApexChart options={radarEstilosOptions.options} series={radarEstilosOptions.series} type="radar" height={640} />
              ) : (
                <div>Gráfico estilos</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}