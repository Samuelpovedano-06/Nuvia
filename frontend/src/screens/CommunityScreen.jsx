import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Send, X, Trash2, UserPlus, UserCheck, Share2, ChevronLeft, ImagePlus, Ban, Flag, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';
import AuthImage from '../components/AuthImage';

const MAX_IMG_BYTES = 5 * 1024 * 1024;
const MAX_PUBLICACION = 1000;
const MAX_RESPUESTA = 600;

function CharCounter({ value, max }) {
  const len = (value || '').length;
  const ratio = len / max;
  let color = 'var(--text-light)';
  if (ratio >= 1) color = '#DC2626';
  else if (ratio >= 0.8) color = '#D97706';
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color,
      textAlign: 'right', marginTop: 4,
      transition: 'color 0.2s'
    }}>
      {len} / {max}
    </div>
  );
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const CATEGORIAS = [
  { id: null, label: 'Todo', emoji: '✨' },
  { id: 'general', label: 'General', emoji: '💬' },
  { id: 'salud', label: 'Salud', emoji: '🩺' },
  { id: 'menstruacion', label: 'Menstruación', emoji: '🌊' },
  { id: 'sexo_placer', label: 'Sexo y placer', emoji: '🌸' },
  { id: 'embarazo', label: 'Embarazo', emoji: '🤱' },
  { id: 'anticoncepcion', label: 'Anticoncepción', emoji: '💊' },
  { id: 'fertilidad', label: 'Fertilidad', emoji: '🌱' },
  { id: 'salud_mental', label: 'Salud mental', emoji: '🧠' },
  { id: 'relaciones', label: 'Relaciones', emoji: '💕' },
  { id: 'nutricion', label: 'Nutrición', emoji: '🥗' },
  { id: 'ejercicio', label: 'Ejercicio', emoji: '🏃‍♀️' },
  { id: 'adolescencia', label: 'Adolescencia', emoji: '🌟' },
  { id: 'menopausia', label: 'Menopausia', emoji: '🌙' },
];

const TABS = [
  { id: 'popular', label: 'Popular' },
  { id: 'mis', label: 'Mías' },
  { id: 'guardados', label: 'Guardados' },
  { id: 'siguiendo', label: 'Siguiendo' },
];

const REACCIONES = ['❤️', '🔥', '💪', '🤗', '😢'];

const AVATARS = ['🐱', '🦊', '🐰', '🦋', '🐝', '🦚', '🦜', '🐸', '🐨', '🦁', '🐯', '🦄', '🐙', '🌸', '🌺'];
const AV_COLORS = ['#FF9A9E', '#B05BB5', '#F6416C', '#9B6C98', '#4ECDC4', '#E87D3E', '#5B8EC4', '#9C6ADE', '#6DB33F', '#E74C3C'];

function getAvatar(seed) {
  if (!seed) return { emoji: '🐱', bg: '#B05BB5' };
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const a = Math.abs(h);
  return { emoji: AVATARS[a % AVATARS.length], bg: AV_COLORS[(a >> 4) % AV_COLORS.length] };
}

function timeAgo(iso) {
  if (!iso) return '';
  // Si el ISO no trae zona horaria, asumir UTC para evitar desfase con la hora local
  const hasTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  const date = new Date(hasTZ ? iso : iso + 'Z');
  const diff = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function fmtNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

const CatLabel = ({ id }) => {
  const cat = CATEGORIAS.find(c => c.id === id) || CATEGORIAS[1];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: 'rgba(176,91,181,0.08)', color: 'var(--primary)',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600'
    }}>
      {cat.emoji} {cat.label}
    </span>
  );
};

