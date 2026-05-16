import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Edit2, Trash2, Eye, EyeOff, Sparkles, ImagePlus, X, Save, Database } from 'lucide-react';
import { ApiService } from '../api';
import AuthImage from '../components/AuthImage';

const TABS = [
  { id: 'articulos', label: 'Artículos' },
  { id: 'clasificaciones', label: 'Clasificaciones' },
  { id: 'etiquetas', label: 'Etiquetas' },
];

const MAX_IMG_BYTES = 5 * 1024 * 1024;
const fileToDataURL = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export default function AdminConsejosScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('articulos');
  const [editor, setEditor] = useState(null); // { tipo: 'articulo'|'clasif'|'etiqueta', data: {} }
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [seedResult, setSeedResult] = useState(null); // {ok, ...} | {error}

  const handleSeedConfirm = async (conImagen) => {
    setSeedModalOpen(false);
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await ApiService.seedConsejosDemo({ generar_imagenes: conImagen });
      setSeedResult({ ok: true, ...res });
      setRefreshKey(k => k + 1);
    } catch (e) {
      setSeedResult({ error: e.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="screen-container" style={{ paddingBottom: '100px', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={26} />
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', flex: 1 }}>Gestionar consejos</h1>
        <button
          onClick={() => setSeedModalOpen(true)}
          disabled={seeding}
          title="Cargar lote completo de consejos predefinidos"
          style={{
            background: 'white', color: 'var(--primary)', border: '1.5px solid var(--primary)',
            borderRadius: '12px', padding: '8px 12px', cursor: seeding ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700'
          }}
        >
          <Database size={14} /> {seeding ? 'Cargando…' : 'Cargar lote'}
        </button>
      </div>

      {/* Modal: confirmar carga del lote */}
      {seedModalOpen && (
        <ConfirmModal
          titulo="Cargar lote de consejos"
          mensaje="Se añadirá un lote completo de consejos predefinidos a la base de datos (clasificaciones, etiquetas y artículos)."
          onClose={() => setSeedModalOpen(false)}
          opciones={[
            { label: 'Con imágenes IA (1-2 min)', icon: <Sparkles size={16} />, onClick: () => handleSeedConfirm(true), primary: true },
            { label: 'Sin imágenes (rápido)', icon: <Database size={16} />, onClick: () => handleSeedConfirm(false) },
          ]}
        />
      )}

      {/* Modal: resultado / errores */}
      {seedResult && (
        <ConfirmModal
          titulo={seedResult.error ? 'Error' : 'Carga completada'}
          mensaje={seedResult.error || (
            `• Clasificaciones creadas: ${seedResult.clasificaciones_creadas}\n` +
            `• Etiquetas creadas: ${seedResult.etiquetas_creadas}\n` +
            `• Artículos creados: ${seedResult.articulos_creados}` +
            (seedResult.actualizados ? `\n• Actualizados: ${seedResult.actualizados}` : '') +
            (seedResult.sin_imagen_ia ? `\n• Sin imagen IA: ${seedResult.sin_imagen_ia}` : '')
          )}
          onClose={() => setSeedResult(null)}
          opciones={[
            { label: 'Aceptar', onClick: () => setSeedResult(null), primary: true },
          ]}
        />
      )}

      {seeding && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(176,91,181,0.15)', zIndex: 1600,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14
        }}>
          <div style={{
            background: 'white', padding: '24px 32px', borderRadius: 16,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12
          }}>
            <div className="loader" />
            <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>Cargando contenido…</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'var(--primary)' : '#f0f0f5',
            color: tab === t.id ? 'white' : 'var(--text-light)',
            fontWeight: '700', fontSize: '12px'
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'articulos' && <ArticulosTab key={`a${refreshKey}`} onEdit={a => setEditor({ tipo: 'articulo', data: a })} onNew={() => setEditor({ tipo: 'articulo', data: null })} />}
      {tab === 'clasificaciones' && <ClasificacionesTab key={`c${refreshKey}`} onEdit={c => setEditor({ tipo: 'clasif', data: c })} onNew={() => setEditor({ tipo: 'clasif', data: null })} />}
      {tab === 'etiquetas' && <EtiquetasTab key={`e${refreshKey}`} onEdit={e => setEditor({ tipo: 'etiqueta', data: e })} onNew={() => setEditor({ tipo: 'etiqueta', data: null })} />}

      {editor?.tipo === 'articulo' && <ArticuloEditor data={editor.data} onClose={() => { setEditor(null); setRefreshKey(k => k + 1); }} />}
      {editor?.tipo === 'clasif' && <ClasificacionEditor data={editor.data} onClose={() => { setEditor(null); setRefreshKey(k => k + 1); }} />}
      {editor?.tipo === 'etiqueta' && <EtiquetaEditor data={editor.data} onClose={() => { setEditor(null); setRefreshKey(k => k + 1); }} />}
    </div>
  );
}

// ─────────── Artículos ───────────
function ArticulosTab({ onEdit, onNew }) {
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const imgVersion = React.useRef(Date.now()).current;  // buster constante en este montaje

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getArticulosConsejo({ incluirInactivos: true });
      setArticulos(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const handleDelete = async (a) => {
    if (!window.confirm(`¿Eliminar "${a.titulo}"? Esta acción no se puede deshacer.`)) return;
    try { await ApiService.eliminarArticuloConsejo(a.id); cargar(); } catch (e) { alert(e.message); }
  };

  const handleToggleActivo = async (a) => {
    try { await ApiService.actualizarArticuloConsejo(a.id, { activo: !a.activo }); cargar(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <button onClick={onNew} style={btnPrimario}><Plus size={16} /> Nuevo artículo</button>
      {loading ? <p style={{ marginTop: 16 }}>Cargando...</p> : (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {articulos.length === 0 && <p style={{ color: 'var(--text-light)' }}>Sin artículos.</p>}
          {articulos.map(a => (
            <div key={a.id} style={{ background: 'white', borderRadius: 12, padding: 12, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 60, height: 60, borderRadius: 10, background: '#f3e5f5', flexShrink: 0, overflow: 'hidden' }}>
                {a.tiene_imagen ? <AuthImage src={ApiService.imagenArticuloConsejoUrl(a.id, imgVersion)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 28, textAlign: 'center', paddingTop: 12 }}>✨</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.titulo}</div>
                <div style={{ fontSize: 11, color: a.activo ? '#10b981' : '#999' }}>{a.activo ? 'Activo' : 'Inactivo'}</div>
              </div>
              <button onClick={() => handleToggleActivo(a)} title={a.activo ? 'Desactivar' : 'Activar'} style={iconBtn}>{a.activo ? <Eye size={16} /> : <EyeOff size={16} />}</button>
              <button onClick={() => onEdit(a)} style={iconBtn}><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(a)} style={{ ...iconBtn, color: '#ef4444' }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticuloEditor({ data, onClose }) {
  const editing = !!data;
  const [clasificaciones, setClasificaciones] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [idCla, setIdCla] = useState(data?.id_clasificacion || '');
  const [titulo, setTitulo] = useState(data?.titulo || '');
  const [resumen, setResumen] = useState(data?.resumen || '');
  const [cuerpo, setCuerpo] = useState(data?.cuerpo || '');
  const [activo, setActivo] = useState(data?.activo !== false);
  const [etSel, setEtSel] = useState(new Set((data?.etiquetas || []).map(e => e.id)));
  const [imgPreview, setImgPreview] = useState(null); // dataUrl si se seleccionó nueva
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [promptImg, setPromptImg] = useState('');
  const [imgVersion, setImgVersion] = useState(() => Date.now()); // se bumpea tras regenerar
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [cls, ets] = await Promise.all([
        ApiService.getClasificacionesConsejo(true),
        ApiService.getEtiquetasConsejo(true),
      ]);
      setClasificaciones(cls);
      setEtiquetas(ets);
      if (!editing && cls.length > 0 && !idCla) setIdCla(cls[0].id);
    })();
  }, [editing]);

  const [aviso, setAviso] = useState(null); // {titulo, mensaje, tipo:'ok'|'error'|'info'}

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setAviso({ titulo: 'Formato no válido', mensaje: 'Solo JPG, PNG, WEBP o GIF.', tipo: 'error' }); return; }
    if (file.size > MAX_IMG_BYTES) { setAviso({ titulo: 'Imagen demasiado grande', mensaje: 'Máximo 5 MB.', tipo: 'error' }); return; }
    setImgPreview(await fileToDataURL(file));
  };

  const handleGenerar = async () => {
    if (!titulo.trim()) { setAviso({ titulo: 'Falta el título', mensaje: 'Escribe primero un título para que la IA pueda generar una portada acorde.', tipo: 'info' }); return; }
    if (editing) {
      setGenerando(true);
      try {
        await ApiService.regenerarImagenArticuloConsejo(data.id, promptImg || null);
        setImgPreview(null);              // descarta cualquier preview manual
        setImgVersion(Date.now());        // fuerza recarga de la imagen sin cerrar el modal
        setAviso({ titulo: 'Imagen generada', mensaje: 'La portada se ha regenerado correctamente.', tipo: 'ok' });
      } catch (e) {
        setAviso({ titulo: 'Error en Gemini', mensaje: 'No se pudo generar la imagen. Revise los logs del backend para más detalles.', tipo: 'error' });
      } finally { setGenerando(false); }
    } else {
      setAviso({ titulo: 'Guarda el artículo primero', mensaje: 'Crea el artículo con la opción "Generar imagen con IA" para que la portada se cree al guardar.', tipo: 'info' });
    }
  };

  const handleGuardar = async () => {
    if (!titulo.trim()) { setAviso({ titulo: 'Falta el título', mensaje: 'El título es obligatorio.', tipo: 'info' }); return; }
    if (!idCla) { setAviso({ titulo: 'Falta clasificación', mensaje: 'Selecciona una clasificación para el artículo.', tipo: 'info' }); return; }
    setGuardando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        resumen: resumen.trim(),
        cuerpo: cuerpo.trim(),
        etiquetas: Array.from(etSel),
      };
      if (editing) {
        payload.activo = activo;
        payload.id_clasificacion = idCla;
        if (imgPreview) payload.imagen_data = imgPreview;
        await ApiService.actualizarArticuloConsejo(data.id, payload);
      } else {
        payload.id_clasificacion = idCla;
        if (imgPreview) {
          payload.imagen_data = imgPreview;
        } else {
          payload.generar_imagen = true;
          if (promptImg.trim()) payload.prompt_imagen = promptImg.trim();
        }
        await ApiService.crearArticuloConsejo(payload);
      }
      onClose();
    } catch (e) {
      console.error('[Guardar artículo]', e);
      setAviso({ titulo: 'No se pudo guardar', mensaje: e.message || 'Error desconocido. Revise los logs del backend.', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={editing ? 'Editar artículo' : 'Nuevo artículo'}>
      <Label>Título</Label>
      <input value={titulo} onChange={e => setTitulo(e.target.value)} style={inputCss} />

      <Label>Clasificación</Label>
      <select value={idCla} onChange={e => setIdCla(e.target.value)} style={inputCss}>
        <option value="">— Selecciona —</option>
        {clasificaciones.map(c => <option key={c.id} value={c.id}>{c.nombre}{!c.activa ? ' (inactiva)' : ''}</option>)}
      </select>

      <Label>Resumen (1-2 frases)</Label>
      <textarea value={resumen} onChange={e => setResumen(e.target.value)} rows={2} style={inputCss} />

      <Label>Cuerpo (texto largo)</Label>
      <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={8} style={inputCss} />

      <Label>Etiquetas</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {etiquetas.map(e => {
          const sel = etSel.has(e.id);
          return (
            <button key={e.id} onClick={() => {
              const s = new Set(etSel);
              sel ? s.delete(e.id) : s.add(e.id);
              setEtSel(s);
            }} style={{
              padding: '4px 10px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: sel ? 'var(--primary)' : '#f0f0f5',
              color: sel ? 'white' : 'var(--text-dark)',
              fontSize: 12, fontWeight: 600
            }}>{e.nombre}</button>
          );
        })}
        {etiquetas.length === 0 && <span style={{ color: 'var(--text-light)', fontSize: 13 }}>Crea etiquetas en la pestaña "Etiquetas"</span>}
      </div>

      <Label>Imagen de portada</Label>
      <div style={{ marginBottom: 10 }}>
        {(imgPreview || data?.tiene_imagen) && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
            {imgPreview
              ? <img src={imgPreview} alt="" style={{ maxHeight: 140, borderRadius: 10, display: 'block' }} />
              : <AuthImage src={ApiService.imagenArticuloConsejoUrl(data.id, imgVersion)} style={{ maxHeight: 140, borderRadius: 10, display: 'block' }} />}
            {imgPreview && (
              <button onClick={() => setImgPreview(null)} style={{
                position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white',
                border: 'none', width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}><X size={12} /></button>
            )}
          </div>
        )}
      </div>
      <input type="text" placeholder="Prompt extra para la IA (opcional)" value={promptImg} onChange={e => setPromptImg(e.target.value)} style={inputCss} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePickImage} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{ ...btnSec, flex: 1 }}>
          <ImagePlus size={16} /> Subir
        </button>
        <button onClick={handleGenerar} disabled={generando} style={{ ...btnSec, flex: 1 }}>
          <Sparkles size={16} /> {generando ? 'Generando…' : (editing ? 'Regenerar IA' : 'Generar con IA')}
        </button>
      </div>

      {editing && (
        <ToggleSwitch
          checked={activo}
          onChange={setActivo}
          label={activo ? 'Activo' : 'Inactivo'}
          hint={activo ? 'Visible para los usuarios' : 'Oculto para los usuarios'}
        />
      )}

      <button onClick={handleGuardar} disabled={guardando} style={{ ...btnPrimario, width: '100%', justifyContent: 'center' }}>
        <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar'}
      </button>

      {aviso && (
        <AvisoModal
          titulo={aviso.titulo}
          mensaje={aviso.mensaje}
          tipo={aviso.tipo}
          onClose={() => {
            const cb = aviso.cerrar;
            setAviso(null);
            if (cb) cb();
          }}
        />
      )}
    </Modal>
  );
}

// ─────────── Clasificaciones ───────────
function ClasificacionesTab({ onEdit, onNew }) {
  const [items, setItems] = useState([]);
  const cargar = async () => setItems(await ApiService.getClasificacionesConsejo(true));
  useEffect(() => { cargar(); }, []);

  const handleDelete = async (c) => {
    if (!window.confirm(`¿Eliminar "${c.nombre}"? Se borrarán también los artículos asociados.`)) return;
    try { await ApiService.eliminarClasificacionConsejo(c.id); cargar(); } catch (e) { alert(e.message); }
  };
  const handleToggle = async (c) => {
    try { await ApiService.actualizarClasificacionConsejo(c.id, { activa: !c.activa }); cargar(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <button onClick={onNew} style={btnPrimario}><Plus size={16} /> Nueva clasificación</button>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(c => (
          <div key={c.id} style={{ background: 'white', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre}</div>
              {c.descripcion && <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{c.descripcion}</div>}
              <div style={{ fontSize: 11, color: c.activa ? '#10b981' : '#999', marginTop: 2 }}>{c.activa ? 'Activa' : 'Inactiva'}</div>
            </div>
            <button onClick={() => handleToggle(c)} style={iconBtn}>{c.activa ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            <button onClick={() => onEdit(c)} style={iconBtn}><Edit2 size={16} /></button>
            <button onClick={() => handleDelete(c)} style={{ ...iconBtn, color: '#ef4444' }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClasificacionEditor({ data, onClose }) {
  const editing = !!data;
  const [nombre, setNombre] = useState(data?.nombre || '');
  const [descripcion, setDescripcion] = useState(data?.descripcion || '');
  const [orden, setOrden] = useState(data?.orden || 0);
  const [activa, setActiva] = useState(data?.activa !== false);

  const handleGuardar = async () => {
    if (!nombre.trim()) { alert('Nombre requerido'); return; }
    try {
      if (editing) await ApiService.actualizarClasificacionConsejo(data.id, { nombre, descripcion, orden: Number(orden), activa });
      else await ApiService.crearClasificacionConsejo({ nombre, descripcion, orden: Number(orden) });
      onClose();
    } catch (e) { alert(e.message); }
  };
  return (
    <Modal onClose={onClose} titulo={editing ? 'Editar clasificación' : 'Nueva clasificación'}>
      <Label>Nombre</Label>
      <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputCss} />
      <Label>Descripción</Label>
      <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} style={inputCss} />
      <Label>Orden</Label>
      <input type="number" value={orden} onChange={e => setOrden(e.target.value)} style={inputCss} />
      {editing && (
        <ToggleSwitch
          checked={activa}
          onChange={setActiva}
          label={activa ? 'Activa' : 'Inactiva'}
          hint={activa ? 'Los usuarios pueden verla' : 'No aparece en el listado'}
        />
      )}
      <button onClick={handleGuardar} style={{ ...btnPrimario, width: '100%', justifyContent: 'center' }}><Save size={16} /> Guardar</button>
    </Modal>
  );
}

// ─────────── Etiquetas ───────────
function EtiquetasTab({ onEdit, onNew }) {
  const [items, setItems] = useState([]);
  const cargar = async () => setItems(await ApiService.getEtiquetasConsejo(true));
  useEffect(() => { cargar(); }, []);

  const handleDelete = async (e) => {
    if (!window.confirm(`¿Eliminar "${e.nombre}"?`)) return;
    try { await ApiService.eliminarEtiquetaConsejo(e.id); cargar(); } catch (err) { alert(err.message); }
  };
  const handleToggle = async (e) => {
    try { await ApiService.actualizarEtiquetaConsejo(e.id, { activa: !e.activa }); cargar(); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <button onClick={onNew} style={btnPrimario}><Plus size={16} /> Nueva etiqueta</button>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(e => (
          <div key={e.id} style={{ background: 'white', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{e.nombre}</div>
              <div style={{ fontSize: 11, color: e.activa ? '#10b981' : '#999' }}>{e.activa ? 'Activa' : 'Inactiva'}</div>
            </div>
            <button onClick={() => handleToggle(e)} style={iconBtn}>{e.activa ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            <button onClick={() => onEdit(e)} style={iconBtn}><Edit2 size={16} /></button>
            <button onClick={() => handleDelete(e)} style={{ ...iconBtn, color: '#ef4444' }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EtiquetaEditor({ data, onClose }) {
  const editing = !!data;
  const [nombre, setNombre] = useState(data?.nombre || '');
  const [activa, setActiva] = useState(data?.activa !== false);
  const handleGuardar = async () => {
    if (!nombre.trim()) { alert('Nombre requerido'); return; }
    try {
      if (editing) await ApiService.actualizarEtiquetaConsejo(data.id, { nombre, activa });
      else await ApiService.crearEtiquetaConsejo(nombre);
      onClose();
    } catch (e) { alert(e.message); }
  };
  return (
    <Modal onClose={onClose} titulo={editing ? 'Editar etiqueta' : 'Nueva etiqueta'}>
      <Label>Nombre</Label>
      <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputCss} />
      {editing && (
        <ToggleSwitch
          checked={activa}
          onChange={setActiva}
          label={activa ? 'Activa' : 'Inactiva'}
          hint={activa ? 'Disponible como filtro' : 'Oculta del filtro'}
        />
      )}
      <button onClick={handleGuardar} style={{ ...btnPrimario, width: '100%', justifyContent: 'center' }}><Save size={16} /> Guardar</button>
    </Modal>
  );
}

// ─────────── Helpers UI ───────────
function Modal({ titulo, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AvisoModal({ titulo, mensaje, tipo = 'info', onClose }) {
  const colores = {
    ok:    { borde: '#10b981', icono: '✓', fondo: '#ecfdf5' },
    error: { borde: '#F6416C', icono: '!', fondo: '#fef2f2' },
    info:  { borde: 'var(--primary)', icono: 'i', fondo: 'rgba(176,91,181,0.08)' },
  };
  const c = colores[tipo] || colores.info;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1800,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 18, padding: 22, width: '100%', maxWidth: 360,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', borderTop: `4px solid ${c.borde}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: c.fondo, color: c.borde,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16
          }}>{c.icono}</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-dark)' }}>{titulo}</h3>
        </div>
        <p style={{ margin: '4px 0 18px', fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.5 }}>{mensaje}</p>
        <button onClick={onClose} style={{
          width: '100%', padding: '11px 14px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, var(--primary) 0%, #F6416C 100%)',
          color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer'
        }}>Aceptar</button>
      </div>
    </div>
  );
}

function ConfirmModal({ titulo, mensaje, onClose, opciones }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 18, padding: 22, width: '100%', maxWidth: 380,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--primary)' }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {mensaje}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opciones.map((o, i) => (
            <button key={i} onClick={o.onClick} style={{
              padding: '11px 14px', borderRadius: 12, border: o.primary ? 'none' : '1.5px solid var(--primary)',
              background: o.primary ? 'linear-gradient(135deg, var(--primary) 0%, #F6416C 100%)' : 'white',
              color: o.primary ? 'white' : 'var(--primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const Label = ({ children }) => <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 600, margin: '6px 0 4px' }}>{children}</div>;

function ToggleSwitch({ checked, onChange, label, hint }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: checked ? 'rgba(176,91,181,0.08)' : '#f5f5fa',
        border: `1.5px solid ${checked ? 'var(--primary)' : '#eee'}`,
        borderRadius: 14, padding: '12px 14px',
        cursor: 'pointer', marginBottom: 14, userSelect: 'none', transition: 'all 0.2s'
      }}
    >
      <div style={{
        width: 42, height: 24, borderRadius: 14,
        background: checked ? 'var(--primary)' : '#d1d5db',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3, left: checked ? 21 : 3, transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: checked ? 'var(--primary)' : 'var(--text-dark)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}
const inputCss = { width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit' };
const btnPrimario = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnSec = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', borderRadius: 12, border: '1.5px solid #eee', background: 'white', color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--primary)' };
