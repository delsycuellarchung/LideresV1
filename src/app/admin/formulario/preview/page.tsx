"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ModalSendForms from "./ModalSendForms";

export default function FormPreviewPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<any[]>([]);
  const [instrucciones, setInstrucciones] = React.useState<{ etiqueta: string; descripcion?: string }[]>([]);
  const [responses, setResponses] = React.useState<Record<string,string>>({});
  const [saved, setSaved] = React.useState<string | null>(null);
  const [showSendModal, setShowSendModal] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('formulario_afirmaciones');
      if (raw) setItems(JSON.parse(raw));
    } catch (e) { console.warn(e); }
    try {
      const rawI = localStorage.getItem('formulario_instrucciones');
      if (rawI) setInstrucciones(JSON.parse(rawI));
    } catch (e) { console.warn(e); }
  }, []);

  const determineTipoCategory = (tipoVal?: string | null) => {
    if (!tipoVal) return 'unknown';
    // we'll check instructions/estilos lists if available in localStorage, but for preview assume naming
    // fallback: if tipo contains 'estilo' word
    if (tipoVal.toLowerCase().includes('estilo')) return 'estilo';
    return 'competencia';
  };

  const grouped = React.useMemo(() => {
    const comp: any[] = [];
    const est: any[] = [];
    (items || []).forEach((it) => {
      const cat = determineTipoCategory(it.tipo || null);
      if (cat === 'estilo') {
        est.push(it);
      } else if (cat === 'competencia') {
        comp.push(it);
      }
    });
    return { competencias: comp, estilos: est };
  }, [items]);

  const handleChange = (key: string, value: string) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    const id = `resp_${Date.now()}`;
    try {
      const raw = localStorage.getItem('form_responses') || '[]';
      const arr = JSON.parse(raw);
      arr.push({ id, createdAt: new Date().toISOString(), responses });
      localStorage.setItem('form_responses', JSON.stringify(arr));
      setSaved(id);
    } catch (e) { console.warn(e); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 40, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: '#0F172A' }}>Formulario de Evaluación</h2>
          <p style={{ color: 'rgba(15,23,42,0.65)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
            Por favor, selecciona las opciones según las instrucciones proporcionadas. Tus respuestas son confidenciales.
          </p>

          {!items || items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', background: 'rgba(15,23,42,0.02)', borderRadius: 8, color: 'rgba(15,23,42,0.6)' }}>
              No hay afirmaciones disponibles.
            </div>
          ) : (
            <div>
              {grouped.competencias.length > 0 && (
                <div style={{ marginBottom: 48 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#0F172A', borderBottom: '3px solid #4F46E5', paddingBottom: 12, display: 'inline-block' }}>
                    Competencias
                  </h3>
                  <div style={{ marginTop: 24 }}>
                    {grouped.competencias.map((it:any, idx:number) => {
                      return (
                        <div key={idx} style={{ marginBottom: 20, padding: 18, background: 'white', borderRadius: 12, border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#0F172A' }}>
                            {it.pregunta || 'Pregunta no disponible'}
                          </div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {instrucciones.length === 0 && <div style={{ color: 'rgba(15,23,42,0.6)', fontSize: 14 }}>No hay instrucciones disponibles.</div>}
                            {instrucciones.map((ins, i) => {
                              const selected = responses[`comp-${idx}`]===ins.etiqueta;
                              return (
                                <label key={`${idx}-opt-${i}`} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 8, borderRadius: 9999, transition: 'box-shadow 0.15s', boxShadow: selected ? '0 6px 18px rgba(79,70,229,0.08)' : 'none' }}>
                                  <input 
                                    type="radio" 
                                    name={`comp-${idx}`} 
                                    value={ins.etiqueta} 
                                    checked={selected} 
                                    onChange={() => handleChange(`comp-${idx}`, ins.etiqueta)} 
                                    style={{ marginRight: 8, width: 20, height: 20, cursor: 'pointer', accentColor: '#4F46E5', transform: selected ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.12s' }}
                                  />
                                  <div>
                                  <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{ins.etiqueta}</div>
                                  <div style={{ fontSize: 13, color: 'rgba(15,23,42,0.65)', maxWidth: 220, wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>{ins.descripcion}</div>
                                </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {grouped.estilos.length > 0 && (
                <div style={{ marginBottom: 48 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#0F172A', borderBottom: '3px solid #7C3AED', paddingBottom: 12, display: 'inline-block' }}>
                    Estilos de Liderazgo
                  </h3>
                  <div style={{ marginTop: 24 }}>
                    {grouped.estilos.map((it:any, idx:number) => {
                      return (
                        <div key={idx} style={{ marginBottom: 20, padding: 18, background: 'white', borderRadius: 12, border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 8px 30px rgba(15,23,42,0.04)' }}>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#0F172A' }}>
                            {it.pregunta || 'Pregunta no disponible'}
                          </div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {instrucciones.length === 0 && <div style={{ color: 'rgba(15,23,42,0.6)', fontSize: 14 }}>No hay instrucciones disponibles.</div>}
                            {instrucciones.map((ins, i) => {
                              const selected = responses[`est-${idx}`]===ins.etiqueta;
                              return (
                                <label key={`${idx}-opt-${i}`} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 8, borderRadius: 9999, transition: 'box-shadow 0.15s', boxShadow: selected ? '0 6px 18px rgba(124,58,237,0.08)' : 'none' }}>
                                  <input 
                                    type="radio" 
                                    name={`est-${idx}`} 
                                    value={ins.etiqueta} 
                                    checked={selected} 
                                    onChange={() => handleChange(`est-${idx}`, ins.etiqueta)} 
                                    style={{ marginRight: 8, width: 20, height: 20, cursor: 'pointer', accentColor: '#7C3AED', transform: selected ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.12s' }}
                                  />
                                  <div>
                                  <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{ins.etiqueta}</div>
                                  <div style={{ fontSize: 13, color: 'rgba(15,23,42,0.65)', maxWidth: 220, wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>{ins.descripcion}</div>
                                </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '2px solid rgba(15,23,42,0.06)', paddingTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button 
                  className="btn-press" 
                  onClick={submit}
                  style={{ 
                    padding: '14px 32px', 
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontWeight: 600, 
                    fontSize: 16,
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                    transition: 'all 0.3s'
                  }}
                >
                  Guardar Respuestas
                </button>
                <button 
                  className="btn-send" 
                  onClick={() => setShowSendModal(true)}
                  style={{ 
                    padding: '14px 32px', 
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontWeight: 600, 
                    fontSize: 16,
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.3s'
                  }}
                >
                  📧 Enviar a Evaluadores
                </button>
                {saved && <div style={{ marginTop: 16, padding: 12, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, color: '#16A34A', fontWeight: 500, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  ✓ Respuestas guardadas correctamente (ID: {saved})
                </div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <ModalSendForms
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        formData={{ items, instrucciones }}
      />
    </div>
  );
}
