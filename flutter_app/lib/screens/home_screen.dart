import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/nuvia_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _prediccion;
  List<dynamic> _ciclos = [];
  bool _loading = true;
  int _navIndex = 0;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    try {
      final ciclos = await ApiService.getCiclos();
      Map<String, dynamic>? pred;
      try { pred = await ApiService.getPrediccion(); } catch (_) {}
      setState(() { _ciclos = ciclos; _prediccion = pred; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth  = context.watch<AuthProvider>();
    final nombre = auth.usuaria?['nombre'] ?? 'usuaria';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nuvia', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.pushNamed(context, '/perfil'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargarDatos,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Saludo
                    Text(
                      'Hola, $nombre 💜',
                      style: const TextStyle(
                        fontSize: 26, fontWeight: FontWeight.bold,
                        color: NuviaTheme.texto,
                      ),
                    ),
                    const Text(
                      '¿Cómo te sientes hoy?',
                      style: TextStyle(color: NuviaTheme.textoSuave, fontSize: 15),
                    ),
                    const SizedBox(height: 24),

                    // Tarjeta ciclo actual
                    _tarjetaCicloActual(),
                    const SizedBox(height: 16),

                    // Tarjeta predicción
                    if (_prediccion != null) ...[
                      _tarjetaPrediccion(),
                      const SizedBox(height: 16),
                    ],

                    // Acciones rápidas
                    const Text(
                      'Acciones rápidas',
                      style: TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w600,
                        color: NuviaTheme.texto,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _gridAcciones(context),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _navIndex,
        onDestinationSelected: (i) {
          setState(() => _navIndex = i);
          switch (i) {
            case 1: Navigator.pushNamed(context, '/ciclos'); break;
            case 2: Navigator.pushNamed(context, '/predicciones'); break;
            case 3: Navigator.pushNamed(context, '/perfil'); break;
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Inicio'),
          NavigationDestination(icon: Icon(Icons.calendar_today_outlined), label: 'Ciclos'),
          NavigationDestination(icon: Icon(Icons.auto_graph_outlined), label: 'Predicciones'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Perfil'),
        ],
      ),
    );
  }

  Widget _tarjetaCicloActual() {
    final ultimo = _ciclos.isNotEmpty ? _ciclos.first : null;
    return Card(
      color: NuviaTheme.primario,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            const Icon(Icons.favorite, color: Colors.white, size: 36),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Tu ciclo actual',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ultimo != null
                        ? 'Inicio: ${ultimo['fecha_inicio']}'
                        : 'Sin ciclos registrados',
                    style: const TextStyle(
                      color: Colors.white, fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/ciclos'),
              child: const Text('Ver', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tarjetaPrediccion() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.auto_graph, color: NuviaTheme.primario),
                SizedBox(width: 8),
                Text(
                  'Próximas predicciones',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _filaPred(Icons.water_drop, 'Próxima menstruación',
                _prediccion!['proxima_menstruacion'] ?? '-', NuviaTheme.menstruacion),
            const SizedBox(height: 8),
            _filaPred(Icons.spa, 'Ovulación estimada',
                _prediccion!['prediccion_ovulacion'] ?? '-', NuviaTheme.ovulacion),
            const SizedBox(height: 8),
            _filaPred(Icons.favorite_border, 'Ventana fértil',
                '${_prediccion!['ventana_fertil_inicio'] ?? '-'} → ${_prediccion!['ventana_fertil_fin'] ?? '-'}',
                NuviaTheme.fertil),
          ],
        ),
      ),
    );
  }

  Widget _filaPred(IconData icon, String label, String valor, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(label, style: const TextStyle(color: NuviaTheme.textoSuave, fontSize: 13))),
        Text(valor, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13)),
      ],
    );
  }

  Widget _gridAcciones(BuildContext context) {
    final acciones = [
      {'label': 'Registrar ciclo', 'icon': Icons.add_circle_outline, 'ruta': '/ciclos'},
      {'label': 'Síntomas',        'icon': Icons.health_and_safety_outlined, 'ruta': '/sintomas'},
      {'label': 'Predicciones',    'icon': Icons.auto_graph_outlined, 'ruta': '/predicciones'},
      {'label': 'Mi perfil',       'icon': Icons.person_outline, 'ruta': '/perfil'},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.6,
      ),
      itemCount: acciones.length,
      itemBuilder: (_, i) {
        final a = acciones[i];
        return GestureDetector(
          onTap: () => Navigator.pushNamed(context, a['ruta'] as String),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(a['icon'] as IconData, color: NuviaTheme.primario, size: 28),
                  const SizedBox(height: 8),
                  Text(a['label'] as String,
                       textAlign: TextAlign.center,
                       style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
