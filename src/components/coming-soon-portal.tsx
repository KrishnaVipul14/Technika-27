"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Instagram, MapPin } from "lucide-react";

function TechParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const count = Math.min(48, Math.max(24, Math.floor((width * height) / 28000)));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.8,
      alpha: Math.random() * 0.45 + 0.25,
    }));

    let rafId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connecting constellation lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 115) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(125, 185, 255, ${0.12 * (1 - dist / 115)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw floating nodes
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        else if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 215, 255, ${p.alpha})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} className="reference-particle-canvas" aria-hidden="true" />;
}


export function ComingSoonPortal() {
  return (
    <div className="reference-portal-stage">
      {/* Dynamic Ambient Particle Field */}
      <TechParticleCanvas />

      {/* Atmospheric Cybernetic Background */}
      <div className="reference-backdrop" aria-hidden="true">
        <div className="tech-glow glow-top" />
        <div className="tech-glow glow-bottom" />
        <div className="tech-grid-overlay" />
      </div>

      {/* Modern Minimalist Frame */}
      <div className="reference-frame" aria-hidden="true">
        <span className="corner top-left" />
        <span className="corner top-right" />
        <span className="corner bottom-left" />
        <span className="corner bottom-right" />
      </div>

      {/* Main Content Card Container */}
      <main className="reference-container">
        {/* Top Header: ✦ BIT PATNA PRESENTS ✦ */}
        <div className="reference-presents">
          <span className="tech-line left" aria-hidden="true" />
          <span className="star-ornament" aria-hidden="true">✦</span>
          <p className="presents-text">BIT PATNA PRESENTS</p>
          <span className="star-ornament" aria-hidden="true">✦</span>
          <span className="tech-line right" aria-hidden="true" />
        </div>

        {/* Circular Seal / Logo Container */}
        <div className="reference-seal-wrap">
          <div className="reference-seal-glow" aria-hidden="true" />
          <div className="reference-seal-circle" aria-hidden="true" />
          <Image
            src="/technika.webp"
            alt="Technika Logo"
            width={72}
            height={72}
            priority
            sizes="72px"
            className="reference-seal-img"
          />
        </div>

        {/* Subtitle Overline */}
        <div className="reference-overline">
          THE NEXT CHAPTER IS BEING WRITTEN
        </div>

        {/* Flagship Title: Technika ’27 */}
        <h1 className="reference-title" aria-label="Technika 27">
          <span className="reference-title-word">Technika</span>
          <span className="reference-title-year">’27</span>
        </h1>

        {/* Modern Pill Display: COMING SOON */}
        <div className="reference-coming-soon">
          <span className="coming-soon-dot" aria-hidden="true" />
          <span>COMING SOON</span>
        </div>

        {/* Description */}
        <p className="reference-description">
          A celebration of technology, innovation, and creativity is taking shape at
          Birla Institute of Technology, Patna.
        </p>

        {/* Bottom Dual Card Box */}
        <div className="reference-status-card">
          {/* Left Column: The stage is being set / Opening soon */}
          <div className="status-col left-col">
            <span className="status-label">THE STAGE IS BEING SET</span>
            <h2 className="status-headline">Opening soon</h2>
            <a
              href="https://maps.app.goo.gl/eBPKaTah37o2mWLM6"
              target="_blank"
              rel="noopener noreferrer"
              className="status-location"
              title="View BIT Patna on Google Maps"
              aria-label="View BIT Patna on Google Maps"
            >
              <MapPin size={13} className="loc-pin" />
              <span>BIT PATNA · INDIA</span>
            </a>
          </div>

          {/* Vertical Divider */}
          <div className="status-divider" aria-hidden="true" />

          {/* Right Column: Instagram Portal Link */}
          <div className="status-col right-col">
            <a
              href="https://www.instagram.com/technika_bitp?utm_source=ig_web_button_share_sheet&psln=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noopener noreferrer"
              className="status-instagram-link"
              aria-label="Visit Technika BIT Patna on Instagram"
            >
              <div className="instagram-icon-box">
                <Instagram size={22} className="instagram-glyph" />
              </div>
              <div className="instagram-text-wrap">
                <span className="instagram-label">OFFICIAL INSTAGRAM</span>
                <span className="instagram-handle">@technika_bitp</span>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
