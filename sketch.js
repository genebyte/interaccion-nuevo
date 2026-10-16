/**
 * Gato Cálico Interactivo
 * -----------------------
 * Implementación basada en spec.md (versión robusta con logging)
 *
 * Tecnologías: p5.js + ml5.js (modelo handPose) por CDN.
 *
 * Lógica:
 *   - Dedo índice detectado → aparece el gato 🐱 justo encima del índice.
 *   - Índice en mitad izquierda de la cámara → gato normal (🐱).
 *   - Índice en mitad derecha de la cámara → gato sonriente (😺).
 *   - Movimiento con suavizado (lerp).
 */

let video;
let handPose;
let predictions = [];
let loggedStructure = false; // Solo logueamos la estructura una vez

// Estado del gato
let catX, catY;
let targetCatX, targetCatY;
let catVisible = false;
let isSmiling = false;

// Umbrales y configuración
const CAT_OFFSET_Y = -60;   // px arriba del dedo índice
const CAT_SIZE = 80;        // tamaño del emoji
const LERP_FACTOR = 0.15;   // suavizado del movimiento

function setup() {
  createCanvas(640, 480);

  // Cámara frontal (selfie, espejo horizontal)
  video = createCapture(VIDEO, () => {
    video.size(width, height);
    console.log('Video iniciado');
  });
  video.hide();

  // Modelo handPose de ml5.js
  console.log('Cargando modelo handPose...');
  handPose = ml5.handPose(video, modelReady);

  // Posición inicial del gato
  catX = width / 2;
  catY = height / 2;
}

function modelReady() {
  console.log('Modelo handPose listo');
  startDetectionLoop();
}

let detectionRunning = false;

/**
 * Loop de detección de manos.
 */
async function startDetectionLoop() {
  if (detectionRunning) return;
  detectionRunning = true;

  async function loop() {
    try {
      const results = await handPose.detect(video);
      predictions = Array.isArray(results) ? results : [];

      // Loguear la estructura de la primera predicción solo una vez
      if (!loggedStructure && predictions.length > 0) {
        console.log('Estructura de predicción[0]:', predictions[0]);
        console.log('Claves:', Object.keys(predictions[0]));
        loggedStructure = true;
      }
    } catch (e) {
      console.error('Error en detección:', e);
      predictions = [];
    }
    requestAnimationFrame(loop);
  }

  loop();
}

/**
 * Intenta obtener el landmark del índice (punta) de una predicción.
 * Prueba múltiples rutas porque ml5.js puede devolver distintas estructuras.
 */
function getIndexTip(prediction) {
  if (!prediction) return null;

  // Ruta 1: prediction.landmarks[8]
  if (prediction.landmarks && Array.isArray(prediction.landmarks)) {
    let lm = prediction.landmarks[8];
    if (lm && lm.x !== undefined && lm.y !== undefined) return lm;
  }

  // Ruta 2: prediction.annotations.indexFinger (MediaPipe style)
  if (prediction.annotations && prediction.annotations.indexFinger) {
    let finger = prediction.annotations.indexFinger;
    if (Array.isArray(finger) && finger.length > 0) {
      let tip = finger[finger.length - 1];
      if (tip && tip.x !== undefined && tip.y !== undefined) return tip;
    }
    if (finger && finger[3] && finger[3].x !== undefined) return finger[3];
  }

  // Ruta 3: prediction.hand (algunas versiones)
  if (prediction.hand && prediction.hand.landmarks) {
    let lm = prediction.hand.landmarks[8];
    if (lm && lm.x !== undefined && lm.y !== undefined) return lm;
  }

  // Ruta 4: buscar cualquier propiedad que tenga x e y y parezca un punto
  for (let key in prediction) {
    if (key === 'landmarks' || key === 'annotations') continue;
    let val = prediction[key];
    if (Array.isArray(val) && val.length > 0 && val[0] && val[0].x !== undefined) {
      // Podría ser landmarks envueltos
      let lm = val[8];
      if (lm && lm.x !== undefined && lm.y !== undefined) return lm;
    }
  }

  return null;
}

function draw() {
  background(240);

  // Dibuja el video espejeado horizontalmente (modo selfie)
  push();
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // Estado del gesto en este frame
  let indexVisible = false;
  let indexX, indexY;

  if (predictions && predictions.length > 0 && predictions[0]) {
    let tip = getIndexTip(predictions[0]);

    if (tip) {
      // Las coordenadas pueden venir normalizadas (0-1) o en píxeles
      let rawX = tip.x;
      let rawY = tip.y;

      // Si están normalizadas (0-1), convertir a píxeles
      let nx = rawX <= 1 ? rawX * video.width : rawX;
      let ny = rawY <= 1 ? rawY * video.height : rawY;

      // Coordenada X espejeada para pantalla (selfie)
      indexX = width - nx;
      indexY = ny;
      indexVisible = true;
    }
  }

  // El gato aparece solo cuando se ve el índice
  if (indexVisible) {
    catVisible = true;

    // Mitad izquierda → normal, mitad derecha → sonrisa
    isSmiling = indexX > width / 2;

    // Objetivo: justo arriba del índice
    targetCatX = indexX;
    targetCatY = indexY + CAT_OFFSET_Y;

    // Suavizado (lerp)
    catX = lerp(catX, targetCatX, LERP_FACTOR);
    catY = lerp(catY, targetCatY, LERP_FACTOR);
  } else {
    catVisible = false;
  }

  // Dibuja el gato (emoji)
  if (catVisible) {
    textSize(CAT_SIZE);
    textAlign(CENTER, CENTER);
    text(isSmiling ? '😺' : '🐱', catX, catY);
  }
}