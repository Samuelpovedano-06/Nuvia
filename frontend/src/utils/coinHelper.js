export { CoinIcon } from './CoinIcon.jsx';

// Utilidad para agregar monedas ganadas en los juegos
export const sumarMoneda = (cantidad = 1) => {
  try {
    const current = Number(localStorage.getItem('nuvia_user_coins') || 50);
    const next = current + cantidad;
    localStorage.setItem('nuvia_user_coins', String(next));
    window.dispatchEvent(new CustomEvent('nuvia_coins_updated', { detail: { coins: next } }));
    return next;
  } catch (e) {
    return 50;
  }
};
