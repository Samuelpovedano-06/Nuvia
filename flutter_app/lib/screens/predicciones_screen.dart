import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/nuvia_theme.dart';

class PrediccionesScreen extends StatefulWidget {
  const PrediccionesScreen({super.key});

  @override
  State<PrediccionesScreen> createState() => _PrediccionesScreenState();
}

class _PrediccionesScreenState extends State<PrediccionesScreen> {
  Map<String, dynamic>? _prediccion;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() { _loading = true; _error = null; });
    try {
      final pred = await ApiService.getPrediccion();
      setState(() { _prediccion = pred; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _loading = false; });
    }
  }

  Future<void> _calcular() async {
    setState(() { _loading = true; _error = null; });
    try {
      final pred = await ApiService.calcularPrediccion();
      setState(() { _prediccion = pred; _loading = false; });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Predicción actualizada 💜'),
                         backgroundColor: NuviaTheme.primario),
        );
      }
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Predicciones'),
        actions: [
          IconButton(icon: const Icon(Icons.calculate_outlined), onPressed: _calcular),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _pantallaError()
              : _contenido(),
    );
  }

  Widget _pantallaError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.info_outline, color: NuviaTheme.textoSuave, size: 60),
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: NuviaTheme.textoSuave),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _calcular,
              icon: const Icon(Icons.auto_graph),
              label: const Text('Calcular predicción'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _contenido() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Basado en tus ciclos anteriores',
            style: TextStyle(color: NuviaTheme.textoSuave, fontSize: 13),
          ),
          const SizedBox(height: 20),

          _tarjetaPrediccion(
            icono: Icons.water_drop,
            titulo: 'Próxima menstruación',
            valor: _prediccion!['proxima_menstruacion'] ?? 'Sin datos',
            color: NuviaTheme.menstruacion,
            descripcion: 'Fecha estimada del inicio de tu próximo período',
          ),
          const SizedBox(height: 16),

          _tarjetaPrediccion(
            icono: Icons.spa_outlined,
            titulo: 'Ovulación',
            valor: _prediccion!['prediccion_ovulacion'] ?? 'Sin datos',
            color: NuviaTheme.ovulacion,
            descripcion: 'Día estimado de mayor fertilidad',
          ),
          const SizedBox(height: 16),

          _tarjetaPrediccion(
            icono: Icons.favorite_border,
            titulo: 'Ventana fértil',
            valor:
                '${_prediccion!['ventana_fertil_inicio'] ?? '-'}  →  ${_prediccion!['ventana_fertil_fin'] ?? '-'}',
            color: NuviaTheme.fertil,
            descripcion: 'Días con mayor probabilidad de fertilidad',
          ),
          const SizedBox(height: 28),

          // Botón recalcular
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _calcular,
              icon: const Icon(Icons.refresh),
              label: const Text('Recalcular predicciones'),
              style: OutlinedButton.styleFrom(
                foregroundColor: NuviaTheme.primario,
                side: const BorderSide(color: NuviaTheme.primario),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tarjetaPrediccion({
    required IconData icono,
    required String titulo,
    required String valor,
    required Color color,
    required String descripcion,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.15),
              radius: 26,
              child: Icon(icono, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titulo,
                       style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 4),
                  Text(valor, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 4),
                  Text(descripcion,
                       style: const TextStyle(color: NuviaTheme.textoSuave, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
