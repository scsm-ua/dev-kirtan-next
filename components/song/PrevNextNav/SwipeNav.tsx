'use client';
import './SwipeNav.scss';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { onLocationChange } from '@/other/router/location';
import { navigate } from '@/other/router/navigate';

import type { TNavItems } from '@/types/song';

// — swipe detection thresholds —
const MIN_SHOW = 30;            // px of horizontal travel before indicator appears
const MIN_HORIZONTAL = 150;     // px to fully fill the ring (triggers navigation)
const DIRECTION_LOCK = 5;       // px before direction is locked (horizontal vs vertical)

// — visual indicator layout —
const CIRCLE_SIZE = 42;         // px container diameter — single source of truth (passed as --swipe-diameter)
const ACTIVE_CIRCLE_SIZE = 55;
const STROKE_WIDTH = 8;         // ring stroke px — single source of truth (passed as --swipe-stroke)
const PULL_DISTANCE = 48;       // px the circle moves inward from the edge at progress=1

// — SVG ring (all derived from SVG_SIZE / STROKE_WIDTH) —
const SVG_SIZE = 64;            // viewBox units
const SVG_CENTER = SVG_SIZE / 2;
const RING_RADIUS = SVG_CENTER - STROKE_WIDTH / 2; // keep stroke inside viewBox boundary
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Swipe only: how long the circle takes to fly off the screen after a swipe
// completes. Navigation starts at the same moment, so this delays nothing.
const EXIT_DURATION_MS = 400;

// — hotkey animation (← / → keys) —
// The page switches first; the circle plays afterwards, over the new song,
// as a hint of the direction taken. It sits beside the white content panel
// (.SongText, also used by markdown pages): left of it for the previous song,
// right of it for the next one. "Resting spot" = KEY_PANEL_GAP px outside the
// panel's side. When there is no room there (narrow screens) or no panel, it
// falls back to PULL_DISTANCE px in from the screen edge, like a swipe.
// Phases: enter → hold → exit. Total visible time = ENTER + HOLD + EXIT.

// Enter: the circle fades from invisible to fully visible while moving
// KEY_SHIFT px from the edge side into its resting spot.
const KEY_ENTER_MS = 150;

// Hold: the circle stays still and fully visible at the resting spot.
const KEY_HOLD_MS = 200;

// Exit: the circle fades out while moving another KEY_SHIFT px away from the
// edge, towards the screen center.
const KEY_EXIT_MS = 150;

// Gap in px between the panel's side and the circle's visible (scaled) edge.
const KEY_PANEL_GAP = 16;

// Distance in px the circle moves during enter, and again during exit.
// 0 = the circle doesn't move, it only fades in and out.
const KEY_SHIFT = 50;

// How long to wait for the new page after a key press. If it hasn't appeared
// by then (a slow load, a full page reload, an error), the animation is skipped,
// so the circle can't show up late over an unrelated page.
const KEY_SWITCH_TIMEOUT_MS = 3000;

// Size multiplier for a "ready" circle (ACTIVE_CIRCLE_SIZE px instead of
// CIRCLE_SIZE px). The keyboard circle always uses it.
const SCALE = ACTIVE_CIRCLE_SIZE / CIRCLE_SIZE;

// CSS custom properties shared by every circle instance — never changes
const SHARED_STYLE = {
  ['--swipe-diameter' as string]: `${CIRCLE_SIZE}px`,
  ['--swipe-stroke' as string]: STROKE_WIDTH,
  ['--swipe-scale-on-ready' as string]: SCALE,
};

type Props = { prevNext: TNavItems };
type Direction = 'left' | 'right' | null;
type SwipeState = { direction: Direction; progress: number };

const INITIAL: SwipeState = { direction: null, progress: 0 };

const vibrate = (ms: number) => navigator.vibrate?.(ms);

// Returns the CSS class for the arrow icon, flipped when on the left edge.
const arrowCls = (flip: boolean) =>
  `SwipeNav__arrow icon-chevron-right${flip ? ' SwipeNav__arrow--flip' : ''}`;

// Picks the nav target corresponding to the swipe/key direction.
// Swiping left reveals the *next* song; swiping right reveals the *previous* one.
const pickTarget = (prevNext: TNavItems, direction: Direction) =>
  direction === 'left' ? prevNext.next : prevNext.prev;

// The X position the circle settles at when fully revealed (pulled inward from the edge).
const restingLeft = (onLeftEdge: boolean) =>
  onLeftEdge ? PULL_DISTANCE : window.innerWidth - CIRCLE_SIZE - PULL_DISTANCE;

