import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/nuvia_theme.dart';

class CiclosScreen extends StatefulWidget {
  const CiclosScreen({super.key});

  @override
  State<CiclosScreen> createState() => _CiclosScreenState();
}

class _CiclosScreenState extends State<CiclosScreen> {
  List<dynamic> _ciclos = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getCiclos();
      setState(() { _ciclos = data; _loading = false; });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  Future<void> _nuevoCiclo() async {
    DateTime? fechaInicio = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      helpText: 'Fecha de inicio del ciclo',
    );
    if (fechaInicio == null || !mounted) return;

    try {
      await ApiService.crearCiclo({
        'fecha_inicio': fechaInicio.toIso8601String().substring(0, 10),
      });
      await _cargar();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ciclo registrado 💜'),
                         backgroundColor: NuviaTheme.primario),
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

  Future<void> _finalizarCiclo(int idCiclo) async {
    DateTime? fechaFin = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      helpText: 'Fecha de fin del ciclo',
    );
    if (fechaFin == null || !mounted) return;

    try {
      await ApiService.actualizarCiclo(idCiclo, {
        'fecha_fin': fechaFin.toIso8601String().substring(0, 10),
      });
      await _cargar();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  Future<void> _eliminarCiclo(int idCiclo) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Eliminar ciclo'),
        content: const Text('¿Estás segura de que quieres eliminar este ciclo?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;

    try {
      await ApiService.eliminarCiclo(idCiclo);
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
        title: const Text('Mis ciclos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargar,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _ciclos.isEmpty
              ? _vacio()
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _ciclos.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _tarjetaCiclo(_ciclos[i]),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _nuevoCiclo,
        icon: const Icon(Icons.add),
        label: const Text('Nuevo ciclo'),
        backgroundColor: NuviaTheme.primario,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _tarjetaCiclo(Map<String, dynamic> ciclo) {
    final tieneFin = ciclo['fecha_fin'] != null;
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: NuviaTheme.primario.withOpacity(0.15),
          child: const Icon(Icons.water_drop, color: NuviaTheme.primario),
        ),
        title: Text(
          'Inicio: ${ciclo['fecha_inicio']}',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          tieneFin
              ? 'Fin: ${ciclo['fecha_fin']}  •  ${ciclo['duracion'] ?? '?'} días'
              : 'En curso...',
          style: TextStyle(
            color: tieneFin ? NuviaTheme.textoSuave : NuviaTheme.primario,
          ),
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (v) {
            if (v == 'finalizar') _finalizarCiclo(ciclo['id_ciclo']);
            if (v == 'eliminar')  _eliminarCiclo(ciclo['id_ciclo']);
          },
          itemBuilder: (_) => [
            if (!tieneFin)
              const PopupMenuItem(value: 'finalizar', child: Text('Finalizar ciclo')),
            const PopupMenuItem(
              value: 'eliminar',
              child: Text('Eliminar', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _vacio() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.calendar_today_outlined,
                     color: NuviaTheme.textoSuave, size: 64),
          const SizedBox(height: 16),
          const Text('No hay ciclos registrados',
                     style: TextStyle(color: NuviaTheme.textoSuave, fontSize: 16)),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _nuevoCiclo,
            icon: const Icon(Icons.add),
            label: const Text('Registrar primer ciclo'),
          ),
        ],
      ),
    );
  }
}
