import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Send, X, Trash2, UserPlus, UserCheck, Share2, ChevronLeft } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';

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
  { id: 'mis', label: 'Mis publicaciones' },
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
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'Ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
  const [loadingReply, setLoadingReply] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const replyEndRef = useRef(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setPage(1);
    setPosts([]);
    setHasMore(true);
    fetchPosts(1, true);
  }, [tab, categoria]);

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
    updatePost({ id: postId, is_guardado: res.guardado });
    if (activePost?.id === postId) setActivePost(p => ({ ...p, is_guardado: res.guardado }));
  };

  const handleReaccion = async (emoji) => {
    if (!activePost) return;
    const res = await ApiService.toggleReaccionForo(activePost.id, emoji);
    setActivePost(p => ({ ...p, reacciones: res.reacciones, mi_reaccion: res.mi_reaccion }));
    updatePost({ id: activePost.id, reacciones: res.reacciones, mi_reaccion: res.mi_reaccion });
    setShowReactions(false);
  };

  const handleSeguir = async (avatarSeed, e) => {
    e?.stopPropagation();
    const res = await ApiService.toggleSeguirForo(avatarSeed);
    updatePost({ id: activePost?.id || '', es_seguido: res.siguiendo });
    if (activePost) setActivePost(p => ({ ...p, es_seguido: res.siguiendo }));
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
    if (!replyText.trim() || !activePost) return;
    setLoadingReply(true);
    try {
      const r = await ApiService.crearRespuesta(activePost.id, replyText);
      setReplies(prev => [...prev, r]);
      setReplyText('');
      updatePost({ id: activePost.id, comments_count: (activePost.comments_count || 0) + 1 });
      setActivePost(p => ({ ...p, comments_count: (p.comments_count || 0) + 1 }));
      setTimeout(() => replyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } finally {
      setLoadingReply(false);
    }
  };

  const handleDeleteReply = async (rid) => {
    await ApiService.eliminarRespuesta(rid);
    setReplies(prev => prev.filter(r => r.id !== rid));
    updatePost({ id: activePost.id, comments_count: Math.max(0, (activePost.comments_count || 1) - 1) });
    setActivePost(p => ({ ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) }));
  };

  const handleDeletePost = async (postId, e) => {
    e?.stopPropagation();
    await ApiService.eliminarPublicacion(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (activePost?.id === postId) setActivePost(null);
  };

  const handlePublish = async () => {
    if (!newContent.trim()) return;
    setPublishing(true);
    try {
      const pub = await ApiService.crearPublicacion(newContent);
      setPosts(prev => [pub, ...prev]);
      setShowCreate(false);
      setNewContent('');
    } catch (err) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleShare = (post, e) => {
    e?.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: 'Nuvia Comunidad', text: post.contenido.slice(0, 100) + '…' }).catch(() => { });
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
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: 'var(--text-dark)' }}>Comunidad</h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)' }}>Un espacio seguro y anónimo para compartir</p>
          </div>
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
              {tab === 'siguiendo' ? '👥' : tab === 'mis' ? '✍️' : '💬'}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
              {tab === 'siguiendo' ? 'Sigue a otras usuarias para ver sus publicaciones aquí.'
                : tab === 'mis' ? 'Aún no has publicado nada. ¡Comparte algo!'
                  : 'No hay publicaciones en esta categoría aún.'}
            </p>
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post}
            onOpen={() => openPost(post)}
            onLike={e => handleLike(post.id, e)}
            onFav={e => handleFav(post.id, e)}
            onDelete={e => handleDeletePost(post.id, e)}
            onShare={e => handleShare(post, e)}
            isMine={post.es_mia}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <AvatarRow seed={activePost.avatar_seed} time={activePost.created_at} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!activePost.es_mia && (
                    <button onClick={e => handleSeguir(activePost.avatar_seed, e)} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '12px', border: '1.5px solid var(--primary)',
                      background: activePost.es_seguido ? 'var(--primary)' : 'transparent',
                      color: activePost.es_seguido ? 'white' : 'var(--primary)',
                      fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                    }}>
                      {activePost.es_seguido ? <><UserCheck size={12} /> Siguiendo</> : <><UserPlus size={12} /> Seguir</>}
                    </button>
                  )}
                  {activePost.es_mia && (
                    <button onClick={e => handleDeletePost(activePost.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: '1.6', color: 'var(--text-dark)' }}>{activePost.contenido}</p>
              <CatLabel id={activePost.categoria} />

              {/* Actions */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f5' }}>
                <ActionBtn icon={<Heart size={18} fill={activePost.is_liked ? '#F6416C' : 'none'} color={activePost.is_liked ? '#F6416C' : '#999'} />}
                  label={fmtNum(activePost.likes_count)} onClick={() => handleLike(activePost.id)} />
                <ActionBtn icon={<MessageCircle size={18} color="#999" />} label={fmtNum(activePost.comments_count)} />
                <ActionBtn icon={<Bookmark size={18} fill={activePost.is_guardado ? 'var(--primary)' : 'none'} color={activePost.is_guardado ? 'var(--primary)' : '#999'} />}
                  label={activePost.is_guardado ? 'Guardado' : 'Guardar'} onClick={() => handleFav(activePost.id)} />
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
                onDelete={() => handleDeleteReply(r.id)}
                onLike={async () => {
                  const res = await ApiService.toggleLikeForo(r.id);
                  setReplies(prev => prev.map(x => x.id === r.id ? { ...x, is_liked: res.liked, likes_count: res.likes_count } : x));
                }}
              />
            ))}
            <div ref={replyEndRef} />
          </div>

          {/* Reply input */}
          <form onSubmit={handleReply} style={{ padding: '12px', borderTop: '1px solid #f0f0f5', display: 'flex', gap: '8px', background: 'white' }}>
            <input
              placeholder="Escribe una respuesta anónima..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1.5px solid #eee', fontSize: '14px', outline: 'none' }}
            />
            <button type="submit" disabled={!replyText.trim() || loadingReply} style={{
              background: 'var(--primary)', color: 'white', border: 'none',
              width: '42px', height: '42px', borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: !replyText.trim() ? 0.5 : 1
            }}>
              <Send size={18} />
            </button>
          </form>
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
              onChange={e => setNewContent(e.target.value)}
              style={{
                width: '100%', flex: 1, minHeight: 0, padding: '14px', borderRadius: '14px', border: '1.5px solid #eee',
                fontSize: '14px', resize: 'none', outline: 'none', lineHeight: '1.5',
                fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px'
              }}
            />
            <button onClick={handlePublish} disabled={!newContent.trim() || publishing} style={{
              width: '100%', padding: '15px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, var(--primary) 0%, #F6416C 100%)',
              color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer',
              opacity: !newContent.trim() ? 0.6 : 1, flexShrink: 0
            }}>
              {publishing ? 'Publicando...' : 'Publicar de forma anónima'}
            </button>
          </div>
        </div>
      )}
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

