# Notificaciones push — Setup

Nuvia soporta notificaciones push en **PWA (web/iOS)** vía Web Push (VAPID) y en
**Android** mediante una app nativa generada con **Capacitor + Firebase Cloud Messaging (FCM)**.

Los eventos que ya disparan notificación: nuevo mensaje de chat de pareja, nueva
respuesta en tu publicación del foro, publicación eliminada por admin y baneo.

## A) PWA push (web e iOS)

### A.1 Generar claves VAPID (una sola vez)

Opción rápida online: https://vapidkeys.com/

O por terminal:
```bash
pip install pywebpush py-vapid
python -c "from py_vapid import Vapid; v = Vapid(); v.generate_keys(); open('priv.pem','wb').write(v.private_pem()); open('pub.pem','wb').write(v.public_pem())"
```

Las claves para Web Push son las versiones **base64 url-safe** de las claves PEM. Si
usas `vapidkeys.com` ya te las da así. Si las generas con `py-vapid`, conviértelas con:
```bash
python -c "from py_vapid import Vapid; v = Vapid.from_file('priv.pem'); print('public:', v.public_key); print('private:', v.private_key)"
```

### A.2 Añadir al `.env` del backend

```env
VAPID_PUBLIC_KEY=BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...
VAPID_CLAIM_EMAIL=mailto:tu@email.com
```

Reinicia el backend. En el frontend, en **Perfil → toggle "Notificaciones push"**,
acepta el permiso del navegador. Listo.

### A.3 iOS

Solo funciona en iOS 16.4 o superior y si la app está **instalada como PWA**
(Safari → Compartir → Añadir a pantalla de inicio).

## B) Android nativo con Capacitor + FCM

### B.1 Prerequisitos
- Node.js 18+
- Android Studio
- JDK 17
- Cuenta Firebase

### B.2 Instalar dependencias y crear proyecto Android

```bash
cd frontend
npm install
npm run build
npm run cap:android:init   # Solo la primera vez — crea ./android
npm run cap:android:sync   # Copia el build a Android cada vez que cambies código
npm run cap:android:open   # Abre Android Studio
```

### B.3 Configurar Firebase

1. Ve a https://console.firebase.google.com/ y crea un proyecto **Nuvia**.
2. Añade una "app Android" con el package id `app.nuvia.android` (mismo de
   `capacitor.config.json`).
3. Descarga `google-services.json` y cópialo en `frontend/android/app/`.
4. En *Settings → Cloud Messaging* copia la **Server key (Legacy)** y ponla en `.env`
   del backend:
   ```env
   FCM_SERVER_KEY=AAAAxxxxxxx:APA91b...
   ```
   (Si no aparece, activa la API "Cloud Messaging" desde la consola Google Cloud.)

### B.4 Build del APK

En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
El APK firmado debug saldrá en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

Para release firmado: **Build → Generate Signed Bundle / APK**.

## C) Probar que funciona

En el frontend en consola del navegador (logado):
```js
await ApiService.testPush();
```
Debes recibir una notificación "Nuvia 🌸 Las notificaciones funcionan correctamente."

## Solución de problemas

| Error | Causa |
|---|---|
| `VAPID keys no configuradas` en logs backend | Falta poner `VAPID_PUBLIC_KEY/PRIVATE_KEY` en `.env` |
| 410 Gone en logs | El navegador desuscribió: la app marca el dispositivo como inactivo automáticamente |
| Permiso "denied" en iOS | iOS solo permite push si la app está añadida a pantalla de inicio e iOS ≥ 16.4 |
| `FCM_SERVER_KEY no configurada` | Falta la server key de Firebase en `.env` |
| Push Android no llega | `google-services.json` no copiado, o package id distinto del de Firebase |
