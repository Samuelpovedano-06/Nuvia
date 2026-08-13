export { CoinIcon } from './CoinIcon.jsx';
import { ApiService } from '../api';

// Utilidad para agregar monedas ganadas en los juegos.
// Actualiza localStorage al instante (para que la UI no espere a la red) y
// sincroniza con el backend en segundo plano para que el saldo viaje entre
// dispositivos con la sesión de la usuaria.
export const sumarMoneda = (cantidad = 1) => {
  try {
    const current = Number(localStorage.getItem('nuvia_user_coins') || 50);
    const next = current + cantidad;
    localStorage.setItem('nuvia_user_coins', String(next));
    window.dispatchEvent(new CustomEvent('nuvia_coins_updated', { detail: { coins: next } }));
    ApiService.sumarMonedas(cantidad).catch(() => {});
    return next;
  } catch (e) {
    return 50;
  }
};
