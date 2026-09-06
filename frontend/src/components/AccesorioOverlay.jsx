// El accesorio equipado se dibuja siempre a través del propio sprite
// (getOutfitSprite elegido por pose en outfitSprites.js). Si para esa pose
// concreta no existe todavía arte del accesorio, se prefiere mostrar la
// mascota "sin nada" antes que un icono/emoji genérico superpuesto (una
// llave, un ancla, etc.) que no viene de las carpetas de sprites.
export default function AccesorioOverlay() {
  return null;
}