function PostCard({ post, onOpen, onLike, onFav, onDelete, onShare, isMine }) {
  const LIMIT = 220;
  const truncated = post.contenido.length > LIMIT;
  const preview = truncated ? post.contenido.slice(0, LIMIT) : post.contenido;

  return (
    <div className="card" style={{ padding: '16px', marginBottom: '12px', cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <AvatarRow seed={post.avatar_seed} time={post.created_at} />
        {isMine && (
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-dark)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        {preview}
        {truncated && (
          <span style={{ color: '#38bdf8', fontWeight: '600' }}> Seguir leyendo</span>
        )}
      </p>

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
        <button onClick={onFav} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <Bookmark size={16} fill={post.is_guardado ? 'var(--primary)' : 'none'} color={post.is_guardado ? 'var(--primary)' : '#aaa'} />
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

function ReplyCard({ reply, onDelete, onLike }) {
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
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--text-dark)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{reply.contenido}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', paddingLeft: '4px' }}>
          <button onClick={onLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: reply.is_liked ? '#F6416C' : '#aaa' }}>
            <Heart size={13} fill={reply.is_liked ? '#F6416C' : 'none'} color={reply.is_liked ? '#F6416C' : '#aaa'} />
            {reply.likes_count > 0 && reply.likes_count}
          </button>
          {reply.es_mia && (
            <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={13} /> Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
