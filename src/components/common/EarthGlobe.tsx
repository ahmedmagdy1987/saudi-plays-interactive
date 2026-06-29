import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Lightweight WebGL Earth for the §02 intro. A textured sphere (NASA Blue Marble,
 * public domain) + a fresnel atmosphere rim + a starfield, oriented so the Arabian
 * Peninsula faces the camera. `setProgress(0..1)` drives a reversible camera
 * approach (orbit → close) + idle-rotation lock; the owner (VisualExplorer) feeds
 * it scroll progress. Renders only while visible; caps DPR; reduces geometry on
 * mobile; disposes everything on unmount. If WebGL is unavailable it calls `onFail`
 * and renders nothing so the caller can show a static fallback (never a blank box).
 */
export interface EarthGlobeHandle { setProgress: (p: number) => void }

const EarthGlobe = forwardRef<EarthGlobeHandle, { onFail?: () => void }>(
  function EarthGlobe({ onFail }, ref) {
    const mountRef = useRef<HTMLDivElement>(null);
    const setRef = useRef<((p: number) => void) | null>(null);
    useImperativeHandle(ref, () => ({ setProgress: (p: number) => setRef.current?.(p) }), []);

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;
      let disposed = false;
      let cleanup = () => {};

      (async () => {
        // WebGL capability probe (before importing three to keep the failure path cheap)
        try {
          const c = document.createElement("canvas");
          if (!(c.getContext("webgl") || c.getContext("experimental-webgl"))) { onFail?.(); return; }
        } catch { onFail?.(); return; }

        let THREE: typeof import("three");
        try { THREE = await import("three"); } catch { onFail?.(); return; }
        if (disposed) return;

        const isMobile = window.innerWidth <= 820;
        const W = mount.clientWidth || window.innerWidth;
        const H = mount.clientHeight || window.innerHeight;

        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: "high-performance" });
        } catch { onFail?.(); return; }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
        renderer.setSize(W, H);
        renderer.setClearColor(0x02060f, 1); // opaque deep-space backdrop (covers the section media behind)
        renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
        camera.position.set(0, 0, 3.4);

        scene.add(new THREE.AmbientLight(0xffffff, 0.95));        // keep the whole visible disc readable
        const sun = new THREE.DirectionalLight(0xffffff, 1.35);   // gentle terminator from front-right (camera-lit face)
        sun.position.set(0.6, 0.35, 1.8);
        scene.add(sun);

        const seg = isMobile ? 48 : 96;
        const geo = new THREE.SphereGeometry(1, seg, seg);
        const mat = new THREE.MeshPhongMaterial({ color: 0x0a1830, shininess: 7, specular: 0x1a2a44 });
        const earth = new THREE.Mesh(geo, mat);
        // Orient so Saudi Arabia (~24°N, 45°E) faces the camera (+Z). For three.js
        // SphereGeometry the +Z face shows longitude (-90 − rotation.y°), so bringing
        // +45°E to the front needs rotation.y = -135°; a small +X tilt lifts the
        // northern hemisphere (Saudi is ~24°N) toward the centre of the frame.
        const BASE_Y = THREE.MathUtils.degToRad(-135);
        earth.rotation.set(THREE.MathUtils.degToRad(20), BASE_Y, 0);
        scene.add(earth);

        // Earth surface map: NASA "Blue Marble" (public domain), served at runtime by the
        // jsDelivr CDN from the MIT-licensed `three-globe` example assets. Loaded lazily +
        // cross-origin (CORS: *) for WebGL. If it fails, the dark stylised sphere remains
        // (graceful fallback, no blank frame). See public/textures/CREDITS.md.
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        const tex = loader.load(
          "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
          (t) => { (t as import("three").Texture).colorSpace = THREE.SRGBColorSpace; mat.color.set(0xffffff); mat.map = t; mat.needsUpdate = true; },
          undefined,
          () => { /* texture failed → keep the dark stylized sphere, no crash */ },
        );
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

        // atmosphere rim
        const atmoGeo = new THREE.SphereGeometry(1.07, seg, seg);
        const atmoMat = new THREE.ShaderMaterial({
          side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          uniforms: { glow: { value: new THREE.Color(0x4aa3ff) } },
          vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
          fragmentShader: "varying vec3 vN; uniform vec3 glow; void main(){ float i = pow(0.74 - dot(vN, vec3(0.0,0.0,1.0)), 2.6); gl_FragColor = vec4(glow, clamp(i,0.0,1.0)); }",
        });
        scene.add(new THREE.Mesh(atmoGeo, atmoMat));

        const starN = isMobile ? 700 : 1400;
        const starGeo = new THREE.BufferGeometry();
        const sp = new Float32Array(starN * 3);
        for (let i = 0; i < starN; i++) {
          const r = 20 + Math.random() * 34, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
          sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); sp[i * 3 + 2] = r * Math.cos(ph);
        }
        starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xcdddff, size: 0.1, sizeAttenuation: true, transparent: true, opacity: 0.85 });
        const stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);

        let progress = 0, raf = 0, spin = 0, visible = true;
        const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
        const ease = (t: number) => t * t * (3 - 2 * t);
        const draw = () => {
          const p = cl(progress), e = ease(p);
          spin += 0.0009 * (1 - ease(Math.min(1, p * 1.6)));   // idle drift near orbit, locks as we approach
          earth.rotation.y = BASE_Y + spin;
          camera.position.z = 3.4 - e * 1.88;                   // approach
          starMat.opacity = 0.85 * (1 - ease(Math.min(1, p * 1.25)));
          renderer.render(scene, camera);
        };
        const loop = () => { if (disposed) return; if (visible && !document.hidden) draw(); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
        setRef.current = (v: number) => { progress = v; };

        const onResize = () => {
          const w = mount.clientWidth || window.innerWidth, h = mount.clientHeight || window.innerHeight;
          camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize);
        const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true; }, { threshold: 0 });
        io.observe(mount);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
          io.disconnect();
          geo.dispose(); mat.dispose(); tex.dispose(); atmoGeo.dispose(); atmoMat.dispose(); starGeo.dispose(); starMat.dispose();
          renderer.dispose();
          try { mount.removeChild(renderer.domElement); } catch { /* already gone */ }
        };
      })();

      return () => { disposed = true; cleanup(); };
    }, [onFail]);

    return <div ref={mountRef} className="vx__globe-canvas" aria-hidden="true" />;
  },
);
export default EarthGlobe;
