import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Bookmark, BookmarkCheck } from 'lucide-react';
import { ApiService } from '../api';
import AuthImage from '../components/AuthImage';

export default function ConsejoDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [articulo, setArticulo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await ApiService.getArticuloConsejo(id);
        if (!cancel) setArticulo(data);
      } catch (e) {
        if (!cancel) setError(e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [id]);

  const handleFav = async () => {
    if (!articulo) return;
    try {
      const r = await ApiService.toggleFavoritoConsejo(articulo.id);
      setArticulo(a => ({ ...a, es_favorito: r.es_favorito }));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return <div className="screen-container" style={{ paddingBottom: '100px' }}><p style={{ textAlign: 'center', padding: '40px' }}>Cargando...</p></div>;
  }
  if (error || !articulo) {
    return (
      <div className="screen-container" style={{ paddingBottom: '100px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={26} />
        </button>
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>{error || 'No encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="screen-container" style={{ paddingBottom: '100px', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={26} />
        </button>
        <button onClick={handleFav} style={{
          background: articulo.es_favorito ? 'var(--primary)' : '#f5f5fa',
          color: articulo.es_favorito ? 'white' : '#666',
          border: 'none', borderRadius: '12px', padding: '8px 14px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700'
        }}>
          {articulo.es_favorito ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {articulo.es_favorito ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {articulo.tiene_imagen && (
        <AuthImage
          src={ApiService.imagenArticuloConsejoUrl(articulo.id)}
          style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '18px', marginBottom: '16px' }}
        />
      )}

      <div style={{
        background: 'white', borderRadius: '20px', padding: '22px 20px 26px',
        boxShadow: '0 2px 12px rgba(176,91,181,0.08)'
      }}>
        <h1 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '800', color: 'var(--text-dark)', lineHeight: '1.25' }}>
          {articulo.titulo}
        </h1>

        {articulo.etiquetas?.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {articulo.etiquetas.map(et => (
              <span key={et.id} style={{
                background: 'rgba(176,91,181,0.08)', color: 'var(--primary)',
                padding: '4px 10px', borderRadius: '14px', fontSize: '11px', fontWeight: '600'
              }}>
                {et.nombre}
              </span>
            ))}
          </div>
        )}

        {articulo.resumen && (
          <p style={{
            margin: '0 0 18px', fontSize: '14px', lineHeight: '1.5',
            color: 'var(--primary)', fontStyle: 'italic',
            background: 'rgba(176,91,181,0.06)', padding: '12px 14px',
            borderRadius: '12px', borderLeft: '3px solid var(--primary)'
          }}>
            {articulo.resumen}
          </p>
        )}

        <div style={{
          fontSize: '15px', lineHeight: '1.7', color: 'var(--text-dark)',
          whiteSpace: 'pre-wrap', overflowWrap: 'break-word'
        }}>
          {articulo.cuerpo}
        </div>
      </div>
    </div>
  );
}