// Drives the exit transition on an already-visible circle element.
function flyOut(el: HTMLElement, direction: Direction): void {
  const tx = direction === 'right' ? '105vw' : '-105vw';
  el.style.transition = `transform ${EXIT_DURATION_MS}ms ease, opacity ${EXIT_DURATION_MS}ms ease`;
  el.style.transform = `translateY(-50%) translateX(${tx}) scale(${SCALE})`;
  el.style.opacity = '0';
}

// Keyboard circle: one element on <body>, outside React, so it outlives the
// song view that is replaced by the navigation it animates.
let keyCircle: HTMLDivElement | null = null;
let keyTimer: ReturnType<typeof setTimeout> | undefined;
let cancelPendingKeyNav: (() => void) | null = null;

function getKeyCircle(): HTMLDivElement {
  if (keyCircle?.isConnected) return keyCircle;
  const el = document.createElement('div');
  el.className = 'SwipeNav SwipeNav--ready';
  el.setAttribute('aria-hidden', 'true');
  for (const [name, value] of Object.entries(SHARED_STYLE)) el.style.setProperty(name, String(value));
  el.style.opacity = '0';
  el.innerHTML =
    `<svg class="SwipeNav__ring" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}">` +
    `<circle class="SwipeNav__ring-fg" cx="${SVG_CENTER}" cy="${SVG_CENTER}" r="${RING_RADIUS}" ` +
    `stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="0"></circle></svg>` +
    '<span></span>';
  document.body.appendChild(el);
  keyCircle = el;
  return el;
}

// `left` for the keyboard circle: just outside the content panel's side, or
// the swipe resting spot when the panel is missing or leaves no room.
function keyRestingLeft(onLeftEdge: boolean): number {
  const panel = document.querySelector('.SongText')?.getBoundingClientRect();
  if (!panel) return restingLeft(onLeftEdge);

  const half = (CIRCLE_SIZE * SCALE) / 2; // the circle is scaled around its center
  const center = onLeftEdge
    ? panel.left - KEY_PANEL_GAP - half
    : panel.right + KEY_PANEL_GAP + half;
  const fits = center - half >= 0 && center + half <= window.innerWidth;
  return fits ? center - CIRCLE_SIZE / 2 : restingLeft(onLeftEdge);
}

// Fades the filled circle in at its resting spot, then fades it out, with a small
// drift inward from its screen edge.
function playKeyAnimation(direction: Direction): void {
  const el = getKeyCircle();
  const onLeftEdge = direction === 'right';
  const inward = onLeftEdge ? 1 : -1;
  const shifted = (px: number) => `translateY(-50%) translateX(${px}px) scale(${SCALE})`;
  clearTimeout(keyTimer);

  el.lastElementChild!.className = arrowCls(onLeftEdge);
  el.style.transition = 'none';
  el.style.left = `${keyRestingLeft(onLeftEdge)}px`;
  el.style.transform = shifted(-inward * KEY_SHIFT);
  el.style.opacity = '0';
  void el.offsetWidth; // apply the start position before transitioning from it

  el.style.transition = `transform ${KEY_ENTER_MS}ms ease-out, opacity ${KEY_ENTER_MS}ms ease-out`;
  el.style.transform = shifted(0);
  el.style.opacity = '1';

  keyTimer = setTimeout(() => {
    el.style.transition = `transform ${KEY_EXIT_MS}ms ease-in, opacity ${KEY_EXIT_MS}ms ease-in`;
    el.style.transform = shifted(inward * KEY_SHIFT);
    el.style.opacity = '0';
  }, KEY_ENTER_MS + KEY_HOLD_MS);
}

// Navigates at once; the circle animation follows when the new page is shown.
function keyNavigate(path: string, direction: Direction): void {
  cancelPendingKeyNav?.();
  const stop = onLocationChange(() => {
    cancel();
    playKeyAnimation(direction);
  });
  const timer = setTimeout(() => cancel(), KEY_SWITCH_TIMEOUT_MS);
  const cancel = () => {
    stop();
    clearTimeout(timer);
    cancelPendingKeyNav = null;
  };
  cancelPendingKeyNav = cancel;
  navigate(path);
}

// The SVG progress ring, shared between swipe and keyboard circles.
function NavRing({ progress }: { progress: number }) {
  return (
    <svg className="SwipeNav__ring" viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
      <circle
        className="SwipeNav__ring-fg"
        cx={SVG_CENTER}
        cy={SVG_CENTER}
        r={RING_RADIUS}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
      />
    </svg>
  );
}

