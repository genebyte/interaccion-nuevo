# Especificaciones del proyecto de interacción

## Funcionamiento general de la aplicación

La aplicación usa la cámara web para detectar las manos del usuario mediante ml5.js (modelo handPose) y dibuja sobre esa imagen con p5.js.

**Gesto de activación**
- El usuario coloca los dedos índice y medio juntos (extendidos y pegados entre sí).
- Al mismo tiempo, los dedos anular y meñique apuntan hacia la cámara (se ve la parte de la uña de esos dedos).
- Al detectarse este gesto, aparece un gato cálico de aspecto tierno justo arriba del dedo índice y medio.

**Movimiento**
- El gato se mueve por la pantalla siguiendo los dedos índice y medio.
- El movimiento usa suavizado (lerp) para que no se vea tembloroso.

**Sonrisa**
- Cuando los dedos índice y medio apuntan hacia la cámara (se ve la parte de la uña), el gato cambia a un emoji sonriente (😺).
- Mientras mantengan esa dirección, se mantiene sonriente. Cuando dejen de apuntar hacia la cámara, vuelve al emoji neutral (🐱).

**Desaparición**
- Si se separan los dedos índice y medio, o si se levantan el anular y meñique, el gato desaparece.

## Detección de manos (ml5.js / handPose)

- Modelo: `handPose` de ml5.js.
- Detecta hasta 2 manos con 21 puntos clave cada una.
- Se utilizan las yemas de:
  - Índice (para la posición del gato y para detectar si apunta hacia la cámara).
  - Medio (para verificar que esté junto al índice).
  - Anular y meñique (para verificar que apunten hacia la cámara).
- Umbrales iniciales (ajustables según cámara y distancia del usuario):
  - Índice y medio "juntos": distancia entre yemas menor a 50 px.
  - Dedo apuntando hacia la cámara (se ve la uña): el ángulo formado por las articulaciones metacarpiana → proximal → distal del dedo indica que apunta hacia adelante, es decir, hacia la cámara.
- La imagen de la cámara se espejea horizontalmente (modo selfie) para que el movimiento coincida con lo que el usuario espera.

## Seguimiento del gato

- Posición base: justo arriba del dedo índice (offset Y negativo, por ejemplo -60 px).
- Tamaño del emoji: 80 px (ajustable).
- Suavizado: lerp con factor 0.15 entre la posición actual del dedo y la posición objetivo del gato.
- Emoji neutral: 🐱
- Emoji sonriente: 😺 (se activa cuando el índice y medio apuntan hacia la cámara).

## Cámara y video

- Cámara: frontal.
- Modo: espejo horizontal (selfie).
- El video se dibuja como fondo del canvas de p5.js.

## Tecnologías

- p5.js (por CDN)
- ml5.js (por CDN, modelo handPose)

## Estructura de archivos

- `index.html`: carga p5.js y ml5.js desde CDN, incluye el canvas y carga `sketch.js`.
- `sketch.js`: contiene la lógica de p5.js (`setup`, `draw`), la inicialización de handPose, la detección del gesto, el seguimiento del gato y el dibujo de los emojis.

## Flujo de ejecución

1. `setup()`: crea el canvas, inicializa la captura de video (cámara frontal, espejo) y carga el modelo handPose.
2. `draw()`: dibuja el video de fondo y solicita las detecciones de mano al modelo.
3. Para cada mano detectada:
   - Lee las yemas de índice, medio, anular y meñique.
   - Evalúa si se cumple el gesto de activación.
   - Si se cumple: calcula la posición del gato (con lerp) y dibuja el emoji (neutral o sonriente según el ángulo del índice y medio).
   - Si no se cumple: no dibuja el gato.
4. Se solicita permiso de acceso a la cámara al usuario al iniciar.

## Consideraciones

- Es necesario permiso de acceso a la cámara.
- Los umbrales de distancia y posición son valores iniciales; pueden ajustarse según la cámara y la distancia del usuario.
- La detección funciona mejor con buena iluminación y la mano bien visible frente a la cámara.