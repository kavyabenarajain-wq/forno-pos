// Dish XR / AR / VR viewer.
// Modes:
//   3D  — standard view; with 4-8 photos, drag spins → 360° rotation
//   AR  — same card overlaid on the live device camera feed
//   VR  — stereoscopic split-screen for Cardboard-style phone headsets
// With a single image (or none), falls back to gradient + emoji + parallax.

const { meta: xrMeta, fmt: xrFmt, imgsFor: xrImgsFor, modelFor: xrModelFor } = window.POS_DATA;

function DishXR({ item, onClose, onAdd }) {
  const m = xrMeta(item.id);
  const photos = xrImgsFor(item.id);
  const modelSrc = xrModelFor(item.id);
  const hasModel = !!modelSrc;
  const hasPhotos = photos.length > 0;
  const multiAngle = !hasModel && photos.length > 1;
  // Pseudo-3D mode: when there's a single photo and no GLB, render the card
  // as a thin physical disc spinning on its Y axis. Photo on the front +
  // back faces, gradient as the rim, depth shadow that follows rotation.
  const pseudo3D = !hasModel && photos.length === 1;

  const [mode, setMode] = React.useState('3d'); // '3d' | 'ar' | 'vr'
  const [arError, setArError] = React.useState(null);
  const [angle, setAngle] = React.useState(0);   // continuous degrees driving the spin
  const [autoSpin, setAutoSpin] = React.useState(true);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const cardRef = React.useRef(null);
  const dragRef = React.useRef(null);

  const stepDeg = multiAngle ? 360 / photos.length : 0;
  const photoIdx = multiAngle ? (Math.floor(((angle % 360) + 360) % 360 / stepDeg)) % photos.length : 0;

  // Auto-rotate when no manual interaction. Runs for both:
  //   - multi-angle: cycles through frames (frame index derived from angle)
  //   - pseudo-3D: rotates the spinning card continuously
  React.useEffect(() => {
    if (!autoSpin) return;
    if (!multiAngle && !pseudo3D) return;
    let raf;
    let last = performance.now();
    const tick = (t) => {
      const dt = (t - last) / 1000; last = t;
      // Slower for pseudo-3D so users can appreciate the rotation
      const speed = pseudo3D ? 22 : 28;
      setAngle(a => a + dt * speed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoSpin, multiAngle, pseudo3D]);

  // Drag-to-spin (multi-angle OR pseudo-3D) — for the no-photo case, fall
  // back to mouse-tilt parallax on the gradient card.
  const draggable = multiAngle || pseudo3D;
  const onPointerDown = (e) => {
    if (mode === 'vr') return;
    if (draggable) {
      setAutoSpin(false);
      dragRef.current = { startX: e.clientX, startAngle: angle };
      e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e) => {
    if (mode === 'vr') return;
    if (draggable && dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      setAngle(dragRef.current.startAngle + dx * 0.6);
      return;
    }
    if (!draggable) {
      const r = cardRef.current?.getBoundingClientRect();
      if (!r) return;
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: cy * -14, y: cx * 18 });
    }
  };
  const onPointerUp = () => {
    if (draggable) {
      dragRef.current = null;
      setTimeout(() => setAutoSpin(true), 2000);
    } else {
      setTilt({ x: 0, y: 0 });
    }
  };

  // AR camera lifecycle — only for the photo-based fallback. When a GLB
  // exists, <model-viewer> handles AR natively (Scene Viewer / Quick Look /
  // WebXR), so we don't open the camera ourselves.
  React.useEffect(() => {
    if (mode !== 'ar' || hasModel) {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      return;
    }
    setArError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setArError(e.name === 'NotAllowedError' ? 'Camera permission was denied.' : (e.message || 'Camera unavailable'));
        setMode('3d');
      }
    })();
    return () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } };
  }, [mode, hasModel]);

  // VR fullscreen helper — phone users tap the badge to go fullscreen for cardboard
  const tryFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {}
  };
  React.useEffect(() => {
    if (mode === 'vr') tryFullscreen();
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [mode]);

  const spiceDots = (lvl) => '●'.repeat(lvl) + '○'.repeat(Math.max(0, 3 - lvl));

  // Build the inside of the card. Pseudo-3D mode wraps the photo in a
  // double-sided spinning disc; multi-angle cross-fades between frames;
  // no-photo falls back to gradient + emoji + parallax tilt.
  const yRot = pseudo3D ? (angle % 360) : 0;
  // Card outer transform: perspective + spin (or just tilt for no-photo)
  const outerTransform = pseudo3D
    ? `perspective(1100px) rotateY(${yRot}deg)`
    : multiAngle
      ? 'perspective(1100px)'
      : `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`;
  // Drop shadow that scales with rotation (narrower edge-on)
  const shadowScale = pseudo3D ? (0.5 + 0.5 * Math.abs(Math.cos(yRot * Math.PI / 180))) : 1;

  // The actual rendered "scene" for the dish — re-used across modes.
  const renderScene = (eye = null) => (
    <div className={'xr-scene' + (hasModel ? ' has-model' : '')}>
      {hasModel ? (
        <div className={'xr-model' + (mode === 'vr' ? ' vr-eye' : '')}>
          <model-viewer
            src={modelSrc}
            alt={item.name}
            camera-controls={mode !== 'vr' ? '' : null}
            touch-action="pan-y"
            auto-rotate={autoSpin ? '' : null}
            auto-rotate-delay="0"
            rotation-per-second="24deg"
            interaction-prompt="none"
            shadow-intensity="1"
            exposure="1.05"
            environment-image="neutral"
            ar={mode === 'ar' && eye === null ? '' : null}
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          >
            {mode === 'ar' && eye === null && (
              <button slot="ar-button" className="xr-ar-launch">Tap to place in your room</button>
            )}
          </model-viewer>
          {mode !== 'vr' && (
            <div className="xr-model-base">
              <div className="xr-card-name">{item.name}</div>
              {item.desc && <div className="xr-card-desc">{item.desc}</div>}
              <div className="xr-card-price">{xrFmt(item.price)}</div>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Cast shadow that follows rotation */}
      {pseudo3D && (
        <div className="xr-shadow" style={{ transform: `scaleX(${shadowScale.toFixed(3)})`, opacity: (0.35 * shadowScale + 0.15).toFixed(3) }} />
      )}
      <div
        ref={eye === null ? cardRef : null}
        className={'xr-card' + (autoSpin && multiAngle && mode !== 'vr' ? ' floating' : '') + (draggable ? ' draggable' : '') + (pseudo3D ? ' xr-3d' : '')}
        style={{ transform: outerTransform }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {pseudo3D ? (
          // True 3D spinning card: photo on front + back, gradient rim
          <>
            {/* Front face */}
            <div className="xr-face xr-face-front">
              <div className="xr-card-bg" style={{ background: m.gradient }}>
                <div className="xr-card-photo" style={{ backgroundImage: `url("${photos[0]}")`, opacity: 1 }} />
                <div className="xr-card-shine" style={{ opacity: 0.5 + 0.5 * Math.cos(yRot * Math.PI / 180) }} />
                <div className="xr-steam"><i /><i /><i /></div>
              </div>
              <div className="xr-card-base">
                <div className="xr-card-name">{item.name}</div>
                {item.desc && <div className="xr-card-desc">{item.desc}</div>}
                <div className="xr-card-price">{xrFmt(item.price)}</div>
              </div>
            </div>
            {/* Back face — photo mirrored so it reads correctly when seen from behind */}
            <div className="xr-face xr-face-back">
              <div className="xr-card-bg" style={{ background: m.gradient, transform: 'scaleX(-1)' }}>
                <div className="xr-card-photo" style={{ backgroundImage: `url("${photos[0]}")`, opacity: 1, filter: 'brightness(0.9) saturate(0.9)' }} />
                <div className="xr-card-shine" />
              </div>
              <div className="xr-card-base">
                <div className="xr-card-name">{item.name}</div>
              </div>
            </div>
            {/* Edges (rim) — thin slivers at left/right */}
            <div className="xr-edge xr-edge-left" style={{ background: m.gradient }} />
            <div className="xr-edge xr-edge-right" style={{ background: m.gradient }} />
          </>
        ) : (
          <div className="xr-card-bg" style={{ background: m.gradient }}>
            {hasPhotos ? (
              photos.map((src, i) => (
                <div
                  key={i}
                  className="xr-card-photo"
                  style={{ backgroundImage: `url("${src}")`, opacity: i === photoIdx ? 1 : 0 }}
                />
              ))
            ) : (
              <>
                <div className="xr-card-disc" />
                <div className="xr-card-emoji">{item.swatch}</div>
              </>
            )}
            <div className="xr-card-shine" />
            <div className="xr-card-glow" />
            {hasPhotos && <div className="xr-steam"><i /><i /><i /></div>}
            <div className="xr-card-base xr-card-base-flat">
              <div className="xr-card-name">{item.name}</div>
              {item.desc && <div className="xr-card-desc">{item.desc}</div>}
              <div className="xr-card-price">{xrFmt(item.price)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Floating ingredient chips (skip in VR for clarity) */}
      {mode !== 'vr' && (
        <div className="xr-ingredients">
          {(m.ingredients || []).slice(0, 8).map((ing, i) => (
            <div key={ing} className="xr-ing" style={{ animationDelay: (i * 0.15) + 's' }}>
              <span className="dot" />{ing}
            </div>
          ))}
        </div>
      )}

      {/* Angle dots (only when multiAngle and not VR) */}
      {multiAngle && mode !== 'vr' && (
        <div className="xr-dots">
          {photos.map((_, i) => (
            <button
              key={i}
              className={'xr-dot' + (i === photoIdx ? ' on' : '')}
              onClick={(e) => { e.stopPropagation(); setAngle(i * stepDeg); setAutoSpin(false); setTimeout(() => setAutoSpin(true), 2000); }}
              title={`Angle ${i + 1}`}
            />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );

  const isVR = mode === 'vr';
  const isAR = mode === 'ar';

  return (
    <div className={'xr-veil' + (isAR ? ' ar' : '') + (isVR ? ' vr' : '') + (hasModel ? ' has-model' : '')} onClick={onClose}>
      {isAR && !hasModel && <video ref={videoRef} className="xr-video" playsInline muted />}

      <div className="xr-stage" onClick={e => e.stopPropagation()}>
        <button className="xr-close" onClick={onClose} title="Close">✕</button>

        {/* Mode switcher */}
        <div className="xr-mode-switch">
          <button className={mode === '3d' ? 'on' : ''} onClick={() => setMode('3d')}>3D</button>
          <button className={mode === 'ar' ? 'on' : ''} onClick={() => setMode('ar')}>✨ AR</button>
          <button className={mode === 'vr' ? 'on' : ''} onClick={() => setMode('vr')}>🥽 VR</button>
        </div>

        {arError && <div className="xr-error">{arError}</div>}

        {isVR ? (
          <div className="xr-vr-stage">
            <div className="xr-vr-eye">{renderScene('L')}</div>
            <div className="xr-vr-eye">{renderScene('R')}</div>
            <div className="xr-vr-divider" />
            <div className="xr-vr-hint">Drop your phone in a Cardboard / VR headset · tap to exit</div>
          </div>
        ) : (
          renderScene()
        )}

        {/* Stats row (hide in VR for cleanliness) */}
        {!isVR && (
          <div className="xr-stats">
            <div className="xr-stat">
              <div className="xr-stat-lbl">Prep</div>
              <div className="xr-stat-val">~{m.prep}m</div>
            </div>
            <div className="xr-stat">
              <div className="xr-stat-lbl">Calories</div>
              <div className="xr-stat-val">{m.cal} kcal</div>
            </div>
            <div className="xr-stat">
              <div className="xr-stat-lbl">Spice</div>
              <div className="xr-stat-val xr-spice">{spiceDots(m.spice)}</div>
            </div>
            <div className="xr-stat">
              <div className="xr-stat-lbl">Diet</div>
              <div className="xr-stat-val">{m.vegetarian ? '🟢 Veg' : '🔴 Non-veg'}</div>
            </div>
          </div>
        )}

        {/* Action footer */}
        {!isVR && (
          <div className="xr-foot">
            {hasModel ? (
              <span className="xr-spin-hint">
                {mode === 'ar' ? '✨ Tap “Tap to place in your room” to launch AR' : '↻ Drag to rotate · pinch to zoom · real 3D model'}
              </span>
            ) : multiAngle && (
              <span className="xr-spin-hint">↻ Drag to spin · {photos.length} angles</span>
            )}
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={onClose}>Back</button>
            {onAdd && (
              <button className="btn primary lg" onClick={() => { onAdd(item); onClose(); }}>
                ＋ Add to Order · <span className="mono" style={{ marginLeft: 6 }}>{xrFmt(item.price)}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

window.DishXR = DishXR;
