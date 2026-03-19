import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NuviaTheme {
  // Paleta de colores
  static const Color primario    = Color(0xFFB05BB5); // Lila Nuvia
  static const Color secundario  = Color(0xFFE891C8); // Rosa suave
  static const Color fondo       = Color(0xFFFCF0FA); // Fondo muy claro
  static const Color superfice   = Colors.white;
  static const Color texto       = Color(0xFF3D2B3F);
  static const Color textoSuave  = Color(0xFF8A6A8D);
  static const Color fertil      = Color(0xFF81C784); // Verde ventana fértil
  static const Color ovulacion   = Color(0xFFFFB74D); // Naranja ovulación
  static const Color menstruacion = Color(0xFFE57373); // Rojo menstruación

  static ThemeData get tema => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primario,
      primary: primario,
      secondary: secundario,
      background: fondo,
      surface: superfice,
    ),
    scaffoldBackgroundColor: fondo,
    textTheme: GoogleFonts.poppinsTextTheme(),
    appBarTheme: const AppBarTheme(
      backgroundColor: superfice,
      foregroundColor: texto,
      elevation: 0,
      centerTitle: true,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primario,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: primario.withOpacity(0.3)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: primario.withOpacity(0.3)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primario, width: 2),
      ),
    ),
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: superfice,
    ),
  );
}
