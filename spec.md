# Especificaciones del proyecto de interacción

## Funcionamiento general de la aplicación

La aplicación usa la cámara web para detectar las manos del usuario mediante ml5.js (modelo handPose) y dibuja sobre esa imagen con p5.js.

**Aparición del gato**
- Al detectar el dedo índice de la mano, aparece un gato cálico de aspecto tierno justo encima del dedo índice.

**Movimiento**
- El gato se mueve por la pantalla siguiendo el dedo índice.
- El movimiento usa suavizado (lerp) para que no se vea tembloroso.

**Sonrisa**
- Cuando el dedo índice está en la mitad izquierda de la cámara, el gato se muestra normal (🐱).
- Cuando el dedo índice pasa a la mitad derecha de la cámara, el gato cambia a un emoji sonriente (😺).

**Desaparición**
- Si el dedo índice deja de ser detectado por la cámara, el gato desaparece.

## Detección de manos (ml5.js / handPose)

- Modelo: `handPose` de ml5.js.
- Detecta hasta 2 manos con 21 puntos clave cada una.
- Se utiliza la yema del dedo índice (landmark 8) para:
  - La posición del gato.
  - Determinar si está en la mitad izquierda o derecha de la cámara (para la sonrisa).
- La imagen de la cámara se espejea horizontalmente (modo selfie) para que el movimiento coincida con lo que el usuario espera.

## Seguimiento del gato

- Posición base: justo arriba del dedo índice (offset Y negativo, por ejemplo -60 px).
- Tamaño del emoji: 80 px (ajustable).
- Suavizado: lerp con factor 0.15 entre la posición actual del dedo y la posición objetivo del gato.
- Emoji neutral: 🐱 (mitad izquierda de la cámara).
- Emoji sonriente: 😺 (mitad derecha de la cámara).

## Cámara y video

- Cámara: frontal.
- Modo: espejo horizontal (selfie).
- El video se dibuja como fondo del canvas de p5.js.

## Tecnologías

- p5.js (por CDN)
- ml5.js (por CDN, modelo handPose)

## Estructura de archivos

- `index.html`: carga p5.js y ml5.js desde CDN, incluye el canvas y carga `sketch.js`.
- `sketch.js`: contiene la lógica de p5.js (`setup`, `draw`), la inicialización de handPose, la detección del índice, el seguimiento del gato y el dibujo de los emojis.

## Flujo de ejecución

1. `setup()`: crea el canvas, inicializa la captura de video (cámara frontal, espejo) y carga el modelo handPose.
2. `draw()`: dibuja el video de fondo y solicita las detecciones de mano al modelo.
3. Para cada frame con mano detectada:
   - Lee la yema del dedo índice (landmark 8).
   - Calcula la posición del gato (con lerp) justo arriba del índice.
   - Determina si el índice está en la mitad izquierda (🐱) o derecha (😺) de la cámara.
   - Dibuja el emoji correspondiente.
4. Si no se detecta el índice, no se dibuja el gato.
5. Se solicita permiso de acceso a la cámara al usuario al iniciar.

## Consideraciones

- Es necesario permiso de acceso a la cámara.
- La detección funciona mejor con buena iluminación y la mano bien visible frente a la cámara.
- El gato aparece sobre cualquier mano (izquierda o derecha) siempre que se detecte el índice.