import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bookmark, BookmarkCheck, Bell } from 'lucide-react';
import { ApiService } from '../api';
import { AuthContext } from '../context/AuthContext';
import AuthImage from '../components/AuthImage';

export default function ConsejosScreen() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [articulosPorCla, setArticulosPorCla] = useState({}); // {id_cla: [articulos]}
  const [etiquetaActiva, setEtiquetaActiva] = useState(null);
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [articulosFavs, setArticulosFavs] = useState([]);

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [etiquetaActiva, mostrarFavoritos]);

  const cargar = async () => {
    setLoading(true);
    try {
      const [clas, ets] = await Promise.all([
        ApiService.getClasificacionesConsejo(),
        ApiService.getEtiquetasConsejo(),
      ]);
      setClasificaciones(clas);
      setEtiquetas(ets);

      if (mostrarFavoritos) {
        const favs = await ApiService.getArticulosConsejo({ favoritos: true, etiqueta: etiquetaActiva });
        setArticulosFavs(favs);
      } else {
        const porCla = {};
        await Promise.all(clas.map(async c => {
          porCla[c.id] = await ApiService.getArticulosConsejo({ clasificacion: c.id, etiqueta: etiquetaActiva });
        }));
        setArticulosPorCla(porCla);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container" style={{ paddingBottom: '100px', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={26} />
        </button>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: 'var(--text-dark)', flex: 1 }}>Consejos</h1>
        <button
          onClick={() => setMostrarFavoritos(v => !v)}
          style={{
            background: mostrarFavoritos ? 'var(--primary)' : 'white',
            color: mostrarFavoritos ? 'white' : 'var(--primary)',
            border: `1.5px solid var(--primary)`,
            borderRadius: '14px', padding: '8px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '700', marginLeft: '12px'
          }}
        >
          {mostrarFavoritos ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          Mis favoritos
        </button>
      </div>

      {/* Etiquetas (chips) */}
      {etiquetas.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          <button
            onClick={() => setEtiquetaActiva(null)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: !etiquetaActiva ? 'var(--primary)' : '#f5f5fa',
              color: !etiquetaActiva ? 'white' : 'var(--text-dark)',
              fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap'
            }}
          >Todo</button>
          {etiquetas.map(e => (
            <button key={e.id} onClick={() => setEtiquetaActiva(prev => prev === e.id ? null : e.id)} style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: etiquetaActiva === e.id ? 'var(--primary)' : '#f5f5fa',
              color: etiquetaActiva === e.id ? 'white' : 'var(--text-dark)',
              fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap'
            }}>{e.nombre}</button>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>Cargando...</div>}

      {!loading && mostrarFavoritos && (
        <Seccion titulo="Mis favoritos" articulos={articulosFavs} navigate={navigate} emptyMsg="Aún no has guardado ningún consejo." />
      )}

      {!loading && !mostrarFavoritos && clasificaciones.map(c => (
        <Seccion
          key={c.id}
          titulo={c.nombre}
          descripcion={c.descripcion}
          articulos={articulosPorCla[c.id] || []}
          navigate={navigate}
        />
      ))}

      {!loading && !mostrarFavoritos && clasificaciones.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-light)' }}>
          <Bell size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>Aún no hay consejos disponibles.</p>
        </div>
      )}

      {user?.rol === 'admin' && (
        <button onClick={() => navigate('/admin/consejos')} style={{
          position: 'fixed', bottom: '90px', right: '20px', zIndex: 100,
          background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px',
          padding: '10px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(176,91,181,0.3)'
        }}>
          Gestionar
        </button>
      )}
    </div>
  );
}

function Seccion({ titulo, descripcion, articulos, navigate, emptyMsg }) {
  if (!articulos || articulos.length === 0) {
    if (emptyMsg) return (
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)' }}>{titulo}</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{emptyMsg}</p>
      </div>
    );
    return null;
  }
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)' }}>{titulo}</h2>
      {descripcion && <p style={{ margin: '0 0 12px', color: 'var(--text-light)', fontSize: '13px' }}>{descripcion}</p>}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
        {articulos.map(a => (
          <Card key={a.id} articulo={a} onOpen={() => navigate(`/consejos/${a.id}`)} />
        ))}
      </div>
    </div>
  );
}

function Card({ articulo, onOpen }) {
  return (
    <div
      onClick={onOpen}
      style={{
        flex: '0 0 220px', borderRadius: '16px', overflow: 'hidden',
        background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        cursor: 'pointer', display: 'flex', flexDirection: 'column'
      }}
    >
      <div style={{ width: '100%', height: '160px', background: '#f3e5f5', position: 'relative' }}>
        {articulo.tiene_imagen ? (
          <AuthImage
            src={ApiService.imagenArticuloConsejoUrl(articulo.id)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '40px' }}>✨</div>
        )}
        {articulo.es_favorito && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookmarkCheck size={14} color="var(--primary)" />
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {articulo.titulo}
        </div>
      </div>
    </div>
  );
}
