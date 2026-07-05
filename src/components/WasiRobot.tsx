import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface WasiRobotProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  width?: number;
  height?: number;
}

// ── Palette — warm violet body, gold soul, cream background ──────────────
const BODY_MAIN    = 0x7B6BA0; // Soft warm violet — visible on #FAFAF8
const BODY_DARK    = 0x5A4B80; // Deeper violet for depth
const BODY_LIGHT   = 0x9B8BBF; // Lighter violet for highlights
const BODY_CREAM   = 0xEDE6F5; // Pale lavender-cream belly plate
const GOLD_SOUL    = 0xE8C96B; // The soul — eyes, core, antenna glow
const GOLD_ACCENT  = 0xD4A84B; // Subtle gold trim
const SHADOW_TINT  = 0x5A4B80;

// Face-screen canvas colors
const FACE_BG      = '#1A1028';
const FACE_EDGE    = 'rgba(232, 201, 107, 0.16)';
const EYE_GOLD     = '#F5E0A0';
const EYE_CORE     = '#FFF6D8';
const IRIS_GOLD    = '#E8C96B';
const PUPIL_DARK   = '#2A1B3E';
const MOUTH_GOLD   = '#E8C96B';
const BLUSH_PINK   = 'rgba(240, 160, 140, 0.55)';

// ── Proportions — chibi: head carries ~60% of the silhouette ─────────────
const HR = 0.62;          // head radius — big baby head
const HEAD_Y = 0.22;      // head group height
const BODY_Y = -0.62;     // egg-body centre

// ── Tracking ─────────────────────────────────────────────────────────────
const LERP_IDLE     = 0.04;
const LERP_TRACK    = 0.14;
const MAX_YAW       = Math.PI / 5;    // 36° — balanced left/right
const MAX_PITCH     = Math.PI / 6.5;  // ~28°
const MAX_ROLL      = 0.07;
const AWARENESS_R   = 550;
const EXCITE_R      = 200;             // this close → full delight
const IDLE_MS       = 3500;
const SLEEPY_MS     = 30000;           // this long idle → droopy lids
const CARET_MS      = 1500;
const TRACK_DIST    = 220;             // atan2 denominator — higher = less sensitive

// ── Blink ────────────────────────────────────────────────────────────────
const BLINK_MIN = 2200;
const BLINK_MAX = 5000;
const BLINK_DUR = 130;

// ── Face canvas ──────────────────────────────────────────────────────────
const FACE_W = 256;
const FACE_H = 160;

// ── Caret mirror ─────────────────────────────────────────────────────────
function getCaretX(el: HTMLInputElement): number {
  const m = document.createElement('div');
  const s = getComputedStyle(el);
  (['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing',
    'paddingLeft','paddingRight','borderLeftWidth','borderRightWidth','boxSizing'] as const)
    .forEach(p => { const v = s.getPropertyValue(p); if (v) m.style.setProperty(p, v); });
  Object.assign(m.style, { position:'absolute', visibility:'hidden', whiteSpace:'pre', width:'auto' });
  const sp = document.createElement('span');
  sp.textContent = el.value.substring(0, el.selectionStart ?? 0);
  m.appendChild(sp);
  document.body.appendChild(m);
  const w = sp.offsetWidth;
  document.body.removeChild(m);
  return w - el.scrollLeft;
}

// ── Material factory ─────────────────────────────────────────────────────
const mat = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.30, metalness: 0.50, ...opts });

// ── Expression state — every param eases toward its target each frame ────
interface Expr {
  eyeOpen: number;   // 0 shut … 1 wide
  happy: number;     // 0 neutral … 1 arc-eyed delight
  focus: number;     // 1 while typing — narrowed, attentive
  surprise: number;  // spikes on tap, decays
  pupilX: number;    // -1 … 1
  pupilY: number;    // -1 … 1
}

const WAVE_MS = 1900; // duration of a HI / BYE wave gesture

