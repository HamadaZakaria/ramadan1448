// Procedural Ramadan scene renderer. All drawing is deterministic in `t` (seconds)
// so the live preview and the recorded video show the same animation.
export const FORMATS = [
    { id: 'story', width: 1080, height: 1920 },
    { id: 'square', width: 1080, height: 1080 },
    { id: 'wide', width: 1920, height: 1080 },
];
// Deterministic PRNG so stars and particles are stable frame to frame.
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function makeStars(seed, count, maxY) {
    const rnd = mulberry32(seed);
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({ x: rnd(), y: rnd() * maxY, r: 0.6 + rnd() * 1.9, phase: rnd() * Math.PI * 2, speed: 0.6 + rnd() * 1.6 });
    }
    return stars;
}
function drawStars(ctx, W, H, t, stars) {
    ctx.save();
    for (const s of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.globalAlpha = tw;
        ctx.fillStyle = '#fff7e0';
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r * (W / 1080), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
function drawCrescent(ctx, cx, cy, R, glow) {
    ctx.save();
    // soft halo
    const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.6 * glow);
    halo.addColorStop(0, 'rgba(255, 205, 105, 0.35)');
    halo.addColorStop(0.5, 'rgba(255, 190, 90, 0.12)');
    halo.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 2.6 * glow, 0, Math.PI * 2);
    ctx.fill();
    // gold body
    const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    body.addColorStop(0, '#ffe9ad');
    body.addColorStop(0.55, '#f6c860');
    body.addColorStop(1, '#d99a2b');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    // bite out the shadow circle to form the crescent
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx + R * 0.42, cy - R * 0.18, R * 0.86, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
// A stylized fanous (Ramadan lantern), swaying around its hanging point.
function drawLantern(ctx, x, yTop, len, s, sway, glowPulse) {
    ctx.save();
    ctx.translate(x, yTop);
    ctx.rotate(sway);
    // hanging string
    ctx.strokeStyle = 'rgba(230, 200, 140, 0.55)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len);
    ctx.stroke();
    ctx.translate(0, len);
    const w = 90 * s; // body half-width
    const h = 150 * s; // body height
    const capH = 34 * s;
    // warm halo behind the lantern
    const halo = ctx.createRadialGradient(0, h * 0.55, 4, 0, h * 0.55, w * 3.2);
    halo.addColorStop(0, `rgba(255, 176, 66, ${0.34 * glowPulse})`);
    halo.addColorStop(1, 'rgba(255, 176, 66, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, h * 0.55, w * 3.2, 0, Math.PI * 2);
    ctx.fill();
    // top cap (little dome + ring)
    ctx.fillStyle = '#8a5a1d';
    ctx.beginPath();
    ctx.arc(0, 0, 7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-w * 0.62, capH);
    ctx.quadraticCurveTo(0, -capH * 1.3, w * 0.62, capH);
    ctx.closePath();
    ctx.fillStyle = '#a86e24';
    ctx.fill();
    // glass body: glowing trapezoid
    const glass = ctx.createLinearGradient(0, capH, 0, capH + h);
    glass.addColorStop(0, `rgba(255, 214, 120, ${0.92 * glowPulse})`);
    glass.addColorStop(0.5, `rgba(255, 166, 54, ${0.95 * glowPulse})`);
    glass.addColorStop(1, `rgba(214, 108, 24, ${0.92 * glowPulse})`);
    ctx.beginPath();
    ctx.moveTo(-w * 0.62, capH);
    ctx.lineTo(w * 0.62, capH);
    ctx.lineTo(w, capH + h);
    ctx.lineTo(-w, capH + h);
    ctx.closePath();
    ctx.fillStyle = glass;
    ctx.fill();
    // ribs
    ctx.strokeStyle = 'rgba(96, 48, 8, 0.55)';
    ctx.lineWidth = 3 * s;
    for (const fx of [-0.62, -0.2, 0.2, 0.62]) {
        ctx.beginPath();
        ctx.moveTo(w * fx, capH);
        ctx.lineTo(w * fx * 1.6, capH + h);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-w * 0.62, capH);
    ctx.lineTo(w * 0.62, capH);
    ctx.moveTo(-w, capH + h);
    ctx.lineTo(w, capH + h);
    ctx.stroke();
    // bottom ring + finial
    ctx.fillStyle = '#8a5a1d';
    ctx.beginPath();
    ctx.moveTo(-w, capH + h);
    ctx.lineTo(w, capH + h);
    ctx.lineTo(w * 0.45, capH + h + 26 * s);
    ctx.lineTo(-w * 0.45, capH + h + 26 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, capH + h + 38 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawMosque(ctx, W, H, baseY, color) {
    ctx.save();
    ctx.fillStyle = color;
    const u = W / 1080; // unit
    ctx.beginPath();
    ctx.rect(0, baseY, W, H - baseY);
    // main building
    ctx.rect(W * 0.30, baseY - 150 * u, W * 0.40, 150 * u);
    // main dome
    ctx.moveTo(W * 0.32, baseY - 150 * u);
    ctx.quadraticCurveTo(W * 0.5, baseY - 430 * u, W * 0.68, baseY - 150 * u);
    // dome finial
    ctx.rect(W * 0.5 - 4 * u, baseY - 320 * u, 8 * u, 30 * u);
    // side domes
    ctx.moveTo(W * 0.20, baseY - 100 * u);
    ctx.quadraticCurveTo(W * 0.27, baseY - 240 * u, W * 0.34, baseY - 100 * u);
    ctx.moveTo(W * 0.66, baseY - 100 * u);
    ctx.quadraticCurveTo(W * 0.73, baseY - 240 * u, W * 0.80, baseY - 100 * u);
    ctx.rect(W * 0.18, baseY - 100 * u, W * 0.18, 100 * u);
    ctx.rect(W * 0.64, baseY - 100 * u, W * 0.18, 100 * u);
    // minarets
    for (const mx of [W * 0.08, W * 0.88]) {
        ctx.rect(mx, baseY - 420 * u, 34 * u, 420 * u);
        ctx.rect(mx - 8 * u, baseY - 300 * u, 50 * u, 14 * u); // balcony
        ctx.moveTo(mx - 4 * u, baseY - 420 * u);
        ctx.quadraticCurveTo(mx + 17 * u, baseY - 520 * u, mx + 38 * u, baseY - 420 * u);
    }
    ctx.fill();
    // gold tip on the main dome finial
    ctx.fillStyle = 'rgba(255, 214, 130, 0.95)';
    ctx.beginPath();
    ctx.arc(W * 0.5, baseY - 327 * u, 8 * u, 0, Math.PI * 2);
    ctx.fill();
    // lit windows
    ctx.fillStyle = 'rgba(255, 190, 90, 0.85)';
    for (let i = 0; i < 5; i++) {
        const wx = W * 0.36 + i * W * 0.07;
        ctx.beginPath();
        ctx.moveTo(wx, baseY - 40 * u);
        ctx.lineTo(wx, baseY - 90 * u);
        ctx.quadraticCurveTo(wx + 14 * u, baseY - 118 * u, wx + 28 * u, baseY - 90 * u);
        ctx.lineTo(wx + 28 * u, baseY - 40 * u);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
function makeParticles(seed, count) {
    const rnd = mulberry32(seed);
    const ps = [];
    for (let i = 0; i < count; i++) {
        ps.push({ x: rnd(), y0: rnd(), r: 1.5 + rnd() * 5, speed: 0.02 + rnd() * 0.05, phase: rnd() * Math.PI * 2, drift: 10 + rnd() * 30 });
    }
    return ps;
}
function drawParticles(ctx, W, H, t, ps, color) {
    ctx.save();
    for (const p of ps) {
        const yFrac = ((p.y0 - t * p.speed) % 1 + 1) % 1;
        const x = p.x * W + Math.sin(t * 0.7 + p.phase) * p.drift * (W / 1080);
        const fade = Math.sin(yFrac * Math.PI); // fade in/out over the journey
        ctx.globalAlpha = 0.55 * fade;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, yFrac * H, p.r * (W / 1080), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
// Per-template static state (stars, particles) so we don't reseed per frame.
const CACHE = {};
function stateFor(key, seed) {
    if (!CACHE[key]) {
        CACHE[key] = { stars: makeStars(seed, 90, 0.75), particles: makeParticles(seed + 7, 42) };
    }
    return CACHE[key];
}
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function drawTextBlock(ctx, W, H, cy, t, text, accent) {
    const u = W / 1080;
    const appear = easeOutCubic(Math.min(1, t / 1.4));
    const breathe = 1 + 0.012 * Math.sin(t * 1.1);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = text.dir;
    const rise = (1 - appear) * 60 * u;
    // line 1: the big greeting
    ctx.globalAlpha = appear;
    const s1 = Math.min(W * 0.92, H * 0.92);
    const size1 = Math.min(150 * u, s1 / Math.max(4.2, text.line1.length * 0.62));
    ctx.font = `900 ${size1 * breathe}px ${text.font}`;
    ctx.shadowColor = 'rgba(255, 190, 90, 0.55)';
    ctx.shadowBlur = 34 * u;
    ctx.fillStyle = accent;
    ctx.fillText(text.line1, W / 2, cy + rise);
    ctx.shadowBlur = 0;
    // line 2
    if (text.line2.trim()) {
        const appear2 = easeOutCubic(Math.max(0, Math.min(1, (t - 0.45) / 1.4)));
        ctx.globalAlpha = appear2;
        const size2 = size1 * 0.42;
        ctx.font = `600 ${size2}px ${text.font}`;
        ctx.fillStyle = 'rgba(255, 246, 224, 0.95)';
        ctx.fillText(text.line2, W / 2, cy + size1 * 0.85 + (1 - appear2) * 40 * u);
    }
    // sender name
    if (text.name.trim()) {
        const appear3 = easeOutCubic(Math.max(0, Math.min(1, (t - 0.9) / 1.4)));
        ctx.globalAlpha = appear3;
        const size3 = size1 * 0.30;
        ctx.font = `400 ${size3}px ${text.font}`;
        ctx.fillStyle = 'rgba(255, 246, 224, 0.8)';
        ctx.fillText(`${text.namePrefix}${text.name}`, W / 2, cy + size1 * 1.45);
    }
    ctx.restore();
}
export function drawScene(ctx, template, W, H, t, text) {
    const u = W / 1080;
    if (template === 'night') {
        const st = stateFor('night', 11);
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#070d24');
        sky.addColorStop(0.55, '#15224e');
        sky.addColorStop(1, '#2c3f76');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        drawStars(ctx, W, H, t, st.stars);
        drawCrescent(ctx, W * 0.76, H * 0.16, 90 * u * (W / Math.min(W, H)) * 1.2, 1 + 0.05 * Math.sin(t * 0.8));
        // hanging lanterns from the top
        drawLantern(ctx, W * 0.14, -10, H * 0.06, u * 1.15, 0.06 * Math.sin(t * 0.9), 0.9 + 0.1 * Math.sin(t * 2.1));
        drawLantern(ctx, W * 0.30, -10, H * 0.12, u * 0.85, 0.07 * Math.sin(t * 0.9 + 1.4), 0.9 + 0.1 * Math.sin(t * 2.4 + 1));
        drawLantern(ctx, W * 0.88, -10, H * 0.09, u * 1.0, 0.06 * Math.sin(t * 0.8 + 2.6), 0.9 + 0.1 * Math.sin(t * 1.9 + 2));
        drawMosque(ctx, W, H, H * 0.93, '#0a1230');
        drawTextBlock(ctx, W, H, H * 0.47, t, text, '#ffd98a');
    }
    else if (template === 'lanterns') {
        const st = stateFor('lanterns', 23);
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1c0620');
        bg.addColorStop(0.6, '#32102f');
        bg.addColorStop(1, '#4a1a33');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        drawStars(ctx, W, H, t, st.stars.slice(0, 40));
        drawParticles(ctx, W, H, t, st.particles, 'rgba(255, 186, 92, 0.9)');
        drawLantern(ctx, W * 0.20, -10, H * 0.10, u * 1.5, 0.05 * Math.sin(t * 0.8), 0.92 + 0.08 * Math.sin(t * 2.0));
        drawLantern(ctx, W * 0.50, -10, H * 0.05, u * 1.9, 0.04 * Math.sin(t * 0.7 + 1), 0.92 + 0.08 * Math.sin(t * 2.3 + 0.8));
        drawLantern(ctx, W * 0.80, -10, H * 0.12, u * 1.4, 0.055 * Math.sin(t * 0.85 + 2.2), 0.92 + 0.08 * Math.sin(t * 1.8 + 1.7));
        drawLantern(ctx, W * 0.35, -10, H * 0.22, u * 0.9, 0.07 * Math.sin(t * 0.95 + 3), 0.9 + 0.1 * Math.sin(t * 2.6));
        drawLantern(ctx, W * 0.66, -10, H * 0.26, u * 0.8, 0.07 * Math.sin(t * 1.0 + 4.1), 0.9 + 0.1 * Math.sin(t * 2.2 + 2.4));
        drawTextBlock(ctx, W, H, H * 0.60, t, text, '#ffe3a1');
    }
    else {
        // crescent: minimal, elegant, gold on deep night
        const st = stateFor('crescent', 37);
        const bg = ctx.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.42, Math.max(W, H) * 0.85);
        bg.addColorStop(0, '#131c3f');
        bg.addColorStop(1, '#05070f');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        drawStars(ctx, W, H, t, st.stars);
        drawParticles(ctx, W, H, t, st.particles, 'rgba(255, 209, 128, 0.75)');
        const bigR = Math.min(W, H) * 0.30;
        drawCrescent(ctx, W / 2, H * 0.34, bigR, 1 + 0.06 * Math.sin(t * 0.7));
        // companion star
        const sx = W / 2 + bigR * 1.05, sy = H * 0.34 - bigR * 0.55;
        const tw = 0.7 + 0.3 * Math.sin(t * 1.6);
        ctx.save();
        ctx.globalAlpha = tw;
        ctx.fillStyle = '#ffe9ad';
        ctx.translate(sx, sy);
        const sr = 16 * u * (Math.min(W, H) / 1080) * 3;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const rr = i % 2 === 0 ? sr : sr * 0.42;
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        drawTextBlock(ctx, W, H, H * 0.66, t, text, '#f6c860');
    }
}
