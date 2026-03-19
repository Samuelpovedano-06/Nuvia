import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/nuvia_theme.dart';

class SintomasScreen extends StatefulWidget {
  const SintomasScreen({super.key});

  @override
  State<SintomasScreen> createState() => _SintomasScreenState();
}

class _SintomasScreenState extends State<SintomasScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<dynamic> _catalogo   = [];
  List<dynamic> _misRegistros = [];
  List<dynamic> _misEstados = [];
  bool _loading = true;

  // Estados de ánimo disponibles
  static const List<Map<String, dynamic>> _estados = [
    {'label': 'Feliz',      'emoji': '😊'},
    {'label': 'Triste',     'emoji': '😢'},
    {'label': 'Irritable',  'emoji': '😤'},
    {'label': 'Ansiosa',    'emoji': '😰'},
    {'label': 'Energética', 'emoji': '⚡'},
    {'label': 'Tranquila',  'emoji': '😌'},
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _cargar();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() => _loading = true);
    try {
      final cat    = await ApiService.getSintomas();
      final regs   = await ApiService.getMisSintomas();
      final estados= await ApiService.getHistorialEstados();
      setState(() {
        _catalogo    = cat;
        _misRegistros = regs;
        _misEstados  = estados;
        _loading     = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _registrarSintoma(Map<String, dynamic> sintoma) async {
    final hoy = DateTime.now().toIso8601String().substring(0, 10);
    try {
      await ApiService.registrarSintoma({
        'id_sintoma': sintoma['id_sintoma'],
        'fecha': hoy,
        'intensidad': 2,
      });
      await _cargar();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Síntoma "${sintoma['nombre_sintoma']}" registrado'),
            backgroundColor: NuviaTheme.primario,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  Future<void> _registrarEstado(String estado) async {
    final hoy = DateTime.now().toIso8601String().substring(0, 10);
    try {
      await ApiService.registrarEstado(estado, hoy);
      await _cargar();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Síntomas y estado'),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: NuviaTheme.primario,
          labelColor: NuviaTheme.primario,
          tabs: const [
            Tab(text: 'Síntomas'),
            Tab(text: 'Estado de ánimo'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabCtrl,
              children: [_tabSintomas(), _tabEstados()],
            ),
    );
  }

  Widget _tabSintomas() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Toca para registrar hoy',
                     style: TextStyle(color: NuviaTheme.textoSuave, fontSize: 13)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10, runSpacing: 10,
            children: _catalogo.map((s) => ActionChip(
              label: Text(s['nombre_sintoma']),
              avatar: const Icon(Icons.add_circle_outline, size: 18),
              backgroundColor: NuviaTheme.primario.withOpacity(0.1),
              onPressed: () => _registrarSintoma(s),
            )).toList(),
          ),
          const SizedBox(height: 24),
          const Text('Registrados hoy',
                     style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 8),
          if (_misRegistros.isEmpty)
            const Text('Ningún síntoma registrado',
                       style: TextStyle(color: NuviaTheme.textoSuave))
          else
            ..._misRegistros.take(5).map((r) => ListTile(
              dense: true,
              leading: const Icon(Icons.health_and_safety_outlined,
                                  color: NuviaTheme.primario),
              title: Text('Síntoma #${r['id_sintoma']}'),
              subtitle: Text(r['fecha']),
            )),
        ],
      ),
    );
  }

  Widget _tabEstados() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('¿Cómo te sientes hoy?',
                     style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.2,
            children: _estados.map((e) => GestureDetector(
              onTap: () => _registrarEstado(e['label']!),
              child: Card(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(e['emoji']!, style: const TextStyle(fontSize: 28)),
                    const SizedBox(height: 4),
                    Text(e['label']!,
                         style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            )).toList(),
          ),
          const SizedBox(height: 24),
          const Text('Historial',
                     style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 8),
          if (_misEstados.isEmpty)
            const Text('No hay registros de estado',
                       style: TextStyle(color: NuviaTheme.textoSuave))
          else
            ..._misEstados.take(7).map((e) => ListTile(
              dense: true,
              leading: Text(
                _estados.firstWhere(
                  (s) => s['label'] == e['estado_animo'],
                  orElse: () => {'emoji': '💜'},
                )['emoji']!,
                style: const TextStyle(fontSize: 22),
              ),
              title: Text(e['estado_animo'] ?? '-'),
              subtitle: Text(e['fecha']),
            )),
        ],
      ),
    );
  }
}
