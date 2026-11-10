'use client';
import './SwipeNav.scss';
import { useEffect, useRef, useState } from 'react';

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

const EXIT_DURATION_MS = 400;

// Hotkey animation consts.
const ENTER_DURATION_MS = 220; // matches `left 220ms` in the entry transition
const HOLD_MS = 60;            // brief pause at peak so the filled circle is visible before exit
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
  const keyCircleRef = useRef<HTMLDivElement>(null);
  const keyArrowRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<SwipeState>(INITIAL);
  const prevNextRef = useRef(prevNext);
  const didVibrate = useRef(false);
  prevNextRef.current = prevNext;

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

      window.location.href = target.path;
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

  // Hotkey swipe workflow.
  useEffect(() => {
    const animateAndGo = (direction: Direction) => {
      const target = pickTarget(prevNextRef.current, direction);
      if (!target) return;

      const el = keyCircleRef.current;
      if (!el) return;

      const onLeftEdge = direction === 'right';
      const startLeft = onLeftEdge ? -CIRCLE_SIZE : window.innerWidth;
      const endLeft = restingLeft(onLeftEdge);

      if (keyArrowRef.current) {
        keyArrowRef.current.className = arrowCls(onLeftEdge);
      }

      // Reset to start position without transition
      el.style.transition = 'none';
      el.style.transform = 'translateY(-50%) scale(1)';
      el.style.opacity = '0';
      el.style.left = `${startLeft}px`;

      // Two rAFs ensure the browser has painted the reset before animating
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition =
          `left ${ENTER_DURATION_MS}ms ease-out, opacity 120ms ease, transform 180ms ease`;
        el.style.left = `${endLeft}px`;
        el.style.opacity = '1';
        el.style.transform = `translateY(-50%) scale(${SCALE})`;

        // Wait for the slide-in to finish, then hold briefly at peak before exiting.
        // Navigation fires together with flyOut — the exit animation is cosmetic cover
        // while the next page loads; perceived latency stays at ENTER_DURATION_MS + HOLD_MS.
        setTimeout(() => {
          flyOut(el, direction);
          window.location.href = target.path;
        }, ENTER_DURATION_MS + HOLD_MS);
      }));
    };

    const goPrev = () => animateAndGo('right');
    const goNext = () => animateAndGo('left');
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

      {/* Keyboard navigation animation — always mounted, driven imperatively */}
      <div
        ref={keyCircleRef}
        className="SwipeNav SwipeNav--ready"
        style={{ opacity: 0, left: 0, ...SHARED_STYLE }}
        aria-hidden="true"
      >
        <NavRing progress={1} />
        <span ref={keyArrowRef} className={arrowCls(false)} />
      </div>
    </>
  );
}
