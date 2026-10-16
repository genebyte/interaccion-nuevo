/**
 * Gato Cálico Interactivo
 * -----------------------
 * Implementación basada en spec.md
 *
 * Tecnologías: p5.js + ml5.js (modelo handPose) por CDN.
 *
 * Lógica:
 *   - Dedo índice detectado → aparece el gato justo encima del índice.
 *   - Índice en mitad izquierda de la cámara → gato triste (😿).
 *   - Índice en mitad derecha de la cámara → gato sonriente/feliz (😺).
 *   - Movimiento con suavizado (lerp).
 *   - Sonido de "miau" al aparecer y al cambiar de expresión.
 */

let video;
let handPose;
let predictions = [];
let loggedStructure = false;

// Estado del gato
let catX, catY;
let targetCatX, targetCatY;
let catVisible = false;
let isSmiling = false;
let previousSmileState = false;

// Audio
let audioCtx = null;
let meowCooldown = 0;

// Umbrales y configuración
const CAT_OFFSET_Y = -60;   // px arriba del dedo índice
const CAT_SIZE = 80;        // tamaño del emoji
const LERP_FACTOR = 0.15;   // suavizado del movimiento
const MEOW_COOLDOWN_FRAMES = 60; // evitar spam de sonido

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

async function startDetectionLoop() {
  if (detectionRunning) return;
  detectionRunning = true;

  async function loop() {
    try {
      const results = await handPose.detect(video);
      predictions = Array.isArray(results) ? results : [];

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

function getIndexTip(prediction) {
  if (!prediction) return null;

  if (prediction.landmarks && Array.isArray(prediction.landmarks)) {
    let lm = prediction.landmarks[8];
    if (lm && lm.x !== undefined && lm.y !== undefined) return lm;
  }

  if (prediction.annotations && prediction.annotations.indexFinger) {
    let finger = prediction.annotations.indexFinger;
    if (Array.isArray(finger) && finger.length > 0) {
      let tip = finger[finger.length - 1];
      if (tip && tip.x !== undefined && tip.y !== undefined) return tip;
    }
    if (finger && finger[3] && finger[3].x !== undefined) return finger[3];
  }

  if (prediction.hand && prediction.hand.landmarks) {
    let lm = prediction.hand.landmarks[8];
    if (lm && lm.x !== undefined && lm.y !== undefined) return lm;
  }

  for (let key in prediction) {
    if (key === 'landmarks' || key === 'annotations') continue;
    let val = prediction[key];
    if (Array.isArray(val) && val.length > 0 && val[0] && val[0].x !== undefined) {
      let lm = val[8];
      if (lm && lm.x !== undefined && lm.y !== undefined) return lm;
    }
  }

  return null;
}

/**
 * Reproduce un sonido de "miau" sintético usando Web Audio API.
 */
function playMeow() {
  if (meowCooldown > 0) return;
  meowCooldown = MEOW_COOLDOWN_FRAMES;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    // Frecuencia que sube y baja como un miau
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.08);
    oscillator.frequency.exponentialRampToValueAtTime(250, now + 0.25);
    oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.4);

    // Volumen que se desvanece
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    oscillator.start(now);
    oscillator.stop(now + 0.6);
  } catch (e) {
    console.warn('No se pudo reproducir el sonido:', e);
  }
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
      let rawX = tip.x;
      let rawY = tip.y;

      // Coordenadas normalizadas (0-1) -> píxeles
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
    if (!catVisible) {
      // El gato acaba de aparecer: reproducir miau
      playMeow();
    }

    catVisible = true;

    // Mitad izquierda → triste, mitad derecha → sonriente/feliz
    let newSmileState = indexX > width / 2;

    if (newSmileState !== previousSmileState && catVisible) {
      // Cambió de expresión: reproducir miau
      playMeow();
    }

    previousSmileState = newSmileState;
    isSmiling = newSmileState;

    // Objetivo: justo arriba del índice
    targetCatX = indexX;
    targetCatY = indexY + CAT_OFFSET_Y;

    // Suavizado (lerp)
    catX = lerp(catX, targetCatX, LERP_FACTOR);
    catY = lerp(catY, targetCatY, LERP_FACTOR);
  } else {
    catVisible = false;
    previousSmileState = false;
  }

  // Decrementar cooldown de sonido
  if (meowCooldown > 0) meowCooldown--;

  // Dibuja el gato (emoji)
  if (catVisible) {
    textSize(CAT_SIZE);
    textAlign(CENTER, CENTER);
    text(isSmiling ? '😺' : '😿', catX, catY);
  }
}