export function SwipeNav({ prevNext }: Props) {
  const [swipe, setSwipe] = useState<SwipeState>(INITIAL);
  const [releasing, setReleasing] = useState<Direction>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SwipeState>(INITIAL);
  const prevNextRef = useRef(prevNext);
  const didVibrate = useRef(false);

  useLayoutEffect(() => {
    prevNextRef.current = prevNext;
  }, [prevNext]);

  const update = (next: SwipeState) => {
    stateRef.current = next;
    setSwipe(next);
  };

  // Finger swipe workflow.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let lock: 'horizontal' | 'vertical' | null = null;
    let ignoreGesture = false;

    const onStart = (e: TouchEvent) => {
      // Prevent navigation on player seek.
      ignoreGesture = e.target instanceof Element && e.target.closest('[role="slider"]') !== null;
      if (ignoreGesture) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      lock = null;
      didVibrate.current = false;
      // The component outlives a swipe navigation: drop the finished gesture.
      if (stateRef.current !== INITIAL) update(INITIAL);
      setReleasing(null);
    };

    const onMove = (e: TouchEvent) => {
      if (ignoreGesture) return;
      if (document.body.style.overflow === 'hidden') return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      if (!lock && (ax > DIRECTION_LOCK || ay > DIRECTION_LOCK)) {
        lock = ax >= ay ? 'horizontal' : 'vertical';
      }
      if (lock !== 'horizontal') return;

      // { passive: false } registration lets us prevent native horizontal scroll,
      // but the browser may have already committed to a scroll (cancelable=false).
      if (e.cancelable) e.preventDefault();

      if (ax < MIN_SHOW) {
        update(INITIAL);
        return;
      }

      const progress = Math.min((ax - MIN_SHOW) / (MIN_HORIZONTAL - MIN_SHOW), 1);
      if (progress >= 1 && !didVibrate.current) {
        didVibrate.current = true;
        vibrate(1);
      } else if (progress < 1) {
        didVibrate.current = false;
      }
      update({ direction: dx < 0 ? 'left' : 'right', progress });
    };

    const onEnd = () => {
      if (ignoreGesture) {
        ignoreGesture = false;
        return;
      }
      const { direction, progress } = stateRef.current;
      lock = null;

      if (!window.getSelection()?.isCollapsed || progress < 1) {
        update(INITIAL);
        return;
      }

      const { prev, next } = prevNextRef.current;
      const target = pickTarget({ prev, next }, direction);
      if (!target) { update(INITIAL); return; }

      setReleasing(direction);
      // drive exit via imperative transition on the next frame so the element is painted first
      requestAnimationFrame(() => {
        const el = circleRef.current;
        if (el) flyOut(el, direction);
      });

      navigate(target.path);
    };

    document.body.addEventListener('touchstart', onStart, { passive: true });
    document.body.addEventListener('touchmove', onMove, { passive: false });
    document.body.addEventListener('touchend', onEnd);
    document.body.addEventListener('touchcancel', onEnd);

    return () => {
      document.body.removeEventListener('touchstart', onStart);
      document.body.removeEventListener('touchmove', onMove);
      document.body.removeEventListener('touchend', onEnd);
      document.body.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // Hotkey workflow: navigate immediately, animate after the page switch.
  useEffect(() => {
    const go = (direction: Direction) => {
      const target = pickTarget(prevNextRef.current, direction);
      if (target) keyNavigate(target.path, direction);
    };

    const goPrev = () => go('right');
    const goNext = () => go('left');
    window.addEventListener('kirtan:prevSong', goPrev);
    window.addEventListener('kirtan:nextSong', goNext);
    return () => {
      window.removeEventListener('kirtan:prevSong', goPrev);
      window.removeEventListener('kirtan:nextSong', goNext);
    };
  }, []);

  const { direction, progress } = swipe;
  const swipeOnLeftEdge = direction === 'right';
  const swipeTarget = direction ? pickTarget(prevNext, direction) : null;

  const ready = direction && progress >= 1;
  const cls = 'SwipeNav' + (ready || releasing ? ' SwipeNav--ready' : '');

  const left = direction
    ? (swipeOnLeftEdge
      ? progress * PULL_DISTANCE
      : window.innerWidth - CIRCLE_SIZE - progress * PULL_DISTANCE)
    : 0;
  const opacity = direction ? Math.min(progress * 2, 1) : 0;

  return (
    <>
      {direction && swipeTarget && (
        <div
          ref={circleRef}
          className={cls}
          style={{ left, opacity, ...SHARED_STYLE }}
          aria-hidden="true"
        >
          <NavRing progress={progress} />
          <span className={arrowCls(swipeOnLeftEdge)} />
        </div>
      )}
    </>
  );
}
