import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface WasiRobotProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
}

// ── Palette — warm violet body, gold soul, cream background ──────────────
const BODY_MAIN    = 0x7B6BA0; // Soft warm violet — visible on #FAFAF8
const BODY_DARK    = 0x5A4B80; // Deeper violet for depth
const BODY_LIGHT   = 0x9B8BBF; // Lighter violet for highlights
const VISOR_GLASS  = 0x1A1028; // Dark visor
const GOLD_SOUL    = 0xE8C96B; // The soul — eyes, core, antenna glow
const GOLD_WARM    = 0xF5E0A0; // Softer gold for inner highlights
const GOLD_ACCENT  = 0xD4A84B; // Subtle gold trim
const SHADOW_TINT  = 0x5A4B80;

// ── Geometry ─────────────────────────────────────────────────────────────
const HR = 0.54;   // head radius
const EYE_R = 0.09; // eye radius — large for expressiveness
const BODY_R_TOP = 0.36;
const BODY_R_BOT = 0.30;
const BODY_H = 0.55;

// ── Tracking ─────────────────────────────────────────────────────────────
const LERP_IDLE     = 0.04;
const LERP_TRACK    = 0.14;
const MAX_YAW       = Math.PI / 5;    // 36° — balanced left/right
const MAX_PITCH     = Math.PI / 6.5;  // ~28°
const MAX_ROLL      = 0.06;
const AWARENESS_R   = 550;
const IDLE_MS       = 3500;
const CARET_MS      = 1500;
const TRACK_DIST    = 220;             // atan2 denominator — higher = less sensitive

// ── Blink ────────────────────────────────────────────────────────────────
const BLINK_MIN = 2200;
const BLINK_MAX = 5000;
const BLINK_DUR = 110;

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

