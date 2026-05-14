// Thin wrapper around Anime.js v4 that respects prefers-reduced-motion.
import { animate as _animate, createTimeline as _timeline, stagger as _stagger, utils } from 'animejs';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animate(target, params) {
  if (reduced) {
    // Snap to final values immediately.
    const flat = { ...params };
    delete flat.duration;
    delete flat.delay;
    delete flat.ease;
    return _animate(target, { ...flat, duration: 0 });
  }
  return _animate(target, params);
}

export function timeline(opts) {
  return _timeline(opts || {});
}

export const stagger = _stagger;
export { utils };

// FLIP helper: pass nodes + a function that mutates DOM order; returns a Promise.
export function flip(nodes, mutate, params = {}) {
  if (reduced) { mutate(); return Promise.resolve(); }
  const before = new Map(nodes.map(n => [n, n.getBoundingClientRect()]));
  mutate();
  const inverts = nodes.map(n => {
    const a = before.get(n);
    const b = n.getBoundingClientRect();
    return { node: n, dx: a.left - b.left, dy: a.top - b.top };
  }).filter(i => i.dx || i.dy);

  return Promise.all(inverts.map(({ node, dx, dy }) =>
    _animate(node, {
      translateX: [dx, 0],
      translateY: [dy, 0],
      duration: params.duration || 480,
      ease: params.ease || 'outExpo'
    }).finished
  ));
}
