/**
 * Push notifications: PWA (Web Push) y Capacitor (Android nativo).
 * - En Android compilado con Capacitor → usa @capacitor/push-notifications (FCM).
 * - En navegador / PWA iOS → usa Service Worker + Web Push (VAPID).
 */
import { ApiService } from '../api';

const isCapacitor = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

// Variable indirecta para que Vite NO intente resolver el paquete en build.
// Capacitor solo se carga en tiempo de ejecución dentro de la app nativa.
const CAP_PUSH_PKG = '@capacitor/push-notifications';
async function loadCapacitorPush() {
  return await import(/* @vite-ignore */ CAP_PUSH_PKG);
}

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function isPushSupported() {
  if (isCapacitor()) return true;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getCurrentPermission() {
  if (isCapacitor()) {
    try {
      const { PushNotifications } = await loadCapacitorPush();
      const r = await PushNotifications.checkPermissions();
      return r.receive; // 'granted' | 'denied' | 'prompt'
    } catch { return 'prompt'; }
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function enablePush() {
  if (isCapacitor()) return enablePushCapacitor();
  return enablePushWeb();
}

async function enablePushCapacitor() {
  const { PushNotifications } = await loadCapacitorPush();
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') throw new Error('Permiso de notificaciones denegado');

  return new Promise((resolve, reject) => {
    const onReg = PushNotifications.addListener('registration', async (token) => {
      await ApiService.registerPushDevice('android', token.value);
      onReg.remove?.();
      onErr?.remove?.();
      resolve(true);
    });
    const onErr = PushNotifications.addListener('registrationError', (err) => {
      onReg.remove?.();
      onErr?.remove?.();
      reject(new Error(err?.error || 'Error al registrar FCM'));
    });
    PushNotifications.register();
  });
}

async function enablePushWeb() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Tu navegador no soporta notificaciones push');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  // Reutiliza suscripción existente o crea una nueva
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const pubKey = await ApiService.getVapidPublicKey();
    if (!pubKey) throw new Error('Servidor sin VAPID configurado');
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pubKey),
    });
  }
  await ApiService.registerPushDevice('web', JSON.stringify(sub));
  return true;
}

export async function disablePush() {
  if (isCapacitor()) {
    // En Android no hay un "unsubscribe" simple desde JS; basta con desactivar el dispositivo en backend
    return;
  }
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try { await ApiService.unregisterPushDevice('web', JSON.stringify(sub)); } catch {}
    await sub.unsubscribe();
  }
}