// ═════════════════════════════════════════════════════════════════════════
export default function WasiRobot({ inputRef }: WasiRobotProps) {
  const box = useRef<HTMLDivElement>(null);

  // Three.js refs
  const sceneRef  = useRef<THREE.Scene>(null);
  const camRef    = useRef<THREE.PerspectiveCamera>(null);
  const rRef      = useRef<THREE.WebGLRenderer>(null);
  const robotRef  = useRef<THREE.Group>(null);
  const headRef   = useRef<THREE.Group>(null);
  const eyeLRef   = useRef<THREE.Group>(null);
  const eyeRRef   = useRef<THREE.Group>(null);
  const antRef    = useRef<THREE.Group>(null);
  const antTipRef = useRef<THREE.Mesh>(null);
  const coreRef   = useRef<THREE.Mesh>(null);
  const shadRef   = useRef<THREE.Mesh>(null);

  // Physics state
  const S = useRef({
    tRotX: 0, tRotY: 0, cRotX: 0, cRotY: 0, cRotZ: 0,
    mode: 'idle' as 'idle'|'mouse'|'caret',
    lastT: 0, mx: 0, my: 0, near: false,
    aRx: 0, aRy: 0, aVx: 0, aVy: 0, // antenna spring
    blink: false, blinkT: 0, blinkTimer: 0,
    fid: 0, dead: false,
  });

  // ── Build ─────────────────────────────────────────────────────────────
  const build = useCallback((scene: THREE.Scene) => {
    const g = new THREE.Group();

    // ── Body ──
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY_R_TOP, BODY_R_BOT, BODY_H, 32),
      mat(BODY_MAIN, { roughness: 0.2, metalness: 0.8 }),
    );
    torso.scale.set(1.12, 1, 0.95);
    torso.position.y = -0.58;
    g.add(torso);

    // Collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.38, 0.10, 24),
      mat(BODY_DARK, { roughness: 0.3 }),
    );
    collar.position.y = -0.28;
    g.add(collar);

    // Gold accent ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(BODY_R_TOP * 1.13, 0.012, 8, 32),
      mat(GOLD_ACCENT, { roughness: 0.15, metalness: 0.9, emissive: GOLD_ACCENT, emissiveIntensity: 0.25 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.34;
    g.add(ring);

    // Chest reactor core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({
        color: GOLD_SOUL, emissive: GOLD_SOUL, emissiveIntensity: 1.8,
        roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.9,
      }),
    );
    core.position.set(0, -0.52, 0.34);
    g.add(core);
    coreRef.current = core;

    // Core ring
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.10, 0.015, 8, 24),
      mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.4, roughness: 0.1 }),
    );
    coreRing.position.copy(core.position);
    g.add(coreRing);

    // ── Shoulder pads ──
    const padGeo = new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const lPad = new THREE.Mesh(padGeo, mat(BODY_DARK, { roughness: 0.3 }));
    lPad.position.set(-0.45, -0.30, 0);
    lPad.rotation.z = Math.PI / 5;
    g.add(lPad);

    const rPad = lPad.clone();
    rPad.position.x = 0.45;
    rPad.rotation.z = -Math.PI / 5;
    g.add(rPad);

    // ── Neck ──
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.12, 16),
      mat(BODY_DARK, { roughness: 0.35 }),
    );
    neck.position.y = -0.24;
    g.add(neck);

    // ── Head ──
    const head = new THREE.Group();
    head.position.y = 0.14;

    // Main dome
    const domeGeo = new THREE.SphereGeometry(HR, 32, 32);
    domeGeo.scale(1.08, 0.90, 0.96);
    const dome = new THREE.Mesh(domeGeo, mat(BODY_MAIN, { roughness: 0.18, metalness: 0.82 }));
    head.add(dome);

    // Rear plate
    const rearGeo = new THREE.SphereGeometry(HR + 0.012, 32, 16, 0, Math.PI, 0.4, Math.PI - 0.8);
    rearGeo.scale(1.09, 0.91, 0.97);
    const rear = new THREE.Mesh(rearGeo, mat(BODY_DARK, { roughness: 0.3 }));
    rear.rotation.y = Math.PI;
    head.add(rear);

    // Forehead stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.32, 0.08),
      mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.3, roughness: 0.12, metalness: 0.9 }),
    );
    stripe.position.set(0, 0.30, 0.42);
    stripe.rotation.x = -0.28;
    head.add(stripe);

    // ── Visor ──
    const visorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.70, 0.24, 0.10),
      mat(BODY_DARK, { roughness: 0.15, metalness: 0.9 }),
    );
    visorFrame.position.set(0, 0.03, 0.42);
    head.add(visorFrame);

    const visorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.20, 0.06),
      new THREE.MeshPhysicalMaterial({
        color: VISOR_GLASS, roughness: 0.04, metalness: 0.95,
        transparent: true, opacity: 0.85, transmission: 0.25, thickness: 0.3,
      }),
    );
    visorGlass.position.set(0, 0.03, 0.44);
    head.add(visorGlass);

    // Visor inner glow mesh — subtle violet warmth
    const visorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.58, 0.14),
      new THREE.MeshBasicMaterial({ color: GOLD_ACCENT, transparent: true, opacity: 0.06, side: THREE.DoubleSide }),
    );
    visorGlow.position.set(0, 0.03, 0.40);
    head.add(visorGlow);

    // ── Eyes — large, expressive, gold-glowing ──
    const eyeMat = new THREE.MeshStandardMaterial({
      color: GOLD_WARM, emissive: GOLD_SOUL, emissiveIntensity: 2.2,
      roughness: 0.04, metalness: 0.1,
    });
    const eyeRimMat = mat(BODY_DARK, { emissive: GOLD_ACCENT, emissiveIntensity: 0.3, roughness: 0.08, metalness: 0.95 });

    const makeEye = (x: number) => {
      const grp = new THREE.Group();
      grp.position.set(x, 0.04, 0.46);

      // Rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(EYE_R + 0.018, 0.012, 8, 24), eyeRimMat);
      rim.position.z = 0.01;
      grp.add(rim);

      // Lens
      const lens = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 20, 20), eyeMat);
      grp.add(lens);

      // Inner highlight dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(EYE_R * 0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
      );
      dot.position.set(-EYE_R * 0.3, EYE_R * 0.3, EYE_R * 0.6);
      grp.add(dot);

      // Point light for local glow
      const glow = new THREE.PointLight(GOLD_SOUL, 0.5, 1.5);
      glow.position.z = 0.12;
      grp.add(glow);

      return grp;
    };

    const eL = makeEye(-0.17);
    const eR = makeEye(0.17);
    head.add(eL);
    head.add(eR);
    eyeLRef.current = eL;
    eyeRRef.current = eR;

    // ── Ear cups ──
    const earGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.07, 24);
    const lEar = new THREE.Mesh(earGeo, mat(BODY_DARK, { roughness: 0.2 }));
    lEar.rotation.z = Math.PI / 2;
    lEar.position.set(-0.55, 0.03, -0.04);
    head.add(lEar);

    const rEar = lEar.clone();
    rEar.position.x = 0.55;
    rEar.rotation.z = -Math.PI / 2;
    head.add(rEar);

    // Ear inner glow rings
    const earRingGeo = new THREE.TorusGeometry(0.08, 0.012, 8, 24);
    const earRingMat = new THREE.MeshStandardMaterial({
      color: GOLD_SOUL, emissive: GOLD_ACCENT, emissiveIntensity: 0.8,
      roughness: 0.12, metalness: 0.7,
    });
    const lRing = new THREE.Mesh(earRingGeo, earRingMat);
    lRing.rotation.y = Math.PI / 2;
    lRing.position.set(-0.59, 0.03, -0.04);
    head.add(lRing);

    const rRing = lRing.clone();
    rRing.position.x = 0.59;
    rRing.rotation.y = -Math.PI / 2;
    head.add(rRing);

    // ── Antenna — spring-physics wobble ──
    const antGrp = new THREE.Group();
    antGrp.position.set(0, HR - 0.06, -0.04);

    const antBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 0.05, 16),
      mat(BODY_DARK),
    );
    antGrp.add(antBase);

    const antStem = new THREE.Group();
    antStem.position.y = 0.05;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.20, 8),
      mat(BODY_LIGHT, { roughness: 0.3 }),
    );
    stem.position.y = 0.10;
    antStem.add(stem);

    // Prongs
    const prongGeo = new THREE.BoxGeometry(0.012, 0.07, 0.03);
    const prongMat = mat(GOLD_ACCENT, { emissive: GOLD_ACCENT, emissiveIntensity: 0.4, roughness: 0.1 });
    const lProng = new THREE.Mesh(prongGeo, prongMat);
    lProng.position.set(-0.035, 0.20, 0);
    antStem.add(lProng);
    const rProng = lProng.clone();
    rProng.position.x = 0.035;
    antStem.add(rProng);

    // Tip — glowing orb
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 16, 16),
      new THREE.MeshStandardMaterial({
        color: GOLD_SOUL, emissive: GOLD_SOUL, emissiveIntensity: 2.0,
        roughness: 0.05, metalness: 0.2,
      }),
    );
    tip.position.y = 0.24;
    antStem.add(tip);
    antTipRef.current = tip;

    const tipLight = new THREE.PointLight(GOLD_SOUL, 0.4, 1.0);
    tipLight.position.y = 0.24;
    antStem.add(tipLight);

    antGrp.add(antStem);
    head.add(antGrp);
    antRef.current = antStem;

    g.add(head);

    // ── Shadow ──
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 32),
      new THREE.MeshBasicMaterial({ color: SHADOW_TINT, transparent: true, opacity: 0.14 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.92;
    g.add(shadow);
    shadRef.current = shadow;

    scene.add(g);
    robotRef.current = g;
    headRef.current = head;
  }, []);

  // ── Three.js lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    S.current.dead = false;

    const W = 240, H = 280;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFAFAF8);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 50);
    cam.position.set(0, 0.12, 3.7);
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
    scene.environmentIntensity = 0.10; // low enough to not wash out, enough to give sheen
    pmrem.dispose();

    // Lighting — warm key, violet fill, white rim
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

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

    return () => {
      S.current.dead = true;
      cancelAnimationFrame(S.current.fid);
      r.dispose();
      if (el.contains(r.domElement)) el.removeChild(r.domElement);
      scene.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach(x => x.dispose());
          else m.dispose();
        }
      });
    };
  }, [build]);

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
          s.near = Math.sqrt(dx * dx + dy * dy) < AWARENESS_R;
        }
        tick = false;
      });
    };
    window.addEventListener('mousemove', on, { passive: true });
    return () => window.removeEventListener('mousemove', on);
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
      const eL = eyeLRef.current;
      const eR = eyeRRef.current;
      const ant = antRef.current;
      const tip = antTipRef.current;
      const core = coreRef.current;
      const shad = shadRef.current;
      const cam = camRef.current;
      const r = rRef.current;
      if (!head || !robot || !cam || !r) return;

      // Mode
      const dt = now - s.lastT;
      if (dt > IDLE_MS) s.mode = 'idle';
      else if (s.mode === 'caret' && dt > CARET_MS) s.mode = 'mouse';

      const prevY = s.cRotY, prevX = s.cRotX;
      let lerp = LERP_IDLE;

      if (s.mode === 'idle') {
        // Gentle idle drift — balanced sine
        s.tRotY = Math.sin(t * 0.45) * 0.08;
        s.tRotX = Math.cos(t * 0.55) * 0.04;
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

      // Antenna spring + idle sway
      if (ant) {
        const ay = (s.cRotY - prevY) * 2.5;
        const ax = (s.cRotX - prevX) * 2.5;
        s.aVy += -ay - s.aRy * 0.12 - s.aVy * 0.14;
        s.aVx += -ax - s.aRx * 0.12 - s.aVx * 0.14;
        s.aRy += s.aVy; s.aRx += s.aVx;
        const idleSway = s.mode === 'idle' ? Math.sin(t * 0.7)        * 0.10 : 0;
        const idleNod  = s.mode === 'idle' ? Math.sin(t * 0.55 + 1.2) * 0.05 : 0;
        ant.rotation.set(s.aRx + idleNod, 0, s.aRy + idleSway);
      }

      // Organic breathing bob — primary + second harmonic for natural feel
      const breathe = Math.sin(t * 0.9) * 0.055 + Math.sin(t * 1.8) * 0.015;
      robot.position.y = s.mode === 'idle' ? breathe : robot.position.y * 0.92;

      // Eye parallax + blink
      if (eL && eR) {
        const px = s.cRotY * 0.045;
        const py = -s.cRotX * 0.03;
        eL.position.set(-0.17 + px, 0.04 + py, 0.46);
        eR.position.set( 0.17 + px, 0.04 + py, 0.46);

        if (s.blink) {
          const p = (now - s.blinkT) / BLINK_DUR;
          const sq = Math.max(0.05, p < 0.5 ? 1 - p * 1.9 : (p - 0.5) * 1.9 + 0.05);
          eL.scale.y = sq; eR.scale.y = sq;
        } else {
          // Slow curiosity squint in idle — barely perceptible widening/narrowing
          const squint = s.mode === 'idle' ? 1.0 + Math.sin(t * 0.28) * 0.07 : 1.0;
          const eRate = eL.scale.y < 0.5 ? 0.22 : 0.05; // fast post-blink recovery, slow idle
          eL.scale.y += (squint - eL.scale.y) * eRate;
          eR.scale.y += (squint - eR.scale.y) * eRate;
        }
      }

      // Core pulse — punchy peak with pow² shaping, faster when typing
      if (core) {
        const freq = s.mode === 'caret' ? 5.0 : 1.8;
        const pulse = Math.pow(Math.max(0, Math.sin(t * freq)), 2) * 0.7;
        (core.material as THREE.MeshStandardMaterial).emissiveIntensity =
          1.2 + pulse + (s.near ? 0.4 : 0);
      }

      // Antenna tip pulse
      if (tip) {
        (tip.material as THREE.MeshStandardMaterial).emissiveIntensity =
          1.6 + Math.sin(t * 4) * 0.5 + (s.near ? 0.8 : 0);
      }

      // Shadow
      if (shad) {
        const sc = 1 + Math.sin(t * 1.3) * 0.03;
        shad.scale.set(sc, sc, 1);
        (shad.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 1.3) * 0.03;
      }

      r.render(sceneRef.current!, cam);
    };
    loop();

    return () => { clearTimeout(s.blinkTimer); cancelAnimationFrame(s.fid); };
  }, []);

  return (
    <div ref={box} className="mb-1"
      style={{ width: 200, height: 220, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
    />
  );
}
