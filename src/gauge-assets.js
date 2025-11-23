
export function createGaugeAssets(size = 200) {
    const scale = size / 100;
    
    // Helper to create offscreen canvas
    function createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return { canvas, ctx: canvas.getContext('2d') };
    }

    // Helper for polar coordinates
    function polarToCartesian(cx, cy, r, angleDegrees) {
        const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
        return {
            x: cx + r * Math.cos(angleRadians),
            y: cy + r * Math.sin(angleRadians),
        };
    }

    // Helper for Arc Path (matching React describeArcPath)
    function describeArcPath(cx, cy, r1, r2, startAngle, endAngle) {
        const startOuter = polarToCartesian(cx, cy, r2, startAngle);
        const endOuter = polarToCartesian(cx, cy, r2, endAngle);
        const startInner = polarToCartesian(cx, cy, r1, endAngle);
        const endInner = polarToCartesian(cx, cy, r1, startAngle);

        const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

        const path = new Path2D();
        path.moveTo(startOuter.x, startOuter.y);
        path.arc(cx, cy, r2, (startAngle - 90) * Math.PI / 180, (endAngle - 90) * Math.PI / 180, false); // clockwise
        path.lineTo(startInner.x, startInner.y);
        path.arc(cx, cy, r1, (endAngle - 90) * Math.PI / 180, (startAngle - 90) * Math.PI / 180, true); // counter-clockwise
        path.closePath();
        return path;
    }

    // --- 1. Background Sprite ---
    const { canvas: bgCanvas, ctx: bgCtx } = createCanvas();
    bgCtx.scale(scale, scale);

    // Corner LEDs
    const drawCornerLed = (cx, cy) => {
        // Outer Ring
        bgCtx.beginPath();
        bgCtx.arc(cx, cy, 5, 0, Math.PI * 2);
        const grad = bgCtx.createLinearGradient(cx-5, cy-5, cx+5, cy+5); // Approx url(#u01JRPTFJ0HGA59PQZW3HV70NFG)
        grad.addColorStop(0, '#333F47');
        grad.addColorStop(0.4, '#090F14');
        bgCtx.fillStyle = grad;
        bgCtx.fill();
        bgCtx.strokeStyle = '#080808';
        bgCtx.lineWidth = 0.5;
        bgCtx.stroke();

        // Inner Black
        bgCtx.beginPath();
        bgCtx.arc(cx, cy, 3.8, 0, Math.PI * 2);
        bgCtx.fillStyle = '#000';
        bgCtx.fill();

        // Off State (default)
        bgCtx.beginPath();
        bgCtx.arc(cx, cy, 3.2, 0, Math.PI * 2);
        bgCtx.fillStyle = '#1a1a1a';
        bgCtx.fill();
    };

    bgCtx.globalAlpha = 0.75; // Opacity from React component
    drawCornerLed(10, 10);
    drawCornerLed(90, 10);
    drawCornerLed(90, 90);
    drawCornerLed(10, 90);
    bgCtx.globalAlpha = 1.0;

    // Main Circles
    // 1. Fill url(#01JRPTFJ0HQ0T310GM1MRCBFFX) - Using solid/simple gradient fallback or implementing?
    // The ID isn't in the provided SVGDefs snippet, assuming it's a dark fill based on context.
    // Looking at similar: likely dark. Let's use #060606 based on context or generic dark.
    bgCtx.beginPath();
    bgCtx.arc(50, 50, 48, 0, Math.PI * 2);
    bgCtx.fillStyle = '#060606'; 
    bgCtx.fill();

    // 2. Stroke url(#u01JRPTFJ0H386E2TY2F09DQTXD) width 1
    let grad = bgCtx.createLinearGradient(0, 0, 100, 100);
    grad.addColorStop(0, '#5F6A72');
    grad.addColorStop(0.4, '#090E13');
    bgCtx.beginPath();
    bgCtx.arc(50, 50, 48, 0, Math.PI * 2);
    bgCtx.strokeStyle = grad;
    bgCtx.lineWidth = 1;
    bgCtx.stroke();

    // 3. Stroke url(#u01JRPTFJ0HGA59PQZW3HV70NFG) width 2.5 r=46.3
    grad = bgCtx.createLinearGradient(0, 0, 100, 100);
    grad.addColorStop(0, '#333F47');
    grad.addColorStop(0.4, '#090F14');
    bgCtx.beginPath();
    bgCtx.arc(50, 50, 46.3, 0, Math.PI * 2);
    bgCtx.strokeStyle = grad;
    bgCtx.lineWidth = 2.5;
    bgCtx.stroke();

    // 4. Stroke url(#u01JRPTFJ0HGFVTAKJXF2D1QSMK) width 1.5 r=44.4
    // Note: Typo in ID in code vs defs? Defs has u01JRPTFJ0GFVTAKJXF2D1QSMK (starts with G).
    grad = bgCtx.createLinearGradient(0, 0, 100, 100);
    grad.addColorStop(0, '#061119');
    grad.addColorStop(1, '#1F282F');
    bgCtx.beginPath();
    bgCtx.arc(50, 50, 44.4, 0, Math.PI * 2);
    bgCtx.strokeStyle = grad;
    bgCtx.lineWidth = 1.5;
    bgCtx.stroke();

    // 5. Inner Thin Rings
    bgCtx.beginPath();
    bgCtx.arc(50, 50, 41.9, 0, Math.PI * 2);
    bgCtx.strokeStyle = '#040910';
    bgCtx.lineWidth = 1.5;
    bgCtx.stroke();

    // 6. Inner Ring Stroke url(#u01JRPTFJ0J5SDS8D17V29QAVDA) r=40.5
    grad = bgCtx.createLinearGradient(50, 0, 50, 100);
    grad.addColorStop(0, '#CCC');
    grad.addColorStop(0.75, '#040910');
    bgCtx.beginPath();
    bgCtx.arc(50, 50, 40.5, 0, Math.PI * 2);
    bgCtx.strokeStyle = grad;
    bgCtx.lineWidth = 1;
    bgCtx.stroke();

    // Ticks (Gray background path)
    // describeArcPath(gcx, gcy, gr1, gr2, minAngle, minAngle + 1) etc.
    // gcx=50, gcy=63, gr1=27, gr2=31
    const gcx = 50, gcy = 63, gr1 = 27, gr2 = 31;
    const minAngle = -100;
    
    bgCtx.fillStyle = '#A9ABAF';
    
    const tickAngles = [
        {start: minAngle, end: minAngle + 1},
        {start: minAngle + 20 - 0.5, end: minAngle + 20 + 0.5},
        {start: minAngle + 40 - 0.5, end: minAngle + 40 + 0.5},
        {start: minAngle + 60 - 0.5, end: minAngle + 60 + 0.5},
        {start: minAngle + 80 - 0.5, end: minAngle + 80 + 0.5},
        {start: minAngle + 100 - 0.5, end: minAngle + 100 + 0.5},
        {start: minAngle + 120 - 0.5, end: minAngle + 120 + 0.5},
        {start: minAngle + 140 - 0.5, end: minAngle + 140 + 0.5},
        {start: minAngle + 160 - 0.5, end: minAngle + 160 + 0.5},
        {start: minAngle + 180 - 0.5, end: minAngle + 180 + 0.5},
        {start: minAngle + 200 - 1, end: minAngle + 200},
    ];

    tickAngles.forEach(angle => {
        const path = describeArcPath(gcx, gcy, gr1, gr2, angle.start, angle.end);
        bgCtx.fill(path);
    });

    // Center Pivot Background
    // Circle r=5 stroke url(#u01JRPTFJ0JXAQ5G2AM22E9V5PJ) fill #040910
    grad = bgCtx.createLinearGradient(0, 0, 100, 100);
    grad.addColorStop(0, '#4D565B');
    grad.addColorStop(1, '#0C0E12');
    bgCtx.beginPath();
    bgCtx.arc(gcx, gcy, 5, 0, Math.PI * 2);
    bgCtx.fillStyle = '#040910';
    bgCtx.fill();
    bgCtx.strokeStyle = grad;
    bgCtx.lineWidth = 0.75;
    bgCtx.stroke();

    // Small dots in center
    // Circle r=2 fill #333 blur 0.5
    bgCtx.save();
    bgCtx.filter = 'blur(0.5px)';
    bgCtx.beginPath();
    bgCtx.arc(gcx, gcy, 2, 0, Math.PI * 2);
    bgCtx.fillStyle = '#333';
    bgCtx.fill();
    bgCtx.restore();

    // Circle r=1 fill #222
    bgCtx.beginPath();
    bgCtx.arc(gcx, gcy, 1, 0, Math.PI * 2);
    bgCtx.fillStyle = '#222';
    bgCtx.fill();

    // --- 2. Glass Sprite ---
    const { canvas: glassCanvas, ctx: glassCtx } = createCanvas();
    glassCtx.scale(scale, scale);
    glassCtx.pointerEvents = 'none'; // Logical flag, doesn't affect canvas

    // Glass Glare
    // Path: M 50 8.1 A 41.9 41.9 0 0 1 91.9 50 A 45 45 0 0 0 50 30 A 45 45 0 0 0 8.1 50 A 41.9 41.9 0 0 1 50 8.1 Z
    // Transform: rotate(-25, 50, 50)
    glassCtx.save();
    glassCtx.translate(50, 50);
    glassCtx.rotate(-25 * Math.PI / 180);
    glassCtx.translate(-50, -50);
    
    const glarePath = new Path2D("M 50 8.1 A 41.9 41.9 0 0 1 91.9 50 A 45 45 0 0 0 50 30 A 45 45 0 0 0 8.1 50 A 41.9 41.9 0 0 1 50 8.1 Z");
    grad = glassCtx.createLinearGradient(50, 0, 50, 100); // Vertical gradient roughly
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    glassCtx.fillStyle = grad;
    glassCtx.fill(glarePath);
    glassCtx.restore();

    // Glass Reflection
    // Circle r=41.9
    grad = glassCtx.createLinearGradient(0, 0, 100, 100);
    grad.addColorStop(0, 'rgba(255,255,255,0.05)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.05)');
    glassCtx.beginPath();
    glassCtx.arc(50, 50, 41.9, 0, Math.PI * 2);
    glassCtx.fillStyle = grad;
    glassCtx.fill();

    // Glass Specular
    // Radial cx=20% cy=20% r=60%
    const rGrad = glassCtx.createRadialGradient(20, 20, 0, 20, 20, 60);
    rGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    rGrad.addColorStop(1, 'rgba(255,255,255,0)');
    glassCtx.beginPath();
    glassCtx.arc(50, 50, 41.9, 0, Math.PI * 2);
    glassCtx.fillStyle = rGrad;
    glassCtx.fill();

    // --- 3. Needle Sprite ---
    // The needle is dynamic, but we can pre-render it upright and rotate it.
    // The needle in React is drawn at 'angle'. 
    // Let's draw it pointing UP (angle = 0 degrees in polar? No, 0 degrees is usually right, -90 is up).
    // React component logic: (angle - 90). So angle=0 => -90 (Up).
    // Let's pre-render it pointing UP (angle=0 in the logic means min value usually, but let's normalize).
    // Needle geometry:
    // Tip: polar(cx, cy, r2, angle)
    // BaseCenter: polar(cx, cy, r1, angle)
    // BaseLeft: polar(BaseCenter, width/2, angle - 90)
    // BaseRight: polar(BaseCenter, width/2, angle + 90)
    
    // Let's draw it at 0 degrees (UP) in a small canvas.
    // r1 = -4, r2 = gr2-1 = 30. BaseWidth = 2.
    // Height = 30 - (-4) = 34 + padding. Width = ~4.
    
    const needleCanvas = document.createElement('canvas');
    // Make it square to simplify rotation center logic, or just large enough.
    // Let's make it size x size but just draw in center to be safe and match scale.
    needleCanvas.width = size;
    needleCanvas.height = size;
    const needleCtx = needleCanvas.getContext('2d');
    needleCtx.scale(scale, scale);
    
    // Draw Needle pointing UP (-90 degrees standard, or 0 degrees in React logic?)
    // React: polarToCartesian uses (angle - 90). 
    // If I pass angle=0 to polarToCartesian => -90 degrees (UP).
    // So let's use angle=0 for drawing the sprite.
    
    const nCx = 50, nCy = 50; // Draw in center of sprite
    const nR1 = -4;
    const nR2 = 30; // 31 - 1
    const nWidth = 2;
    const nAngle = 0; 

    const tip = polarToCartesian(nCx, nCy, nR2, nAngle);
    const baseCenter = polarToCartesian(nCx, nCy, nR1, nAngle);
    const baseLeft = polarToCartesian(baseCenter.x, baseCenter.y, nWidth/2, nAngle - 90);
    const baseRight = polarToCartesian(baseCenter.x, baseCenter.y, nWidth/2, nAngle + 90);

    needleCtx.beginPath();
    needleCtx.moveTo(tip.x, tip.y);
    needleCtx.lineTo(baseLeft.x, baseLeft.y);
    // Arc at bottom
    // A radius,radius 0 0,0 end.x,end.y
    // Canvas arcTo or quadraticCurveTo?
    // SVG Path: A arcRadius,arcRadius 0 0,0 baseRight.x,baseRight.y
    // This is a small arc connecting left to right.
    // arcRadius = baseWidth (2).
    
    // Manual arc calculation or simplify to line for 2px width? 
    // Let's try to match. A 2,2 0 0,0 ...
    // Start is BaseLeft. End is BaseRight.
    // Center of that arc is likely baseCenter?
    // SVG Arc is complex to map exactly without library, but it's a semi-circle cap?
    // 0 0,0 means largeArc=0, sweep=0. 
    // It effectively rounds the bottom.
    
    needleCtx.quadraticCurveTo(baseCenter.x, baseCenter.y + 2, baseRight.x, baseRight.y); // Approx cap
    needleCtx.lineTo(tip.x, tip.y);
    needleCtx.closePath();

    // Gradient: linear x1=50% y1=0% x2=50% y2=100% relative to bounding box.
    // Bounding box is roughly top=tip.y (50-30=20) bottom=base.y (50+4=54).
    // So gradient from y=20 to y=54.
    grad = needleCtx.createLinearGradient(0, 20, 0, 54);
    grad.addColorStop(0, '#666');
    grad.addColorStop(0.7, '#FFF');
    grad.addColorStop(1, '#666');
    
    needleCtx.fillStyle = grad;
    needleCtx.fill();

    return {
        background: bgCanvas,
        glass: glassCanvas,
        needle: needleCanvas
    };
}
