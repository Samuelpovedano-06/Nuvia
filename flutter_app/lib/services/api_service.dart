import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// URL base de la API. Cambia la IP por la del servidor en producción.
const String baseUrl = 'http://10.0.2.2:8000'; // 10.0.2.2 = localhost desde emulador Android

class ApiService {
  // ─────────────────── Token JWT ───────────────────

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  // ─────────────────── Headers ───────────────────

  static Future<Map<String, String>> _authHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ─────────────────── Auth ───────────────────

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      await saveToken(data['access_token']);
      return data;
    }
    throw Exception(jsonDecode(res.body)['detail'] ?? 'Error al iniciar sesión');
  }

  static Future<Map<String, dynamic>> register(String nombre, String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/registro'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'nombre': nombre, 'email': email, 'password': password}),
    );
    if (res.statusCode == 201) return jsonDecode(res.body);
    throw Exception(jsonDecode(res.body)['detail'] ?? 'Error al registrarse');
  }

  static Future<Map<String, dynamic>> getMe() async {
    final res = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Sesión expirada');
  }

  // ─────────────────── Ciclos ───────────────────

  static Future<List<dynamic>> getCiclos() async {
    final res = await http.get(
      Uri.parse('$baseUrl/ciclos/'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Error al obtener ciclos');
  }

  static Future<Map<String, dynamic>> crearCiclo(Map<String, dynamic> datos) async {
    final res = await http.post(
      Uri.parse('$baseUrl/ciclos/'),
      headers: await _authHeaders(),
      body: jsonEncode(datos),
    );
    if (res.statusCode == 201) return jsonDecode(res.body);
    throw Exception(jsonDecode(res.body)['detail'] ?? 'Error al crear ciclo');
  }

  static Future<Map<String, dynamic>> actualizarCiclo(int id, Map<String, dynamic> datos) async {
    final res = await http.put(
      Uri.parse('$baseUrl/ciclos/$id'),
      headers: await _authHeaders(),
      body: jsonEncode(datos),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Error al actualizar ciclo');
  }

  static Future<void> eliminarCiclo(int id) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/ciclos/$id'),
      headers: await _authHeaders(),
    );
    if (res.statusCode != 204) throw Exception('Error al eliminar ciclo');
  }

  // ─────────────────── Síntomas ───────────────────

  static Future<List<dynamic>> getSintomas() async {
    final res = await http.get(
      Uri.parse('$baseUrl/sintomas'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Error al obtener síntomas');
  }

  static Future<Map<String, dynamic>> registrarSintoma(Map<String, dynamic> datos) async {
    final res = await http.post(
      Uri.parse('$baseUrl/registros-sintomas'),
      headers: await _authHeaders(),
      body: jsonEncode(datos),
    );
    if (res.statusCode == 201) return jsonDecode(res.body);
    throw Exception('Error al registrar síntoma');
  }

  static Future<List<dynamic>> getMisSintomas() async {
    final res = await http.get(
      Uri.parse('$baseUrl/registros-sintomas'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Error al obtener síntomas');
  }

  // ─────────────────── Historial estados ───────────────────

  static Future<Map<String, dynamic>> registrarEstado(String estado, String fecha) async {
    final res = await http.post(
      Uri.parse('$baseUrl/historial-estados/'),
      headers: await _authHeaders(),
      body: jsonEncode({'estado_animo': estado, 'fecha': fecha}),
    );
    if (res.statusCode == 201) return jsonDecode(res.body);
    throw Exception('Error al registrar estado');
  }

  static Future<List<dynamic>> getHistorialEstados() async {
    final res = await http.get(
      Uri.parse('$baseUrl/historial-estados/'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Error al obtener historial');
  }

  // ─────────────────── Predicciones ───────────────────

  static Future<Map<String, dynamic>> calcularPrediccion() async {
    final res = await http.post(
      Uri.parse('$baseUrl/predicciones/calcular'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 201) return jsonDecode(res.body);
    throw Exception(jsonDecode(res.body)['detail'] ?? 'Error al calcular predicción');
  }

  static Future<Map<String, dynamic>> getPrediccion() async {
    final res = await http.get(
      Uri.parse('$baseUrl/predicciones/'),
      headers: await _authHeaders(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('No hay predicciones disponibles');
  }
}
