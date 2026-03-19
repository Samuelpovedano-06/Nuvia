import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_provider.dart';
import 'widgets/nuvia_theme.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/ciclos_screen.dart';
import 'screens/sintomas_screen.dart';
import 'screens/predicciones_screen.dart';
import 'screens/perfil_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: const NuviaApp(),
    ),
  );
}

class NuviaApp extends StatelessWidget {
  const NuviaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nuvia',
      debugShowCheckedModeBanner: false,
      theme: NuviaTheme.tema,
      initialRoute: '/splash',
      routes: {
        '/splash':       (_) => const SplashScreen(),
        '/login':        (_) => const LoginScreen(),
        '/register':     (_) => const RegisterScreen(),
        '/home':         (_) => const HomeScreen(),
        '/ciclos':       (_) => const CiclosScreen(),
        '/sintomas':     (_) => const SintomasScreen(),
        '/predicciones': (_) => const PrediccionesScreen(),
        '/perfil':       (_) => const PerfilScreen(),
      },
    );
  }
}
