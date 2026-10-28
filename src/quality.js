// Caps the WebGL pixel ratio and steps it down if the device can't keep up,
// so slower laptops and phones trade a little sharpness for smooth motion.
export function adaptivePixelRatio(renderer, onChange) {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  let ratio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
  let total = 0;
  let samples = 0;
  renderer.setPixelRatio(ratio);

  return function track(dt) {
    total += dt;
    samples++;
    if (samples < 90) return;
    const avg = total / samples;
    total = samples = 0;
    // Below ~45fps on average: drop resolution a notch (never below 1x).
    if (avg > 1 / 45 && ratio > 1) {
      ratio = Math.max(1, ratio - 0.25);
      renderer.setPixelRatio(ratio);
      onChange();
    }
  };
}
