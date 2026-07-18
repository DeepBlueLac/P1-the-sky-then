import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import type { ProjectedStar, SkyMap } from '@/core/types';

type SkyStageProps = {
  sky: SkyMap | null;
  showLines: boolean;
  focusedConstellation: string | null;
  immersive: boolean;
  onSelectStar: (star: ProjectedStar | null) => void;
};

const vertexShader = `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uIntensity;
  varying float vOpacity;

  void main() {
    float pulse = 1.0 + sin(uTime * (0.45 + mod(aSeed, 11.0) * 0.025) + aSeed) * 0.10;
    vOpacity = aOpacity * uIntensity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(2.0, aSize * uPixelRatio * pulse);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vOpacity;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    if (radius > 0.5) discard;
    float core = 1.0 - smoothstep(0.02, 0.15, radius);
    float body = 1.0 - smoothstep(0.04, 0.30, radius);
    float halo = 1.0 - smoothstep(0.08, 0.50, radius);
    float alpha = (core + body * 0.78 + halo * 0.18) * vOpacity;
    gl_FragColor = vec4(vec3(1.0), alpha);
  }
`;

function createStarGeometry(stars: ProjectedStar[]) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(stars.length * 3);
  const sizes = new Float32Array(stars.length);
  const opacities = new Float32Array(stars.length);
  const seeds = new Float32Array(stars.length);

  stars.forEach((star, index) => {
    positions[index * 3] = star.x;
    positions[index * 3 + 1] = -star.y;
    positions[index * 3 + 2] = 0;
    sizes[index] = Math.max(2.2, (6.2 - star.magnitude) * 1.7);
    opacities[index] = Math.min(1, star.opacity * (1.08 - Math.max(0, star.magnitude) * 0.025));
    seeds[index] = star.twinkleSeed;
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return geometry;
}

function createLineGeometry(sky: SkyMap, focusedConstellation: string | null) {
  const positions = new Float32Array(sky.lines.length * 6);
  const colors = new Float32Array(sky.lines.length * 6);
  sky.lines.forEach((line, index) => {
    const offset = index * 6;
    positions.set([line.x1, -line.y1, -0.01, line.x2, -line.y2, -0.01], offset);
    const strength = focusedConstellation && line.constellationId !== focusedConstellation ? 0.07 : 0.42;
    colors.set([strength, strength, strength, strength, strength, strength], offset);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export default function SkyStage({ sky, showLines, focusedConstellation, immersive, onSelectStar }: SkyStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const selectedHandlerRef = useRef(onSelectStar);

  useEffect(() => {
    selectedHandlerRef.current = onSelectStar;
  }, [onSelectStar]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !sky) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      host.dataset.webgl = 'unavailable';
      setWebglUnavailable(true);
      return;
    }

    host.dataset.webgl = 'ready';
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'gpu-sky-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.08, 1.08, 1.08, -1.08, 0.1, 10);
    camera.position.z = 2;

    const starGeometry = createStarGeometry(sky.stars);
    const starMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uIntensity: { value: immersive ? 1 : 0.72 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    let lineGeometry: THREE.BufferGeometry | null = null;
    let lineMaterial: THREE.LineBasicMaterial | null = null;
    let lineSegments: THREE.LineSegments | null = null;
    if (showLines) {
      lineGeometry = createLineGeometry(sky, focusedConstellation);
      lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: reducedMotion ? (immersive ? 0.76 : 0.36) : 0, depthWrite: false });
      lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineSegments);
    }

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.025 };
    const pointer = new THREE.Vector2();
    const startedAt = window.performance.now();
    const lineTargetOpacity = immersive ? 0.76 : 0.36;
    let cameraTargetX = 0;
    let cameraTargetY = 0;
    let frame = 0;

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      const aspect = width / Math.max(height, 1);
      if (aspect > 1) {
        camera.left = -1.08 * aspect;
        camera.right = 1.08 * aspect;
        camera.top = 1.08;
        camera.bottom = -1.08;
      } else {
        camera.left = -1.08;
        camera.right = 1.08;
        camera.top = 1.08 / aspect;
        camera.bottom = -1.08 / aspect;
      }
      camera.updateProjectionMatrix();
    };

    const render = () => {
      starMaterial.uniforms.uTime.value = reducedMotion ? 0 : (window.performance.now() - startedAt) / 1000;
      const elapsed = (window.performance.now() - startedAt) / 1000;
      if (lineMaterial && !reducedMotion) lineMaterial.opacity = Math.min(lineTargetOpacity, elapsed * lineTargetOpacity / 1.35);
      camera.position.x += (cameraTargetX - camera.position.x) * 0.035;
      camera.position.y += (cameraTargetY - camera.position.y) * 0.035;
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(starPoints, false)[0];
      renderer.domElement.style.cursor = hit ? 'pointer' : 'crosshair';
      return hit;
    };

    const handlePointerMove = (event: PointerEvent) => { updatePointer(event); };
    const handlePointerParallax = (event: PointerEvent) => {
      if (reducedMotion) return;
      const rect = renderer.domElement.getBoundingClientRect();
      cameraTargetX = -(((event.clientX - rect.left) / rect.width) - 0.5) * 0.035;
      cameraTargetY = (((event.clientY - rect.top) / rect.height) - 0.5) * 0.025;
    };
    const handlePointerLeave = () => { cameraTargetX = 0; cameraTargetY = 0; };
    const handlePointerDown = (event: PointerEvent) => {
      const hit = updatePointer(event);
      selectedHandlerRef.current(hit ? sky.stars[hit.index ?? -1] ?? null : null);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointermove', handlePointerParallax);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    resize();
    render();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointermove', handlePointerParallax);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      starGeometry.dispose();
      starMaterial.dispose();
      lineGeometry?.dispose();
      lineMaterial?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [focusedConstellation, immersive, showLines, sky]);

  return <div className={immersive ? 'sky-stage is-immersive' : 'sky-stage'} ref={hostRef} data-star-count={sky?.stars.length ?? 0} data-testid="sky-stage">
    {webglUnavailable ? <svg className="gpu-fallback-sky" viewBox="-1.08 -1.08 2.16 2.16" role="img" aria-label="真实可见星空静态降级图">
      {showLines ? <g>{sky?.lines.map((line, index) => <line key={`${line.constellationId}-${index}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}</g> : null}
      <g>{sky?.stars.map((star) => <circle key={star.id} cx={star.x} cy={star.y} r={Math.max(.0018, (6.2 - star.magnitude) * .0014)} opacity={star.opacity} />)}</g>
    </svg> : null}
  </div>;
}
