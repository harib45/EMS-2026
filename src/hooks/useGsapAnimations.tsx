import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animate children elements with staggered fade+slide on mount.
 */
export function useStaggerFadeIn(selector = '.gsap-fade-item', delay = 0) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) return;
    const els = containerRef.current.querySelectorAll(selector);
    if (!els.length) return;

    gsap.set(els, { opacity: 0, y: 24 });
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power3.out',
      delay,
    });
  }, [selector, delay]);

  return containerRef;
}

/**
 * Simple fade-in for a single element.
 */
export function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay }
    );
  }, [delay]);

  return ref;
}

/**
 * Slide-in from left for sidebar.
 */
export function useSlideInLeft(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', delay }
    );
  }, [delay]);

  return ref;
}

/**
 * Scale-in pop effect.
 */
export function useScaleIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', delay }
    );
  }, [delay]);

  return ref;
}
