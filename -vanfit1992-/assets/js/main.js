// Bootstrapper (ES module) that loads classic scripts in order
// It keeps existing files unmodified and shares their global scope.

const baseUrl = new URL('.', import.meta.url);

function loadClassic(relPath) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL(relPath, baseUrl).href;
    s.async = false; // hint ordered execution
    s.onload = () => resolve(relPath);
    s.onerror = (e) => reject(new Error(`Failed to load ${relPath}`));
    document.head.appendChild(s);
  });
}

// Ensure THREE is available. If CDN failed, try alternative CDNs as fallback.
async function ensureThreeWithFallback(){
  if (window.THREE) return true;
  const fallbacks = [
    // jsDelivr
    'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.min.js',
    // cdnjs
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.161.0/three.min.js',
    // Older but widely mirrored
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js',
  ];
  function inject(url){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = url; s.async = true; s.onload = ()=> resolve(url); s.onerror = ()=> reject(new Error('fail '+url));
      document.head.appendChild(s);
    });
  }
  for (const url of fallbacks){
    try { await inject(url); if (window.THREE) return true; } catch(_) {}
  }
  console.warn('THREE still not loaded after fallbacks');
  return !!window.THREE;
}

async function boot() {
  // Make sure THREE is present before loading classic scripts that use it
  try { await ensureThreeWithFallback(); } catch(_) {}
  // Ensure OrbitControls exists (optional but improves UX). Try CDN then local vendor.
  try {
    if (!THREE || (THREE && !THREE.OrbitControls)){
      const urls = [
        'https://unpkg.com/three@0.161.0/examples/js/controls/OrbitControls.js',
        'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/js/controls/OrbitControls.js',
      ];
      for (const u of urls){
        try { await loadClassic(u); if (THREE && THREE.OrbitControls) break; } catch(_) {}
      }
    }
  } catch(_) {}
  // Order matters — mirrors original monolith layout
  const files = [
    // Core config/state first
    'config-i18n.js',
    'state.js',
    'util.js',
    // Provide renderAll and core render helpers before any calls
    'render3d-isometric.js', // defines renderAll, renderItems, etc.
    'vehicle-ui.js',         // renderSpecs
    'svg-export.js',         // buildSVG
    'render2d-floor.js',     // updateRulers, fitCanvasToVehicleWidth, render
    'sidecut-render.js',     // renderSection
    'presets.js',            // renderPresets
    'overlay-labels.js',
    // Build DOM (will call renderAll and renderPresets)
    'dom-build.js',
    // Interactions and features layered on top
    'viewport-zoompan.js',
    'items-api.js',
    'autopack.js',
    'drag-docking.js',       // installViewportKeys
    // Three.js subsystem (expects THREE from HTML CDN)
    'three-core.js',
    'three-postfx.js',
    'three-interactions.js',
    // Geometry helpers
    'geo-epal-pallet.js',
    'geo-cardboard-box.js',
    // Parsers (light first for fallback)
    'parser-megaprompt-light.js',
    'parser-bulk-ultra.js',
    // App init and self-tests
    'init.js',
    'selftest-labels.js',
    'selftest-2d.js',
    'selftest-3d.js',
    'selftest-run.js',
  ];

  for (const f of files) {
    // eslint-disable-next-line no-await-in-loop
    await loadClassic(f);
  }

  // Optional: mark as bootstrapped for guards
  try { window.VANFIT_BOOTSTRAPPED = true; } catch (_) {}
}

// Delay until DOM is ready to ensure #van-pack exists
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
