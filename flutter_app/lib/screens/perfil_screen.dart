import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../widgets/nuvia_theme.dart';

class PerfilScreen extends StatelessWidget {
  const PerfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth    = context.watch<AuthProvider>();
    final usuaria = auth.usuaria;
    final nombre  = usuaria?['nombre'] ?? '-';
    final email   = usuaria?['email']  ?? '-';
    final inicial = nombre.isNotEmpty ? nombre[0].toUpperCase() : 'N';

    return Scaffold(
      appBar: AppBar(title: const Text('Mi perfil')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Avatar
            CircleAvatar(
              radius: 48,
              backgroundColor: NuviaTheme.primario,
              child: Text(inicial,
                          style: const TextStyle(color: Colors.white, fontSize: 36,
                                                  fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 16),
            Text(nombre,
                 style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold,
                                        color: NuviaTheme.texto)),
            const SizedBox(height: 4),
            Text(email, style: const TextStyle(color: NuviaTheme.textoSuave)),
            const SizedBox(height: 32),

            // Opciones
            _opcion(context, Icons.notifications_outlined, 'Notificaciones',
                    'Recordatorios y alertas', () {}),
            _opcion(context, Icons.lock_outline, 'Privacidad',
                    'Gestiona tus datos', () {}),
            _opcion(context, Icons.settings_outlined, 'Configuración',
                    'Preferencias de la app', () {}),

            const Divider(height: 32),

            // Cerrar sesión
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await auth.logout();
                  if (context.mounted) {
                    Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
                  }
                },
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('Cerrar sesión',
                                  style: TextStyle(color: Colors.red)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Nuvia v1.0.0',
                       style: TextStyle(color: NuviaTheme.textoSuave, fontSize: 12)),
            const Text('Hecho con 💜 para tu bienestar',
                       style: TextStyle(color: NuviaTheme.textoSuave, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _opcion(BuildContext context, IconData icon, String titulo,
                 String subtitulo, VoidCallback onTap) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: NuviaTheme.primario.withOpacity(0.12),
          child: Icon(icon, color: NuviaTheme.primario, size: 22),
        ),
        title: Text(titulo, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitulo,
                       style: const TextStyle(color: NuviaTheme.textoSuave, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: NuviaTheme.textoSuave),
        onTap: onTap,
      ),
    );
  }
}
