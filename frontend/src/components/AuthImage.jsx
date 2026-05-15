import React, { useEffect, useState } from 'react';

// Carga una imagen protegida añadiendo el header Authorization
export default function AuthImage({ src, alt = '', style, onClick }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked = null;
    let cancelled = false;
    async function load() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error('img');
        const blob = await res.blob();
        if (cancelled) return;
        const objUrl = URL.createObjectURL(blob);
        revoked = objUrl;
        setUrl(objUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked); };
  }, [src]);

  if (error) return null;
  if (!url) {
    return <div style={{ background: '#f0f0f5', borderRadius: '12px', ...style }} />;
  }
  return <img src={url} alt={alt} style={style} onClick={onClick} />;
}