// ── Face renderer — 2D canvas mapped onto the curved face screen ─────────
function drawFace(ctx: CanvasRenderingContext2D, e: Expr) {
  const W = FACE_W, H = FACE_H;
  ctx.clearRect(0, 0, W, H);

  // Screen glass — rounded, faint top sheen, warm edge glow
  const r = 46;
  ctx.beginPath();
  ctx.moveTo(r, 2);
  ctx.arcTo(W - 2, 2, W - 2, H - 2, r);
  ctx.arcTo(W - 2, H - 2, 2, H - 2, r);
  ctx.arcTo(2, H - 2, 2, 2, r);
  ctx.arcTo(2, 2, W - 2, 2, r);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#241638');
  bg.addColorStop(0.4, FACE_BG);
  bg.addColorStop(1, '#150C22');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = FACE_EDGE;
  ctx.stroke();

  // Faint sheen band across the top of the glass
  const sheen = ctx.createLinearGradient(0, 6, 0, 44);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(16, 6, W - 32, 38);

  const eyeY = H * 0.46 + e.pupilY * 6;
  const eyeDX = 44;
  const eyeR = 23;
  const open = Math.max(0.06, e.eyeOpen * (1 - e.focus * 0.28));
  const px = e.pupilX * 7;
  const py = e.pupilY * 5;

  for (const side of [-1, 1]) {
    const cx = W / 2 + side * eyeDX + px;

    if (e.happy > 0.55 && open > 0.3) {
      // Delight — closed happy arcs (^ ^) with a soft glow
      ctx.save();
      ctx.shadowColor = IRIS_GOLD;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = EYE_GOLD;
      ctx.lineWidth = 7.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, eyeY + 7, eyeR * 0.92, Math.PI * 1.16, Math.PI * 1.84);
      ctx.stroke();
      ctx.restore();
    } else {
      // Open eye — anime-soft gold orb: vertical warmth gradient, iris ring,
      // pupil, triple catchlights, gentle upper-lid shading
      ctx.save();
      ctx.translate(cx, eyeY);
      ctx.scale(1, open);

      const surpR = eyeR * (1 + e.surprise * 0.22);
      const glow = ctx.createRadialGradient(0, -surpR * 0.25, 2, 0, 0, surpR * 1.35);
      glow.addColorStop(0, EYE_CORE);
      glow.addColorStop(0.45, EYE_GOLD);
      glow.addColorStop(0.82, IRIS_GOLD);
      glow.addColorStop(1, 'rgba(212,168,75,0)');
      ctx.shadowColor = IRIS_GOLD;
      ctx.shadowBlur = 18;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(0, 0, surpR * 0.94, surpR, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Iris ring
      ctx.strokeStyle = 'rgba(212,168,75,0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px * 0.4, py * 0.4, surpR * 0.60, 0, Math.PI * 2);
      ctx.stroke();

      // Pupil — soft-edged, slightly tall for warmth
      const pup = ctx.createRadialGradient(px * 0.5, py * 0.5, 1, px * 0.5, py * 0.5, surpR * 0.34);
      pup.addColorStop(0, PUPIL_DARK);
      pup.addColorStop(0.8, PUPIL_DARK);
      pup.addColorStop(1, 'rgba(42,27,62,0)');
      ctx.fillStyle = pup;
      ctx.beginPath();
      ctx.ellipse(px * 0.5, py * 0.5, surpR * (0.28 - e.surprise * 0.05), surpR * (0.32 - e.surprise * 0.05), 0, 0, Math.PI * 2);
      ctx.fill();

      // Triple catchlights — big upper-left, small lower-right, pin sparkle
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(px * 0.5 - surpR * 0.26, py * 0.5 - surpR * 0.30, surpR * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(px * 0.5 + surpR * 0.24, py * 0.5 + surpR * 0.20, surpR * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(px * 0.5 - surpR * 0.05, py * 0.5 + surpR * 0.38, surpR * 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Soft upper-lid shade — grounds the eye, keeps it gentle
      const lid = ctx.createLinearGradient(0, -surpR, 0, -surpR * 0.35);
      lid.addColorStop(0, 'rgba(21,12,34,0.55)');
      lid.addColorStop(1, 'rgba(21,12,34,0)');
      ctx.fillStyle = lid;
      ctx.beginPath();
      ctx.ellipse(0, 0, surpR * 0.94, surpR, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Lower lid rises with focus (typing concentration)
      if (e.focus > 0.05) {
        ctx.fillStyle = FACE_BG;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + eyeR * (1.45 - e.focus * 0.5), eyeR * 1.3, eyeR * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Blush — warms with happiness
  const blushA = 0.18 + e.happy * 0.5;
  for (const side of [-1, 1]) {
    const bx = W / 2 + side * (eyeDX + 32);
    const bl = ctx.createRadialGradient(bx, eyeY + 20, 1, bx, eyeY + 20, 15);
    bl.addColorStop(0, BLUSH_PINK.replace('0.55', String(blushA.toFixed(2))));
    bl.addColorStop(1, 'rgba(240,160,140,0)');
    ctx.fillStyle = bl;
    ctx.beginPath();
    ctx.ellipse(bx, eyeY + 20, 15, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  const my = H * 0.76 + e.pupilY * 3;
  const mx = W / 2 + px * 0.6;
  ctx.strokeStyle = MOUTH_GOLD;
  ctx.fillStyle = MOUTH_GOLD;
  ctx.lineCap = 'round';
  if (e.surprise > 0.45) {
    // Little "o" of surprise
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(mx, my, 8 + e.surprise * 5, 10 + e.surprise * 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (e.happy > 0.55) {
    // Open happy smile with tongue-ish inner warmth
    const w = 22 + e.happy * 10;
    ctx.beginPath();
    ctx.moveTo(mx - w, my - 3);
    ctx.quadraticCurveTo(mx, my + 20 + e.happy * 6, mx + w, my - 3);
    ctx.quadraticCurveTo(mx, my + 6, mx - w, my - 3);
    ctx.closePath();
    ctx.fill();
  } else {
    // Gentle default smile, flattens slightly while focused
    const curve = 9 * (1 - e.focus * 0.6) + e.happy * 8;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(mx - 16, my);
    ctx.quadraticCurveTo(mx, my + curve, mx + 16, my);
    ctx.stroke();
  }
}

// ── Star sprite for tap burst ────────────────────────────────────────────
function makeStarTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.translate(32, 32);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 30);
  g.addColorStop(0, 'rgba(255,246,216,1)');
  g.addColorStop(0.4, 'rgba(232,201,107,0.9)');
  g.addColorStop(1, 'rgba(232,201,107,0)');
  ctx.fillStyle = g;
  // 4-point sparkle
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 30 : 7;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const N_STARS = 14;
const N_MOTES = 12;

// ═════════════════════════════════════════════════════════════════════════
export default function WasiRobot({ inputRef, width = 240, height = 280 }: WasiRobotProps) {
  const box = useRef<HTMLDivElement>(null);

  // Three.js refs
  const sceneRef   = useRef<THREE.Scene>(null);
  const camRef     = useRef<THREE.PerspectiveCamera>(null);
  const rRef       = useRef<THREE.WebGLRenderer>(null);
  const robotRef   = useRef<THREE.Group>(null);
  const headRef    = useRef<THREE.Group>(null);
  const faceTexRef = useRef<THREE.CanvasTexture>(null);
  const faceCtxRef = useRef<CanvasRenderingContext2D>(null);
  const antRef     = useRef<THREE.Group>(null);
  const antTipRef  = useRef<THREE.Mesh>(null);
  const coreRef    = useRef<THREE.Mesh>(null);
  const coreRingRef = useRef<THREE.Mesh>(null);
  const shadRef    = useRef<THREE.Mesh>(null);
  const armLRef    = useRef<THREE.Group>(null);
  const armRRef    = useRef<THREE.Group>(null);
  const earDiscLRef = useRef<THREE.Mesh>(null);
  const earDiscRRef = useRef<THREE.Mesh>(null);
  const hoverRef   = useRef<THREE.Mesh>(null);
  const starsRef   = useRef<THREE.Points>(null);
  const motesRef   = useRef<THREE.Points>(null);

  // Physics + expression state
  const S = useRef({
    tRotX: 0, tRotY: 0, cRotX: 0, cRotY: 0, cRotZ: 0,
    mode: 'idle' as 'idle'|'mouse'|'caret',
    lastT: 0, mx: 0, my: 0, near: false, excited: false,
    aRx: 0, aRy: 0, aVx: 0, aVy: 0, // antenna spring
    blink: false, blinkT: 0, blinkTimer: 0,
    // hop physics (tap reaction)
    hopY: 0, hopV: 0, hopping: false,
    // greeting gestures — 0 none, 1 HI (you arrived), 2 BYE (you left)
    wave: 0 as 0 | 1 | 2, waveT: 0,
    // expression — current values, eased toward targets in the loop
    expr: { eyeOpen: 1, happy: 0.25, focus: 0, surprise: 0, pupilX: 0, pupilY: 0 } as Expr,
    // star burst particles
    starVel: [] as Array<{x:number,y:number,z:number}>,
    starLife: 0,
    reduceMotion: false,
    fid: 0, dead: false,
  });

  // ── Build ─────────────────────────────────────────────────────────────
  const build = useCallback((scene: THREE.Scene) => {
    const g = new THREE.Group();

    // ══ Body — soft egg, cream belly, glowing heart ══
    const bodyGeo = new THREE.SphereGeometry(0.40, 32, 32);
    bodyGeo.scale(1.0, 1.12, 0.88);
    const body = new THREE.Mesh(bodyGeo, mat(BODY_MAIN, { roughness: 0.26, metalness: 0.65 }));
    body.position.y = BODY_Y;
    g.add(body);

    // Belly plate — pale lavender-cream inset, like a soft tummy
    const bellyGeo = new THREE.SphereGeometry(0.315, 28, 28);
    bellyGeo.scale(0.94, 1.05, 0.62);
    const belly = new THREE.Mesh(bellyGeo, mat(BODY_CREAM, { roughness: 0.45, metalness: 0.15 }));
    belly.position.set(0, BODY_Y - 0.02, 0.135);
    g.add(belly);

    // Waist trim — thin gold seam around the egg
    const waist = new THREE.Mesh(
      new THREE.TorusGeometry(0.375, 0.010, 8, 40),
      mat(GOLD_ACCENT, { roughness: 0.15, metalness: 0.9, emissive: GOLD_ACCENT, emissiveIntensity: 0.25 }),
    );
    waist.rotation.x = Math.PI / 2;
    waist.position.y = BODY_Y - 0.16;
    waist.scale.set(1, 0.88, 1);
    g.add(waist);

    // Chest heart-core — gold orb behind glass
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 20, 20),
      new THREE.MeshStandardMaterial({
        color: GOLD_SOUL, emissive: GOLD_SOUL, emissiveIntensity: 1.8,
        roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.92,
      }),
    );
    core.position.set(0, BODY_Y + 0.06, 0.325);
    g.add(core);
    coreRef.current = core;

    // Rotating gear-ring around the core — tiny mechanical life
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.013, 8, 8), // low segment count = faceted gear look
      mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.9 }),
    );
    coreRing.position.copy(core.position);
    g.add(coreRing);
    coreRingRef.current = coreRing;

    const coreLight = new THREE.PointLight(GOLD_SOUL, 0.45, 1.4);
    coreLight.position.copy(core.position).z += 0.1;
    g.add(coreLight);

    // ══ Arms — stubby capsules with mitten hands ══
    const makeArm = (side: number) => {
      const grp = new THREE.Group();
      grp.position.set(side * 0.40, BODY_Y + 0.16, 0); // shoulder pivot

      const shoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 16, 16),
        mat(BODY_DARK, { roughness: 0.28 }),
      );
      grp.add(shoulder);

      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.055, 0.16, 6, 14),
        mat(BODY_MAIN, { roughness: 0.25, metalness: 0.7 }),
      );
      arm.position.set(side * 0.045, -0.14, 0);
      arm.rotation.z = side * 0.28;
      grp.add(arm);

      // Gold wrist band
      const wrist = new THREE.Mesh(
        new THREE.TorusGeometry(0.056, 0.009, 8, 20),
        mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.15 }),
      );
      wrist.position.set(side * 0.075, -0.235, 0);
      wrist.rotation.z = side * 0.28;
      wrist.rotation.x = Math.PI / 2;
      grp.add(wrist);

      // Mitten hand
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 16, 16),
        mat(BODY_LIGHT, { roughness: 0.3, metalness: 0.5 }),
      );
      hand.position.set(side * 0.085, -0.27, 0);
      grp.add(hand);

      return grp;
    };
    const armL = makeArm(-1);
    const armR = makeArm(1);
    g.add(armL); g.add(armR);
    armLRef.current = armL;
    armRRef.current = armR;

    // ══ Hover ring — soft thruster glow under the body ══
    const hover = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.035, 12, 32),
      new THREE.MeshStandardMaterial({
        color: GOLD_SOUL, emissive: GOLD_SOUL, emissiveIntensity: 0.9,
        transparent: true, opacity: 0.5, roughness: 0.2, metalness: 0.3,
      }),
    );
    hover.rotation.x = Math.PI / 2;
    hover.position.y = BODY_Y - 0.44;
    hover.scale.set(1, 1, 0.4);
    g.add(hover);
    hoverRef.current = hover;

    // ══ Neck ══
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.10, 20),
      mat(BODY_DARK, { roughness: 0.35 }),
    );
    neck.position.y = BODY_Y + 0.42;
    g.add(neck);
    const neckRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.008, 8, 24),
      mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.15 }),
    );
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = BODY_Y + 0.46;
    g.add(neckRing);

    // ══ Head — big, round, full of micro detail ══
    const head = new THREE.Group();
    head.position.y = HEAD_Y;

    // Main dome
    const domeGeo = new THREE.SphereGeometry(HR, 48, 48);
    domeGeo.scale(1.06, 0.92, 0.96);
    const dome = new THREE.Mesh(domeGeo, mat(BODY_MAIN, { roughness: 0.24, metalness: 0.68 }));
    head.add(dome);

    // Rear plate — darker violet cap
    const rearGeo = new THREE.SphereGeometry(HR + 0.012, 48, 24, 0, Math.PI, 0.4, Math.PI - 0.8);
    rearGeo.scale(1.07, 0.93, 0.97);
    const rear = new THREE.Mesh(rearGeo, mat(BODY_DARK, { roughness: 0.3 }));
    rear.rotation.y = Math.PI;
    head.add(rear);

    // Panel seams — two thin recessed rings over the dome
    const seamMat = mat(BODY_DARK, { roughness: 0.4, metalness: 0.6 });
    const seam1 = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.99, 0.006, 6, 48), seamMat);
    seam1.rotation.x = Math.PI / 2 - 0.42;
    seam1.scale.set(1.06, 0.96, 0.92);
    head.add(seam1);
    const seam2 = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.88, 0.005, 6, 48), seamMat);
    seam2.rotation.x = Math.PI / 2 - 0.15;
    seam2.position.y = 0.30;
    seam2.scale.set(1.06, 1, 0.92);
    head.add(seam2);

    // Micro bolts along the crown seam
    const boltGeo = new THREE.SphereGeometry(0.014, 8, 8);
    const boltMat = mat(GOLD_ACCENT, { metalness: 0.95, roughness: 0.1, emissive: GOLD_ACCENT, emissiveIntensity: 0.15 });
    [-0.72, -0.28, 0.28, 0.72].forEach(a => {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(Math.sin(a) * HR * 0.93 * 1.06, Math.cos(a * 0.7) * 0.30 + 0.22, Math.cos(a) * HR * 0.72);
      head.add(bolt);
    });

    // Forehead gem — small gold diamond
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.045),
      mat(GOLD_SOUL, { emissive: GOLD_SOUL, emissiveIntensity: 0.9, roughness: 0.05, metalness: 0.6 }),
    );
    gem.position.set(0, 0.40, 0.44);
    gem.rotation.x = -0.3;
    gem.scale.set(1, 1.3, 0.5);
    head.add(gem);

    // ══ Face screen — curved plane carrying the canvas-drawn face ══
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = FACE_W;
    faceCanvas.height = FACE_H;
    const faceCtx = faceCanvas.getContext('2d')!;
    faceCtxRef.current = faceCtx;

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTexRef.current = faceTex;

    const faceGeo = new THREE.PlaneGeometry(0.82, 0.52, 24, 16);
    {
      // Bend the plane so the screen hugs the dome — dome front sits at
      // z ≈ 0.595 (HR 0.62 × zScale 0.96), so the screen must stay outside it
      const pos = faceGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        pos.setZ(i, -(x * x) * 0.34 - (y * y) * 0.18);
      }
      faceGeo.computeVertexNormals();
    }
    const face = new THREE.Mesh(
      faceGeo,
      new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, toneMapped: false }),
    );
    face.position.set(0, 0.02, 0.615);
    head.add(face);

    // ══ Ear pods — with spinning inner discs ══
    const makeEar = (side: number) => {
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.15, 0.07, 24),
        mat(BODY_DARK, { roughness: 0.2 }),
      );
      pod.rotation.z = side * -Math.PI / 2;
      pod.position.set(side * 0.62, 0.02, -0.02);
      head.add(pod);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.011, 8, 28),
        mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.7, roughness: 0.12, metalness: 0.8 }),
      );
      rim.rotation.y = Math.PI / 2;
      rim.position.set(side * 0.66, 0.02, -0.02);
      head.add(rim);

      // Inner disc — spins slowly, like a tiny radar
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.075, 6), // hexagonal facet
        mat(BODY_LIGHT, { emissive: GOLD_SOUL, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.7 }),
      );
      disc.rotation.y = side * Math.PI / 2;
      disc.position.set(side * 0.662, 0.02, -0.02);
      head.add(disc);
      return disc;
    };
    earDiscLRef.current = makeEar(-1);
    earDiscRRef.current = makeEar(1);

    // ══ Back vents — three tiny fins ══
    const finGeo = new THREE.BoxGeometry(0.16, 0.016, 0.05);
    const finMat = mat(BODY_LIGHT, { roughness: 0.35, metalness: 0.6 });
    [-0.06, 0.02, 0.10].forEach(y => {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(0, y, -HR * 0.94);
      head.add(fin);
    });

    // ══ Antenna — spring-physics wobble, coil detail, glowing tip ══
    const antGrp = new THREE.Group();
    antGrp.position.set(0, HR * 0.92 - 0.06, -0.04);

    const antBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.085, 0.05, 16),
      mat(BODY_DARK),
    );
    antGrp.add(antBase);

    const antStem = new THREE.Group();
    antStem.position.y = 0.05;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.20, 8),
      mat(BODY_LIGHT, { roughness: 0.3 }),
    );
    stem.position.y = 0.10;
    antStem.add(stem);

    // Spring coil — three tiny tori stacked up the stem
    const coilMat = mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.15 });
    [0.045, 0.085, 0.125].forEach(y => {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 16), coilMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = y;
      antStem.add(coil);
    });

    // Tip — glowing orb
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 16, 16),
      new THREE.MeshStandardMaterial({
        color: GOLD_SOUL, emissive: GOLD_SOUL, emissiveIntensity: 2.0,
        roughness: 0.05, metalness: 0.2,
      }),
    );
    tip.position.y = 0.25;
    antStem.add(tip);
    antTipRef.current = tip;

    const tipLight = new THREE.PointLight(GOLD_SOUL, 0.4, 1.0);
    tipLight.position.y = 0.25;
    antStem.add(tipLight);

    antGrp.add(antStem);
    head.add(antGrp);
    antRef.current = antStem;

    g.add(head);

    // ══ Shadow ══
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 32),
      new THREE.MeshBasicMaterial({ color: SHADOW_TINT, transparent: true, opacity: 0.14 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.22;
    g.add(shadow);
    shadRef.current = shadow;

    // ══ Gold dust motes — ambient magic around the robot ══
    const motePos = new Float32Array(N_MOTES * 3);
    for (let i = 0; i < N_MOTES; i++) {
      motePos[i * 3]     = (Math.random() - 0.5) * 2.0;
      motePos[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 1.0 - 0.3;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
      color: GOLD_SOUL, size: 0.022, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    g.add(motes);
    motesRef.current = motes;

    // ══ Star burst particles — hidden until tapped ══
    const starPos = new Float32Array(N_STARS * 3);
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      map: makeStarTexture(), size: 0.16, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    stars.visible = false;
    g.add(stars);
    starsRef.current = stars;

    g.position.y = 0.10;
    scene.add(g);
    robotRef.current = g;
    headRef.current = head;
  }, []);

  // ── Three.js lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    S.current.dead = false;
    S.current.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const W = width, H = height;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 50);
    cam.position.set(0, 0.10, 3.7);
    camRef.current = cam;

    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setSize(W, H);
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.domElement.style.display = 'block';
    el.appendChild(r.domElement);
    rRef.current = r;

    // Env map — gives metals soft gradient reflections without washing out
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.05;
    pmrem.dispose();

    // Lighting — warm key, violet fill, white rim
    scene.add(new THREE.AmbientLight(0xffffff, 0.50));

    const key = new THREE.DirectionalLight(0xFFF8F0, 1.3);
    key.position.set(5, 6, 4);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xEEE8FF, 0.50);
    fill.position.set(-4, 2, 1);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.40);
    rim.position.set(0, -2, -4);
    scene.add(rim);

    build(scene);

    // Tap → surprise hop with star burst
    const onTap = () => {
      const s = S.current;
      if (s.hopping || s.reduceMotion) {
        s.expr.surprise = 1; // reduced motion still gets the face reaction
        return;
      }
      s.hopping = true;
      s.hopV = 0.052;
      s.expr.surprise = 1;
      s.starLife = 1;
      s.starVel = Array.from({ length: N_STARS }, () => ({
        x: (Math.random() - 0.5) * 0.045,
        y: 0.02 + Math.random() * 0.035,
        z: (Math.random() - 0.5) * 0.03,
      }));
      const stars = starsRef.current;
      if (stars) {
        const p = stars.geometry.attributes.position;
        for (let i = 0; i < N_STARS; i++) {
          p.setXYZ(i, (Math.random() - 0.5) * 0.5, HEAD_Y + (Math.random() - 0.5) * 0.4, 0.3);
        }
        p.needsUpdate = true;
        stars.visible = true;
      }
    };
    r.domElement.addEventListener('pointerdown', onTap);

    return () => {
      S.current.dead = true;
      cancelAnimationFrame(S.current.fid);
      r.domElement.removeEventListener('pointerdown', onTap);
      r.dispose();
      if (el.contains(r.domElement)) el.removeChild(r.domElement);
      scene.traverse(o => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach(x => x.dispose());
          else m.dispose();
        }
      });
    };
  }, [build, width, height]);

  // ── Mouse ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let tick = false;
    const on = (e: MouseEvent) => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => {
        const s = S.current;
        s.mx = e.clientX; s.my = e.clientY;
        s.mode = 'mouse';
        s.lastT = performance.now();
        const el = box.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const d = Math.sqrt(dx * dx + dy * dy);
          const wasExcited = s.excited;
          s.near = d < AWARENESS_R;
          s.excited = d < EXCITE_R;
          // HI — you just came close
          if (s.excited && !wasExcited && now() - s.waveT > WAVE_MS) {
            s.wave = 1; s.waveT = now();
          }
          // BYE — you just stepped away from close range
          if (!s.excited && wasExcited && now() - s.waveT > WAVE_MS) {
            s.wave = 2; s.waveT = now();
          }
        }
        tick = false;
      });
    };
    const now = () => performance.now();
    // BYE — cursor leaves the page entirely
    const onLeave = () => {
      const s = S.current;
      if (s.near && now() - s.waveT > WAVE_MS) {
        s.wave = 2; s.waveT = now();
        s.near = false; s.excited = false;
      }
    };
    window.addEventListener('mousemove', on, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', on);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // ── Caret ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const inp = inputRef.current;
    if (!inp) return;
    const up = () => {
      const s = S.current;
      s.mode = 'caret';
      s.lastT = performance.now();
      const r = inp.getBoundingClientRect();
      s.mx = r.left + getCaretX(inp);
      s.my = r.top + r.height / 2;
    };
    (['input','keyup','click','focus'] as const).forEach(e => inp.addEventListener(e, up));
    return () => {
      (['input','keyup','click','focus'] as const).forEach(e => inp.removeEventListener(e, up));
    };
  }, [inputRef]);

  // ── Animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    const s = S.current;

    const blink = () => {
      s.blinkTimer = window.setTimeout(() => {
        s.blink = true; s.blinkT = performance.now();
        setTimeout(() => { s.blink = false; }, BLINK_DUR);
        // Occasional cute double-blink
        if (Math.random() < 0.25) {
          setTimeout(() => {
            s.blink = true; s.blinkT = performance.now();
            setTimeout(() => { s.blink = false; }, BLINK_DUR);
          }, BLINK_DUR + 140);
        }
        if (!s.dead) blink();
      }, BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN));
    };
    blink();

    const loop = () => {
      if (s.dead) return;
      s.fid = requestAnimationFrame(loop);

      const now = performance.now();
      const t = now * 0.001;
      const head = headRef.current;
      const robot = robotRef.current;
      const ant = antRef.current;
      const tip = antTipRef.current;
      const core = coreRef.current;
      const coreRing = coreRingRef.current;
      const shad = shadRef.current;
      const cam = camRef.current;
      const r = rRef.current;
      const faceCtx = faceCtxRef.current;
      const faceTex = faceTexRef.current;
      if (!head || !robot || !cam || !r) return;

      const motionScale = s.reduceMotion ? 0.3 : 1;

      // Mode
      const dt = now - s.lastT;
      if (dt > IDLE_MS) s.mode = 'idle';
      else if (s.mode === 'caret' && dt > CARET_MS) s.mode = 'mouse';
      const sleepy = s.mode === 'idle' && dt > SLEEPY_MS;

      const prevY = s.cRotY, prevX = s.cRotX;
      let lerp = LERP_IDLE;

      if (s.mode === 'idle') {
        // Gentle idle drift — balanced sine; sleepy head droops a touch
        s.tRotY = Math.sin(t * 0.45) * 0.08;
        s.tRotX = Math.cos(t * 0.55) * 0.04 + (sleepy ? 0.10 : 0);
        lerp = LERP_IDLE;
      } else {
        // Symmetric tracking — same formula for mouse and caret
        const cr = r.domElement.getBoundingClientRect();
        const cx = cr.left + cr.width / 2;
        const cy = cr.top + cr.height / 2;
        s.tRotY = THREE.MathUtils.clamp(Math.atan2(s.mx - cx, TRACK_DIST), -MAX_YAW, MAX_YAW);
        s.tRotX = THREE.MathUtils.clamp(Math.atan2(s.my - cy, TRACK_DIST), -MAX_PITCH, MAX_PITCH);
        lerp = LERP_TRACK;
      }

      s.cRotY += (s.tRotY - s.cRotY) * lerp;
      s.cRotX += (s.tRotX - s.cRotX) * lerp;

      // Subtle roll on turn velocity
      const delta = s.tRotY - s.cRotY;
      const tRoll = THREE.MathUtils.clamp(-delta * 0.3, -MAX_ROLL, MAX_ROLL);
      s.cRotZ += (tRoll - s.cRotZ) * 0.08;

      head.rotation.set(s.cRotX, s.cRotY, s.cRotZ);

      // ── Expression targets ──
      const e = s.expr;
      const typing = s.mode === 'caret';
      const delighted = s.excited && s.mode === 'mouse';
      const waveActive = s.wave !== 0 && (now - s.waveT) < WAVE_MS;
      // HI beams (full arc-eyes); BYE keeps a warm soft smile
      const tHappy   = (delighted || (waveActive && s.wave === 1)) ? 1
        : (waveActive && s.wave === 2) ? 0.5
        : (sleepy ? 0.1 : 0.34);
      const tFocus   = typing ? 1 : 0;
      const tEyeOpen = s.blink
        ? Math.max(0.06, (() => {
            const p = (now - s.blinkT) / BLINK_DUR;
            return p < 0.5 ? 1 - p * 1.9 : (p - 0.5) * 1.9 + 0.05;
          })())
        : sleepy ? 0.42 : 1;
      e.happy    += (tHappy - e.happy) * 0.09;
      e.focus    += (tFocus - e.focus) * 0.10;
      e.eyeOpen  += (tEyeOpen - e.eyeOpen) * (s.blink ? 0.6 : 0.08);
      e.surprise *= 0.955; // decay
      const tPupX = s.mode === 'idle' ? Math.sin(t * 0.32) * 0.35 : s.cRotY / MAX_YAW;
      const tPupY = s.mode === 'idle' ? Math.cos(t * 0.27) * 0.2 : s.cRotX / MAX_PITCH;
      e.pupilX += (tPupX - e.pupilX) * 0.12;
      e.pupilY += (tPupY - e.pupilY) * 0.12;

      // Redraw face
      if (faceCtx && faceTex) {
        drawFace(faceCtx, e);
        faceTex.needsUpdate = true;
      }

      // ── Antenna spring + idle sway; sleepy droop ──
      if (ant) {
        const ay = (s.cRotY - prevY) * 2.5;
        const ax = (s.cRotX - prevX) * 2.5;
        s.aVy += -ay - s.aRy * 0.12 - s.aVy * 0.14;
        s.aVx += -ax - s.aRx * 0.12 - s.aVx * 0.14;
        s.aRy += s.aVy; s.aRx += s.aVx;
        const idleSway = s.mode === 'idle' ? Math.sin(t * 0.7)        * 0.10 * motionScale : 0;
        const idleNod  = s.mode === 'idle' ? Math.sin(t * 0.55 + 1.2) * 0.05 * motionScale : 0;
        const droop = sleepy ? 0.35 : delighted ? -0.15 : 0; // perks up when you come close
        ant.rotation.set(s.aRx + idleNod + droop, 0, s.aRy + idleSway);
      }

      // ── Hop physics — squash & stretch ──
      if (s.hopping) {
        s.hopV -= 0.0038;
        s.hopY += s.hopV;
        if (s.hopY <= 0) { s.hopY = 0; s.hopping = false; s.hopV = 0; }
        const stretch = THREE.MathUtils.clamp(1 + s.hopV * 3.2, 0.86, 1.14);
        robot.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
      } else {
        robot.scale.x += (1 - robot.scale.x) * 0.15;
        robot.scale.y += (1 - robot.scale.y) * 0.15;
        robot.scale.z += (1 - robot.scale.z) * 0.15;
      }

      // Organic breathing bob — primary + second harmonic for natural feel
      const breathRate = sleepy ? 0.55 : 0.9;
      const breathe = (Math.sin(t * breathRate) * 0.055 + Math.sin(t * breathRate * 2) * 0.015) * motionScale;
      robot.position.y = 0.10 + breathe + s.hopY;

      // ── Arms — relaxed sway; choreographed HI / BYE waves ──
      const armL = armLRef.current, armR = armRRef.current;
      if (armL && armR) {
        const waveP = (now - s.waveT) / WAVE_MS; // 0…1 through the gesture
        const waving = s.wave !== 0 && waveP < 1 && !s.reduceMotion;
        const env = waving ? Math.sin(Math.min(1, waveP) * Math.PI) : 0; // ease in-out

        const sway = Math.sin(t * breathRate + 0.5) * 0.05 * motionScale;
        armL.rotation.z = sway;
        armL.rotation.x = Math.sin(t * 0.8) * 0.03 * motionScale;

        // Positive rotation.z lifts the right arm up and OUTWARD (+x);
        // negative would swing it across and behind the body
        if (waving && s.wave === 1) {
          // HI! — arm shoots up, quick eager side-to-side wiggle from the wrist
          const target = 2.25 + Math.sin(t * 9) * 0.35 * env;
          armR.rotation.z += (target * env + -sway * (1 - env) - armR.rotation.z) * 0.22;
        } else if (waving && s.wave === 2) {
          // BYE — arm up, slow wide metronome sweep, a little wistful
          const target = 2.0 + Math.sin(t * 4) * 0.55 * env;
          armR.rotation.z += (target * env + -sway * (1 - env) - armR.rotation.z) * 0.14;
        } else if (delighted && !s.reduceMotion) {
          // Lingering friendly wave while you stay close
          const wave = 2.1 + Math.sin(t * 7) * 0.3;
          armR.rotation.z += (wave - armR.rotation.z) * 0.12;
        } else {
          if (s.wave !== 0 && waveP >= 1) s.wave = 0;
          if (s.mode === 'idle' && !s.reduceMotion) {
            // Ambient idle wave — stays gently friendly even with no one around,
            // not just reactive to mouse proximity
            const idleWave = 0.85 + Math.sin(t * 0.9) * 0.28;
            armR.rotation.z += (idleWave - armR.rotation.z) * 0.05;
          } else {
            armR.rotation.z += (-sway - armR.rotation.z) * 0.08;
          }
        }
        armR.rotation.x = Math.sin(t * 0.8 + 1) * 0.03 * motionScale;
      }

      // ── Micro-mechanical life ──
      const discL = earDiscLRef.current, discR = earDiscRRef.current;
      if (discL) discL.rotation.z = t * 0.6;
      if (discR) discR.rotation.z = -t * 0.6;
      if (coreRing) {
        coreRing.rotation.z = t * (typing ? 2.2 : 0.5);
      }

      // Core pulse — punchy peak with pow² shaping, faster when typing
      if (core) {
        const freq = typing ? 5.0 : sleepy ? 0.9 : 1.8;
        const pulse = Math.pow(Math.max(0, Math.sin(t * freq)), 2) * 0.7;
        (core.material as THREE.MeshStandardMaterial).emissiveIntensity =
          1.2 + pulse + (s.near ? 0.4 : 0);
      }

      // Antenna tip pulse
      if (tip) {
        (tip.material as THREE.MeshStandardMaterial).emissiveIntensity =
          1.6 + Math.sin(t * (typing ? 9 : 4)) * 0.5 + (s.near ? 0.8 : 0);
      }

      // Hover thruster flicker — breathes with the bob
      const hover = hoverRef.current;
      if (hover) {
        const flicker = 0.42 + Math.sin(t * 11) * 0.05 + Math.sin(t * 23) * 0.03;
        (hover.material as THREE.MeshStandardMaterial).opacity = flicker;
        const hs = 1 + breathe * 0.5;
        hover.scale.set(hs, hs, 0.4);
      }

      // Gold dust motes — slow personal orbit
      const motes = motesRef.current;
      if (motes && !s.reduceMotion) {
        const p = motes.geometry.attributes.position;
        for (let i = 0; i < N_MOTES; i++) {
          const ph = i * 1.7;
          p.setY(i, p.getY(i) + Math.sin(t * 0.6 + ph) * 0.0007);
          p.setX(i, p.getX(i) + Math.cos(t * 0.4 + ph) * 0.0005);
        }
        p.needsUpdate = true;
        (motes.material as THREE.PointsMaterial).opacity = 0.32 + Math.sin(t * 0.8) * 0.14;
      }

      // Star burst — rise, drift, fade
      const stars = starsRef.current;
      if (stars && s.starLife > 0) {
        s.starLife -= 0.016;
        const p = stars.geometry.attributes.position;
        for (let i = 0; i < N_STARS; i++) {
          const v = s.starVel[i];
          if (!v) continue;
          v.y -= 0.0008; // soft gravity
          p.setXYZ(i, p.getX(i) + v.x, p.getY(i) + v.y, p.getZ(i) + v.z);
        }
        p.needsUpdate = true;
        (stars.material as THREE.PointsMaterial).opacity = Math.max(0, s.starLife);
        if (s.starLife <= 0) stars.visible = false;
      }

      // Shadow — tightens as the robot hops higher
      if (shad) {
        const lift = s.hopY * 0.8;
        const sc = (1 + Math.sin(t * 1.3) * 0.03) * (1 - lift);
        shad.scale.set(sc, sc, 1);
        (shad.material as THREE.MeshBasicMaterial).opacity =
          (0.12 + Math.sin(t * 1.3) * 0.03) * (1 - lift * 1.5);
      }

      r.render(sceneRef.current!, cam);
    };
    loop();

    return () => { clearTimeout(s.blinkTimer); cancelAnimationFrame(s.fid); };
  }, []);

  return (
    <div ref={box} className="mb-1"
      style={{ width, height, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
    />
  );
}
