"use client";

import { useEffect, useRef } from "react";
import type { Severity } from "@/lib/sim/protocol";

type Particle = { x: number; y: number; size: number; speed: number };

export function WeatherField({ severity }: { severity: Severity }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const severityRef = useRef(severity);
  severityRef.current = severity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const particles: Particle[] = Array.from({ length: 64 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.4 + Math.random() * 1.5,
      speed: 0.35 + Math.random() * 1.3,
    }));

    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const mode = severityRef.current;
      const urgent = mode === "alarm" || mode === "retrain";
      const color = mode === "retrain" ? "200, 70, 48" : urgent ? "224, 160, 80" : "214, 196, 160";
      const drift = urgent ? 0.00042 : 0.00014;

      for (const particle of particles) {
        particle.x += drift * particle.speed;
        particle.y += Math.sin(particle.x * 8 + particle.size) * 0.00008;
        if (particle.x > 1.08) {
          particle.x = -0.05;
          particle.y = Math.random();
        }
        context.beginPath();
        context.fillStyle = `rgba(${color}, ${0.18 + particle.size * 0.16})`;
        context.arc(particle.x * width, particle.y * height, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
