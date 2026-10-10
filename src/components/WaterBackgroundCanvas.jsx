import React, { useEffect, useRef } from 'react';

export default function WaterBackgroundCanvas({ reducedMotion }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create subtle dark rain drop particles
    const rainDrops = [];
    const dropCount = Math.min(60, Math.floor(width / 25));
    for (let i = 0; i < dropCount; i++) {
      rainDrops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 18 + 10,
        speed: Math.random() * 4 + 4,
        opacity: Math.random() * 0.15 + 0.05
      });
    }

    // Create subtle ripple rings
    const ripples = [];
    const addRipple = (x, y) => {
      ripples.push({
        x,
        y,
        radius: 2,
        maxRadius: Math.random() * 25 + 15,
        opacity: 0.2,
        speed: 0.4
      });
    };

    let rippleTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle rain drops
      ctx.strokeStyle = 'rgba(240, 237, 228, 0.12)';
      ctx.lineWidth = 1;

      for (let i = 0; i < rainDrops.length; i++) {
        const drop = rainDrops[i];
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 1, drop.y + drop.length);
        ctx.strokeStyle = `rgba(240, 237, 228, ${drop.opacity})`;
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 0.5;

        if (drop.y > height) {
          drop.y = -20;
          drop.x = Math.random() * width;

          // Occasionally spawn a ripple where drop hits bottom
          if (Math.random() > 0.6) {
            addRipple(drop.x, height - Math.random() * 120);
          }
        }
      }

      // Draw subtle water ripple rings
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 56, ${r.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        r.radius += r.speed;
        r.opacity -= 0.003;

        if (r.opacity <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      rippleTimer++;
      if (rippleTimer % 80 === 0) {
        addRipple(Math.random() * width, Math.random() * height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return <div className="water-background-static-fallback" />;
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="water-background-canvas"
    />
  );
}