export default function CommunityScreen() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('popular');
  const [categoria, setCategoria] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Detail view
  const [activePost, setActivePost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState(null); // { dataUrl }
  const replyFileInputRef = useRef(null);

  const handlePickReplyImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      alert('Solo imágenes JPG, PNG, WEBP o GIF');
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      alert('La imagen es demasiado grande (máx 5MB)');
      return;
    }
    const dataUrl = await fileToDataURL(file);
    setReplyImage({ dataUrl });
  };
  const [loadingReply, setLoadingReply] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const replyEndRef = useRef(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState(null); // { dataUrl, file }
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef(null);

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG, WEBP o GIF');
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      alert('La imagen es demasiado grande (máx 5MB)');
      return;
    }
    const dataUrl = await fileToDataURL(file);
    setNewImage({ dataUrl, file });
  };

  useEffect(() => {
    setPage(1);
    setPosts([]);
    setHasMore(true);
    fetchPosts(1, true);
  }, [tab, categoria]);

  // Re-render cada 30s para que los "Ahora / 1m / 2m..." se actualicen solos
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Polling de publicaciones en tiempo real (cada 6s) — sin spinner, fusiona por id
  useEffect(() => {
    const id = setInterval(() => refreshFirstPage(), 6000);
    return () => clearInterval(id);
  }, [tab, categoria]);

  const refreshFirstPage = async () => {
    try {
      const data = await ApiService.getPublicaciones({ tab, categoria, page: 1 });
      const serverIds = new Set(data.map(p => p.id));
      setPosts(prev => {
        const byId = new Map(data.map(p => [p.id, p]));
        // Reemplaza los de la primera página, conserva los más viejos, elimina los que el server ya no tiene si están en page 1
        const firstPageIds = new Set(prev.slice(0, 20).map(p => p.id));
        const conservados = prev.filter(p => !firstPageIds.has(p.id) || serverIds.has(p.id));
        const merged = conservados.map(p => byId.get(p.id) || p);
        const knownIds = new Set(merged.map(p => p.id));
        const nuevos = data.filter(p => !knownIds.has(p.id));
        return [...nuevos, ...merged];
      });
      // Si el post abierto fue eliminado por otro usuario, cierra el detalle
      setActivePost(prev => {
        if (!prev) return prev;
        const updated = data.find(p => p.id === prev.id);
        if (updated) return updated;
        // No está en page 1 → puede que sea más antiguo o haya sido borrado.
        // Si estaba en page 1 antes y ya no aparece, lo cerramos
        return prev;
      });
    } catch {}
  };

  // Polling de respuestas mientras hay un post abierto (cada 4s).
  // Si la publicación ya no existe (eliminada por otra persona), cierra el overlay.
  useEffect(() => {
    if (!activePost) return;
    const id = setInterval(async () => {
      try {
        const data = await ApiService.getRespuestas(activePost.id);
        setReplies(data);
      } catch (e) {
        if (String(e?.message || '').includes('404')) {
          setActivePost(null);
          setPosts(prev => prev.filter(p => p.id !== activePost.id));
        }
      }
    }, 4000);
    return () => clearInterval(id);
  }, [activePost?.id]);

  const fetchPosts = async (p = page, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await ApiService.getPublicaciones({ tab, categoria, page: p });
      setPosts(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
  };

  const updatePost = (updated) =>
    setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));

  const handleLike = async (postId, e) => {
    e?.stopPropagation();
    const res = await ApiService.toggleLikeForo(postId);
    updatePost({ id: postId, is_liked: res.liked, likes_count: res.likes_count });
    if (activePost?.id === postId) setActivePost(p => ({ ...p, is_liked: res.liked, likes_count: res.likes_count }));
  };

  const handleFav = async (postId, e) => {
    e?.stopPropagation();
    const res = await ApiService.toggleFavoritoForo(postId);
    updatePost({ id: postId, is_guardado: res.guardado, favs_count: res.favs_count });
    if (activePost?.id === postId) setActivePost(p => ({ ...p, is_guardado: res.guardado, favs_count: res.favs_count }));
  };

  const handleReaccion = async (emoji) => {
    if (!activePost) return;
    const res = await ApiService.toggleReaccionForo(activePost.id, emoji);
    setActivePost(p => ({ ...p, reacciones: res.reacciones, mi_reaccion: res.mi_reaccion }));
    updatePost({ id: activePost.id, reacciones: res.reacciones, mi_reaccion: res.mi_reaccion });
    setShowReactions(false);
  };

  const [confirmBlock, setConfirmBlock] = useState(null); // { idAutor }
  const [reportPost, setReportPost] = useState(null);     // post a reportar
  const [reportMotivo, setReportMotivo] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportesPendientes, setReportesPendientes] = useState(0);
  const [avisos, setAvisos] = useState([]);               // avisos pendientes para la usuaria
  const [showBloqueados, setShowBloqueados] = useState(false);
  const [bloqueadosList, setBloqueadosList] = useState([]);
  const [bloqueadosLoading, setBloqueadosLoading] = useState(false);

  const abrirBloqueados = async () => {
    setShowBloqueados(true);
    setBloqueadosLoading(true);
    try {
      const list = await ApiService.getBloqueadosForo();
      setBloqueadosList(list);
    } finally { setBloqueadosLoading(false); }
  };

  const desbloquearUsuaria = async (idAutor) => {
    try {
      await ApiService.toggleBloqueoForo(idAutor);
      setBloqueadosList(prev => prev.filter(b => b.id_autor !== idAutor));
      mostrarToast('Usuaria desbloqueada. Refresca para ver sus publicaciones.');
    } catch (err) {
      mostrarToast(err.message || 'Error al desbloquear', 'error');
    }
  };

  // Polling badge admin
  useEffect(() => {
    if (user?.rol !== 'admin') return;
    const fetchCount = async () => {
      try {
        const r = await ApiService.adminReportesCount();
        setReportesPendientes(r.pendientes || 0);
      } catch {}
    };
    fetchCount();
    const t = setInterval(fetchCount, 6000);
    return () => clearInterval(t);
  }, [user?.rol]);

  // Avisos pendientes (eliminaciones / banes) en tiempo real — polling cada 5s
  useEffect(() => {
    const fetchAvisos = async () => {
      try {
        const list = await ApiService.getMisAvisosForo();
        if (list.length === 0) return;
        setAvisos(prev => {
          const keys = new Set(prev.map(a => `${a.tipo}-${a.id}`));
          const nuevos = list.filter(a => !keys.has(`${a.tipo}-${a.id}`));
          return nuevos.length ? [...prev, ...nuevos] : prev;
        });
      } catch {}
    };
    fetchAvisos();
    const t = setInterval(fetchAvisos, 5000);
    return () => clearInterval(t);
  }, []);

  const cerrarAviso = async (av) => {
    try {
      await ApiService.marcarAvisoVistoForo(av.tipo, av.id);
    } catch {}
    setAvisos(prev => prev.filter(a => !(a.tipo === av.tipo && a.id === av.id)));
  };

  const handleReportar = async () => {
    if (!reportPost) return;
    setReportSending(true);
    try {
      const res = await ApiService.reportarPublicacion(reportPost.id, reportMotivo);
      if (res.ya_reportado) {
        mostrarToast('Ya habías reportado esta publicación');
      } else {
        mostrarToast('Publicación reportada. Gracias.');
      }
      setReportPost(null);
      setReportMotivo('');
    } catch (err) {
      mostrarToast(err.message || 'Error al reportar', 'error');
    } finally {
      setReportSending(false);
    }
  };

  const handleBloquear = async (idAutor) => {
    if (!idAutor) return;
    setConfirmBlock(null);
    try {
      const res = await ApiService.toggleBloqueoForo(idAutor);
      if (res.bloqueado) {
        // Quitar todos los posts de ese autor del feed actual y cerrar overlay
        setPosts(prev => prev.filter(p => p.id_autor !== idAutor));
        if (activePost?.id_autor === idAutor) setActivePost(null);
        mostrarToast('Usuaria bloqueada. No verás más sus publicaciones.');
      } else {
        mostrarToast('Usuaria desbloqueada. Refresca para ver sus publicaciones.');
      }
    } catch (err) {
      mostrarToast(err.message || 'Error al bloquear', 'error');
    }
  };

  const handleSeguir = async (idAutor, e) => {
    e?.stopPropagation();
    if (!idAutor) {
      alert('No se pudo identificar al autor. Reinicia el backend para aplicar la actualización.');
      return;
    }
    try {
      const res = await ApiService.toggleSeguirForo(idAutor);
      // Actualiza es_seguido en TODOS los posts del mismo autor (no solo el abierto)
      setPosts(prev => prev.map(p => p.id_autor === idAutor ? { ...p, es_seguido: res.siguiendo } : p));
      if (activePost) setActivePost(p => ({ ...p, es_seguido: res.siguiendo }));
    } catch (err) {
      console.error('Error seguir:', err);
      alert('No se pudo seguir al usuario');
    }
  };

  const openPost = async (post) => {
    setActivePost(post);
    setShowReactions(false);
    const data = await ApiService.getRespuestas(post.id);
    setReplies(data);
    setTimeout(() => replyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if ((!replyText.trim() && !replyImage) || !activePost) return;
    setLoadingReply(true);
    try {
      const r = await ApiService.crearRespuesta(activePost.id, replyText, replyImage?.dataUrl || null);
      setReplies(prev => [...prev, r]);
      setReplyText('');
      setReplyImage(null);
      updatePost({ id: activePost.id, comments_count: (activePost.comments_count || 0) + 1 });
      setActivePost(p => ({ ...p, comments_count: (p.comments_count || 0) + 1 }));
      setTimeout(() => replyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      await mostrarBaneSiAplica(err);
    } finally {
      setLoadingReply(false);
    }
  };

  // Confirmación de eliminado
  const [confirmDelete, setConfirmDelete] = useState(null); // { tipo: 'post'|'reply', id, e? }

  const pedirConfirmDelete = (tipo, id, e) => {
    e?.stopPropagation();
    setConfirmDelete({ tipo, id });
  };

  const ejecutarDelete = async () => {
    if (!confirmDelete) return;
    const { tipo, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      if (tipo === 'post') {
        await ApiService.eliminarPublicacion(id);
        setPosts(prev => prev.filter(p => p.id !== id));
        if (activePost?.id === id) setActivePost(null);
        mostrarToast('Publicación eliminada');
      } else {
        await ApiService.eliminarRespuesta(id);
        setReplies(prev => prev.filter(r => r.id !== id));
        if (activePost) {
          updatePost({ id: activePost.id, comments_count: Math.max(0, (activePost.comments_count || 1) - 1) });
          setActivePost(p => ({ ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) }));
        }
        mostrarToast('Respuesta eliminada');
      }
    } catch (err) {
      mostrarToast(err.message || 'Error al eliminar', 'error');
    }
  };

  // Si el error indica bane, descarga la info del bane y la muestra como aviso
  const mostrarBaneSiAplica = async (err) => {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('baneada')) {
      try {
        const bane = await ApiService.getMiBaneActivo();
        if (bane) {
          setShowCreate(false);
          // Mostramos el bane inmediatamente (al inicio de la cola)
          setAvisos(prev => {
            const k = `bane-${bane.id}`;
            if (prev.find(a => `${a.tipo}-${a.id}` === k)) return prev;
            return [bane, ...prev];
          });
          return true;
        }
      } catch {}
    }
    mostrarToast(msg || 'Error', 'error');
    return false;
  };

  const handlePublish = async () => {
    if (!newContent.trim() && !newImage) return;
    setPublishing(true);
    try {
      const pub = await ApiService.crearPublicacion(newContent, newImage?.dataUrl || null);
      setPosts(prev => [pub, ...prev]);
      setShowCreate(false);
      setNewContent('');
      setNewImage(null);
    } catch (err) {
      await mostrarBaneSiAplica(err);
    } finally {
      setPublishing(false);
    }
  };

  // Share = compartir con pareja
  const [sharePost, setSharePost] = useState(null);     // post a compartir
  const [shareParejas, setShareParejas] = useState([]); // lista de parejas
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState(null);             // { mensaje, tipo: 'ok'|'error' }

  const mostrarToast = (mensaje, tipo = 'ok') => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 2500);
  };

  const handleShare = async (post, e) => {
    e?.stopPropagation();
    try {
      const parejas = await ApiService.getParejas();
      if (!parejas || parejas.length === 0) {
        mostrarToast('No tienes ninguna pareja vinculada para compartir', 'error');
        return;
      }
      if (parejas.length === 1) {
        // Pareja única → enviar directamente
        await ApiService.compartirPublicacion(parejas[0].other_id || parejas[0].id_pareja, post.id);
        mostrarToast('Publicación enviada a tu pareja');
        return;
      }
      // Varias parejas → modal de elección
      setShareParejas(parejas);
      setSharePost(post);
    } catch (err) {
      mostrarToast(err.message || 'Error al compartir', 'error');
    }
  };

  const handleShareTo = async (idPareja) => {
    if (!sharePost) return;
    setSharing(true);
    try {
      await ApiService.compartirPublicacion(idPareja, sharePost.id);
      setSharePost(null);
      setShareParejas([]);
      mostrarToast('Publicación enviada');
    } catch (err) {
      mostrarToast(err.message || 'Error al compartir', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <div className="screen-container" style={{ paddingBottom: '100px', overflowX: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px', marginTop: '2px' }}
          >
            <ChevronLeft size={26} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: 'var(--text-dark)' }}>Comunidad</h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)' }}>Un espacio seguro y anónimo para compartir</p>
          </div>
        </div>

        {/* Acciones (Bloqueadas / Reportes) — debajo del título, encima de los tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button
            onClick={abrirBloqueados}
            style={{
              background: 'white', border: '1.5px solid var(--primary)',
              borderRadius: '14px', padding: '8px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              color: 'var(--primary)', fontWeight: '700', fontSize: '13px'
            }}
          >
            <Ban size={15} /> Bloqueadas
          </button>
          {user?.rol === 'admin' && (
            <button
              onClick={() => navigate('/admin/reportes')}
              style={{
                position: 'relative',
                background: 'white', border: '1.5px solid var(--primary)',
                borderRadius: '14px', padding: '8px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'var(--primary)', fontWeight: '700', fontSize: '13px'
              }}
            >
              <Flag size={15} /> Reportes
              {reportesPendientes > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#DC2626', color: 'white', borderRadius: '10px',
                  minWidth: '20px', height: '20px', padding: '0 6px',
                  fontSize: '11px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.4)'
                }}>{reportesPendientes > 99 ? '99+' : reportesPendientes}</span>
              )}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px 4px', borderRadius: '25px', border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--primary)' : '#f0f0f5',
              color: tab === t.id ? 'white' : 'var(--text-light)',
              fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Categorías */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          {CATEGORIAS.map(c => (
            <button key={String(c.id)} onClick={() => setCategoria(prev => prev === c.id ? null : c.id)} style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: categoria === c.id ? 'var(--primary)' : '#f5f5fa',
              color: categoria === c.id ? 'white' : 'var(--text-dark)',
              fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {posts.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5 }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>
              {tab === 'siguiendo' ? '👥' : tab === 'mis' ? '✍️' : tab === 'guardados' ? '🔖' : '💬'}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
              {tab === 'siguiendo' ? 'Sigue a otras usuarias para ver sus publicaciones aquí.'
                : tab === 'mis' ? 'Aún no has publicado nada. ¡Comparte algo!'
                  : tab === 'guardados' ? 'Aún no has guardado ninguna publicación.'
                    : 'No hay publicaciones en esta categoría aún.'}
            </p>
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post}
            onOpen={() => openPost(post)}
            onLike={e => handleLike(post.id, e)}
            onFav={e => handleFav(post.id, e)}
            onDelete={e => pedirConfirmDelete('post', post.id, e)}
            onShare={e => handleShare(post, e)}
            puedeEliminar={post.es_mia || user?.rol === 'admin'}
          />)
        )}

        {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)', fontSize: '13px' }}>Cargando...</div>}

        {hasMore && !loading && posts.length > 0 && (
          <button onClick={loadMore} style={{
            width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #eee',
            background: 'white', color: 'var(--text-light)', fontSize: '13px', cursor: 'pointer', marginTop: '8px'
          }}>Ver más</button>
        )}
      </div>

      {/* FAB — fuera del screen-container para evitar problemas de stacking context */}
      {!showCreate && !activePost && (
      <button onClick={() => setShowCreate(true)} style={{
        position: 'fixed', bottom: '90px', right: '20px', zIndex: 1200,
        background: 'linear-gradient(135deg, var(--primary) 0%, #F6416C 100%)',
        color: 'white', border: 'none', borderRadius: '20px',
        padding: '12px 20px', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 4px 20px rgba(176,91,181,0.4)'
      }}>
        <span style={{ fontSize: '18px' }}></span> Nueva publicación
      </button>
      )}

      {/* Post Detail Overlay */}
      {activePost && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: '74px',
          background: 'white', zIndex: 800, display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Detail header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f5', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setActivePost(null)} style={{ background: '#f5f5fa', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} color="#666" />
            </button>
            <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-dark)' }}>Publicación</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* Post full */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <AvatarRow seed={activePost.avatar_seed} time={activePost.created_at} />
                {(activePost.es_mia || user?.rol === 'admin') && (
                  <button onClick={e => pedirConfirmDelete('post', activePost.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {!activePost.es_mia && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <button onClick={e => handleSeguir(activePost.id_autor, e)} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 12px', borderRadius: '12px', border: '1.5px solid var(--primary)',
                    background: activePost.es_seguido ? 'var(--primary)' : 'transparent',
                    color: activePost.es_seguido ? 'white' : 'var(--primary)',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                  }}>
                    {activePost.es_seguido ? <><UserCheck size={12} /> Siguiendo</> : <><UserPlus size={12} /> Seguir</>}
                  </button>
                  <button
                    onClick={() => setReportPost(activePost)}
                    title="Reportar publicación"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '12px', border: '1.5px solid #F59E0B',
                      background: 'transparent', color: '#D97706',
                      fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    <Flag size={12} /> Reportar
                  </button>
                  <button
                    onClick={() => setConfirmBlock({ idAutor: activePost.id_autor })}
                    title="Bloquear a esta usuaria"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '12px', border: '1.5px solid #ef4444',
                      background: 'transparent', color: '#ef4444',
                      fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    <Ban size={12} /> Bloquear
                  </button>
                </div>
              )}
              {activePost.contenido && (
                <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: '1.6', color: 'var(--text-dark)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{activePost.contenido}</p>
              )}
              {activePost.tiene_imagen && (
                <AuthImage
                  src={ApiService.imagenForoUrl(activePost.id)}
                  style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '12px', marginBottom: '12px', background: '#f5f5fa' }}
                />
              )}
              <CatLabel id={activePost.categoria} />

              {/* Actions */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f5' }}>
                <ActionBtn icon={<Heart size={18} fill={activePost.is_liked ? '#F6416C' : 'none'} color={activePost.is_liked ? '#F6416C' : '#999'} />}
                  label={fmtNum(activePost.likes_count)} onClick={() => handleLike(activePost.id)} />
                <ActionBtn icon={<MessageCircle size={18} color="#999" />} label={fmtNum(activePost.comments_count)} />
                <ActionBtn icon={<Bookmark size={18} fill={activePost.is_guardado ? 'var(--primary)' : 'none'} color={activePost.is_guardado ? 'var(--primary)' : '#999'} />}
                  label={fmtNum(activePost.favs_count || 0)} onClick={() => handleFav(activePost.id)} />
                <ActionBtn icon={<Share2 size={18} color="#999" />} label="Compartir" onClick={e => handleShare(activePost, e)} />
              </div>

              {/* Emoji reactions */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {REACCIONES.map(emoji => {
                    const count = activePost.reacciones?.[emoji] || 0;
                    const active = activePost.mi_reaccion === emoji;
                    return (
                      <button key={emoji} onClick={() => handleReaccion(emoji)} style={{
                        padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        background: active ? 'rgba(176,91,181,0.15)' : '#f5f5fa',
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px',
                        fontWeight: active ? '700' : '400', transition: 'all 0.15s'
                      }}>
                        {emoji} {count > 0 && <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Replies */}
            <h3 style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {replies.length} {replies.length === 1 ? 'Respuesta' : 'Respuestas'}
            </h3>
            {replies.map(r => (
              <ReplyCard key={r.id} reply={r}
                puedeEliminar={r.es_mia || user?.rol === 'admin'}
                onDelete={() => pedirConfirmDelete('reply', r.id)}
                onLike={async () => {
                  const res = await ApiService.toggleLikeForo(r.id);
                  setReplies(prev => prev.map(x => x.id === r.id ? { ...x, is_liked: res.liked, likes_count: res.likes_count } : x));
                }}
              />
            ))}
            <div ref={replyEndRef} />
          </div>

          {/* Reply input */}
          <div style={{ borderTop: '1px solid #f0f0f5', background: 'white' }}>
            {replyImage && (
              <div style={{ padding: '8px 12px 0', position: 'relative', display: 'inline-block' }}>
                <img src={replyImage.dataUrl} alt="" style={{ maxHeight: '80px', borderRadius: '10px', display: 'block' }} />
                <button onClick={() => setReplyImage(null)} style={{
                  position: 'absolute', top: '4px', right: '4px',
                  background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                  width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <X size={12} />
                </button>
              </div>
            )}
            <form onSubmit={handleReply} style={{ padding: '12px', display: 'flex', gap: '8px' }}>
              <input ref={replyFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePickReplyImage} style={{ display: 'none' }} />
              <button type="button" onClick={() => replyFileInputRef.current?.click()} style={{
                background: '#f5f5fa', color: 'var(--primary)', border: 'none',
                width: '42px', height: '42px', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
              }}>
                <ImagePlus size={18} />
              </button>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <input
                  placeholder="Escribe una respuesta anónima..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value.slice(0, MAX_RESPUESTA))}
                  maxLength={MAX_RESPUESTA}
                  style={{ width: '100%', padding: '12px', paddingRight: '64px', borderRadius: '14px', border: '1.5px solid #eee', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                {replyText.length > MAX_RESPUESTA * 0.7 && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 10, fontWeight: 700,
                    color: replyText.length >= MAX_RESPUESTA ? '#DC2626'
                         : replyText.length >= MAX_RESPUESTA * 0.9 ? '#D97706'
                         : 'var(--text-light)',
                    pointerEvents: 'none'
                  }}>{replyText.length}/{MAX_RESPUESTA}</span>
                )}
              </div>
              <button type="submit" disabled={(!replyText.trim() && !replyImage) || loadingReply} style={{
                background: 'var(--primary)', color: 'white', border: 'none',
                width: '42px', height: '42px', borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', opacity: (!replyText.trim() && !replyImage) ? 0.5 : 1, flexShrink: 0
              }}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '24px 24px 0 0',
              padding: '24px',
              width: '100%', height: '85vh',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Nueva publicación</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#666" /></button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '0 0 16px', lineHeight: '1.4' }}>
              🔒 Tu publicación es completamente anónima. La categoría se asignará automáticamente.
            </p>
            <textarea
              placeholder="¿Qué quieres compartir con la comunidad?"
              value={newContent}
              onChange={e => setNewContent(e.target.value.slice(0, MAX_PUBLICACION))}
              maxLength={MAX_PUBLICACION}
              style={{
                width: '100%', flex: 1, minHeight: 0, padding: '14px', borderRadius: '14px', border: '1.5px solid #eee',
                fontSize: '14px', resize: 'none', outline: 'none', lineHeight: '1.5',
                fontFamily: 'inherit', boxSizing: 'border-box'
              }}
            />
            <CharCounter value={newContent} max={MAX_PUBLICACION} />
            <div style={{ marginBottom: 12 }} />
            {newImage && (
              <div style={{ position: 'relative', marginBottom: '12px', flexShrink: 0 }}>
                <img src={newImage.dataUrl} alt="" style={{ maxHeight: '160px', borderRadius: '14px', display: 'block' }} />
                <button onClick={() => setNewImage(null)} style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                  width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <X size={16} />
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePickImage} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={publishing} style={{
                padding: '0 16px', borderRadius: '16px', border: '1.5px solid #eee',
                background: 'white', color: 'var(--primary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700'
              }}>
                <ImagePlus size={18} /> Imagen
              </button>
              <button onClick={handlePublish} disabled={(!newContent.trim() && !newImage) || publishing} style={{
                flex: 1, padding: '15px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(135deg, var(--primary) 0%, #F6416C 100%)',
                color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
                opacity: (!newContent.trim() && !newImage) ? 0.6 : 1
              }}>
                {publishing ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: elegir pareja para compartir */}
      {sharePost && (
        <div
          onClick={() => !sharing && setSharePost(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '380px', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Compartir con…</h3>
              <button onClick={() => !sharing && setSharePost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#666" /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '0 0 16px' }}>Selecciona a quién enviarle esta publicación:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shareParejas.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleShareTo(p.other_id || p.id_pareja)}
                  disabled={sharing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #eee',
                    background: 'white', cursor: sharing ? 'wait' : 'pointer',
                    textAlign: 'left', fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)'
                  }}
                >
                  <div style={{ background: 'var(--primary)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                    {(p.nombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <span>{p.nombre || 'Sin nombre'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de bloqueo */}
      {confirmBlock && (
        <div
          onClick={() => setConfirmBlock(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: '#FEE2E2', color: '#DC2626', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ban size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-dark)' }}>
                ¿Bloquear a esta usuaria?
              </h3>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--text-light)', lineHeight: 1.5 }}>
              Dejarás de ver sus publicaciones y respuestas en el foro. Si la seguías, también dejarás de hacerlo. Puedes desbloquearla en cualquier momento.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmBlock(null)} style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: '1.5px solid #eee',
                background: 'white', color: 'var(--text-dark)', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={() => handleBloquear(confirmBlock.idAutor)} style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                <Ban size={15} /> Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ background: '#FFF1F2', color: '#F6416C', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--text-dark)' }}>
                ¿Eliminar {confirmDelete.tipo === 'post' ? 'publicación' : 'respuesta'}?
              </h3>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--text-light)', lineHeight: 1.5 }}>
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: '1.5px solid #eee',
                background: 'white', color: 'var(--text-dark)', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={ejecutarDelete} style={{
                flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #F6416C 0%, #C03060 100%)',
                color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reportar publicación */}
      {reportPost && (
        <div onClick={() => !reportSending && setReportPost(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380,
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                background: '#FEF3C7', color: '#D97706', width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Flag size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-dark)' }}>
                Reportar publicación
              </h3>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-light)', lineHeight: 1.5 }}>
              Si crees que esta publicación es inadecuada, repórtala. Un administrador la revisará.
            </p>
            <textarea
              value={reportMotivo}
              onChange={e => setReportMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo del reporte (opcional)…"
              style={{
                width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #eee',
                fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                resize: 'none', marginBottom: 14
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setReportPost(null)} disabled={reportSending} style={{
                flex: 1, padding: 12, borderRadius: 14, border: '1.5px solid #eee',
                background: 'white', color: 'var(--text-dark)', fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}>Cancelar</button>
              <button onClick={handleReportar} disabled={reportSending} style={{
                flex: 1, padding: 12, borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
                <Flag size={15} /> {reportSending ? 'Enviando…' : 'Reportar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de avisos para la usuaria (eliminaciones / banes) */}
      {avisos.length > 0 && (
        <AvisoUsuariaModal aviso={avisos[0]} onClose={() => cerrarAviso(avisos[0])} />
      )}

      {/* Modal: usuarias bloqueadas */}
      {showBloqueados && (
        <div onClick={() => setShowBloqueados(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
            maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Ban size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Usuarias bloqueadas</h3>
              </div>
              <button onClick={() => setShowBloqueados(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {bloqueadosLoading ? (
              <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-light)' }}>Cargando…</p>
            ) : bloqueadosList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🌸</div>
                <p style={{ color: 'var(--text-light)', fontSize: 14, margin: 0 }}>
                  No tienes a nadie bloqueada.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bloqueadosList.map(b => {
                  const av = getAvatar(b.avatar_seed);
                  return (
                    <div key={b.id_autor} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 12, background: '#f9f9fc',
                      border: '1.5px solid transparent'
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', background: av.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0
                      }}>
                        {av.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Anónima</div>
                      </div>
                      <button
                        onClick={() => desbloquearUsuaria(b.id_autor)}
                        style={{
                          background: 'white', color: 'var(--primary)',
                          border: '1.5px solid var(--primary)', borderRadius: 12,
                          padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                        }}
                      >
                        <Check size={13} /> Desbloquear
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast: notificación tipo "Publicación enviada" */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: toast.tipo === 'error'
            ? 'linear-gradient(135deg, #F6416C 0%, #C03060 100%)'
            : 'linear-gradient(135deg, var(--primary) 0%, #F6416C 100%)',
          color: 'white', padding: '12px 20px', borderRadius: '16px',
          fontSize: '14px', fontWeight: '600',
          boxShadow: '0 6px 24px rgba(176,91,181,0.35)',
          zIndex: 2500, maxWidth: '85%', textAlign: 'center',
          animation: 'nuviaToastIn 0.25s ease-out'
        }}>
          {toast.mensaje}
        </div>
      )}
      <style>{`
        @keyframes nuviaToastIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}

function AvatarRow({ seed, time }) {
  const av = getAvatar(seed);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0
      }}>{av.emoji}</div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)' }}>Anónima</div>
        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{timeAgo(time)}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#999', fontSize: '13px', padding: '4px' }}>
      {icon} {label}
    </button>
  );
}

function PostCard({ post, onOpen, onLike, onFav, onDelete, onShare, puedeEliminar }) {
  const LIMIT = 220;
  const truncated = post.contenido.length > LIMIT;
  const preview = truncated ? post.contenido.slice(0, LIMIT) : post.contenido;

  return (
    <div className="card" style={{ padding: '16px', marginBottom: '12px', cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <AvatarRow seed={post.avatar_seed} time={post.created_at} />
        {puedeEliminar && (
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {post.contenido && (
        <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-dark)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {preview}
          {truncated && (
            <span style={{ color: '#38bdf8', fontWeight: '600' }}> Seguir leyendo</span>
          )}
        </p>
      )}

      {post.tiene_imagen && (
        <AuthImage
          src={ApiService.imagenForoUrl(post.id)}
          style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px', cursor: 'pointer' }}
        />
      )}

      <div style={{ marginBottom: '12px' }}>
        <CatLabel id={post.categoria} />
      </div>

      {/* Reactions display */}
      {Object.keys(post.reacciones || {}).length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {Object.entries(post.reacciones).map(([emoji, count]) => (
            <span key={emoji} style={{ fontSize: '12px', background: '#f5f5fa', padding: '2px 8px', borderRadius: '12px' }}>
              {emoji} {count}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <ActionBtn
            icon={<Heart size={16} fill={post.is_liked ? '#F6416C' : 'none'} color={post.is_liked ? '#F6416C' : '#aaa'} />}
            label={fmtNum(post.likes_count)} onClick={onLike}
          />
          <ActionBtn icon={<MessageCircle size={16} color="#aaa" />} label={fmtNum(post.comments_count)} onClick={onOpen} />
          <ActionBtn icon={<Share2 size={16} color="#aaa" />} onClick={onShare} />
        </div>
        <button onClick={onFav} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: post.is_guardado ? 'var(--primary)' : '#aaa', fontWeight: '600' }}>
          <Bookmark size={16} fill={post.is_guardado ? 'var(--primary)' : 'none'} color={post.is_guardado ? 'var(--primary)' : '#aaa'} />
          {post.favs_count > 0 && fmtNum(post.favs_count)}
        </button>
      </div>

      {post.comments_count > 2 && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f5f5fa' }}>
          <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: '600' }}>
            Ver todos {fmtNum(post.comments_count)} comentarios
          </span>
        </div>
      )}
    </div>
  );
}

function ReplyCard({ reply, onDelete, onLike, puedeEliminar }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
      {(() => {
        const av = getAvatar(reply.avatar_seed); return (
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: av.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
            {av.emoji}
          </div>
        );
      })()}
      <div style={{ flex: 1 }}>
        <div style={{ background: '#f8f8fc', borderRadius: '14px', padding: '10px 14px', marginBottom: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '4px' }}>Anónima · {timeAgo(reply.created_at)}</div>
          {reply.contenido && (
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--text-dark)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{reply.contenido}</p>
          )}
          {reply.tiene_imagen && (
            <AuthImage
              src={ApiService.imagenRespuestaForoUrl(reply.id)}
              style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '10px', marginTop: reply.contenido ? '8px' : 0, background: '#f0f0f5' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', paddingLeft: '4px' }}>
          <button onClick={onLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: reply.is_liked ? '#F6416C' : '#aaa' }}>
            <Heart size={13} fill={reply.is_liked ? '#F6416C' : 'none'} color={reply.is_liked ? '#F6416C' : '#aaa'} />
            {reply.likes_count > 0 && reply.likes_count}
          </button>
          {puedeEliminar && (
            <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={13} /> Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function AvisoUsuariaModal({ aviso, onClose }) {
  const esBane = aviso.tipo === 'bane';
  const titulo = esBane ? 'Has sido baneada del foro' : 'Tu publicación ha sido eliminada';
  const colorBorde = esBane ? '#DC2626' : '#F6416C';
  const fondoIcono = esBane ? '#FEE2E2' : '#FFE4E6';
  const motivosArr = aviso.motivos || [];
  const personalizado = aviso.motivo_personalizado || '';
  const formatearFin = (iso) => {
    if (!iso) return 'Permanente';
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2800,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420,
        maxHeight: '90vh', overflowY: 'auto',
        borderTop: `5px solid ${colorBorde}`, boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: fondoIcono, color: colorBorde,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {esBane ? <Ban size={22} /> : <AlertTriangle size={22} />}
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-dark)', flex: 1 }}>{titulo}</h3>
        </div>

        {esBane ? (
          <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.5 }}>
            No podrás publicar ni responder hasta: <strong>{aviso.permanente ? 'permanente' : formatearFin(aviso.fecha_fin)}</strong>.
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.5 }}>
              Tu publicación ha sido reportada y eliminada por incumplir las normas de la comunidad.
            </p>
            {aviso.contenido_original && (
              <div style={{
                background: '#f9f9fc', borderRadius: 10, padding: '10px 12px',
                fontSize: 13, color: 'var(--text-light)', marginBottom: 14,
                borderLeft: '3px solid #ddd', maxHeight: 100, overflowY: 'auto', fontStyle: 'italic'
              }}>
                «{aviso.contenido_original.slice(0, 250)}{aviso.contenido_original.length > 250 ? '…' : ''}»
              </div>
            )}
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-light)' }}>Motivos:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {motivosArr.map(m => (
              <div key={m.clave} style={{
                background: '#FFF1F2', color: '#9F1239', padding: '8px 12px',
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #FECACA'
              }}>{m.etiqueta}</div>
            ))}
          </div>
          {personalizado && (
            <div style={{
              marginTop: 8, background: '#FFF1F2', color: '#9F1239', padding: '10px 12px',
              borderRadius: 10, fontSize: 13, border: '1px solid #FECACA'
            }}>
              <strong>Detalle:</strong> {personalizado}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: 12, borderRadius: 14, border: 'none',
          background: 'linear-gradient(135deg, var(--primary) 0%, #F6416C 100%)',
          color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer'
        }}>Entendido</button>
      </div>
    </div>
  );
}

