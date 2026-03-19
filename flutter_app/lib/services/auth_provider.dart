import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _usuaria;
  bool _loading = false;
  String? _error;

  Map<String, dynamic>? get usuaria => _usuaria;
  bool get loading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _usuaria != null;

  void _setLoading(bool v) { _loading = v; notifyListeners(); }
  void _setError(String? v) { _error = v; notifyListeners(); }

  Future<bool> login(String email, String password) async {
    _setLoading(true); _setError(null);
    try {
      await ApiService.login(email, password);
      _usuaria = await ApiService.getMe();
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> register(String nombre, String email, String password) async {
    _setLoading(true); _setError(null);
    try {
      await ApiService.register(nombre, email, password);
      return await login(email, password);
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> cargarUsuaria() async {
    try {
      final token = await ApiService.getToken();
      if (token != null) {
        _usuaria = await ApiService.getMe();
        notifyListeners();
      }
    } catch (_) {
      await logout();
    }
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _usuaria = null;
    notifyListeners();
  }
}
