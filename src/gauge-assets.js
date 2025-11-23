
export function createGaugeAssetAtlas(size = 200, variationCount = 16) {
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

    // Helper for Arc Path
    function describeArcPath(cx, cy, r1, r2, startAngle, endAngle) {
        const startOuter = polarToCartesian(cx, cy, r2, startAngle);
        const endOuter = polarToCartesian(cx, cy, r2, endAngle);
        const startInner = polarToCartesian(cx, cy, r1, endAngle);
        const endInner = polarToCartesian(cx, cy, r1, startAngle);

        const path = new Path2D();
        path.moveTo(startOuter.x, startOuter.y);
        path.arc(cx, cy, r2, (startAngle - 90) * Math.PI / 180, (endAngle - 90) * Math.PI / 180, false);
        path.lineTo(startInner.x, startInner.y);
        path.arc(cx, cy, r1, (endAngle - 90) * Math.PI / 180, (startAngle - 90) * Math.PI / 180, true);
        path.closePath();
        return path;
    }

    const backgrounds = [];
    const glasses = [];
    let needleCanvas = null;

    // Generate Needle (Static, no lighting variation relative to position usually)
    {
        const { canvas, ctx } = createCanvas();
        ctx.scale(scale, scale);
        
        const nCx = 50, nCy = 50;
        const nR1 = -4;
        const nR2 = 30;
        const nWidth = 2;
        const nAngle = 0; 

        const tip = polarToCartesian(nCx, nCy, nR2, nAngle);
        const baseCenter = polarToCartesian(nCx, nCy, nR1, nAngle);
        const baseLeft = polarToCartesian(baseCenter.x, baseCenter.y, nWidth/2, nAngle - 90);
        const baseRight = polarToCartesian(baseCenter.x, baseCenter.y, nWidth/2, nAngle + 90);

        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(baseLeft.x, baseLeft.y);
        ctx.quadraticCurveTo(baseCenter.x, baseCenter.y + 2, baseRight.x, baseRight.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 20, 0, 54);
        grad.addColorStop(0, '#666');
        grad.addColorStop(0.7, '#FFF');
        grad.addColorStop(1, '#666');
        
        ctx.fillStyle = grad;
        ctx.fill();
        needleCanvas = canvas;
    }

    // Generate Variations for Background and Glass
    for (let i = 0; i < variationCount; i++) {
        // factor: 0.0 to 1.0. 
        // Map this to "angle" or "light position".
        // Let's simulate a light sweep from -45deg to +45deg around the top-left axis roughly.
        // Or simple rotation of the light vector.
        const factor = i / (variationCount - 1);
        
        // --- Background Variation ---
        // Vary the metallic gradients angle
        const { canvas: bgCanvas, ctx: bgCtx } = createCanvas();
        bgCtx.scale(scale, scale);
        
        // Shift gradient vector based on factor.
        // Original: 0,0 to 100,100 (Top-Left to Bottom-Right)
        // Variation: Rotate this vector around center (50,50).
        // Angle deviation: -20deg to +20deg.
        const baseAngle = 45 * Math.PI / 180; // 0,0 to 100,100 is 45 degrees
        const deviation = (factor - 0.5) * 40 * Math.PI / 180; // +/- 20 deg
        const currentAngle = baseAngle + deviation;
        
        // Calculate new start/end points for gradient line length ~141 (diagonal) centered at 50,50
        const r = 70; // half diagonal
        const x1 = 50 + r * Math.cos(currentAngle + Math.PI); // start
        const y1 = 50 + r * Math.sin(currentAngle + Math.PI);
        const x2 = 50 + r * Math.cos(currentAngle); // end
        const y2 = 50 + r * Math.sin(currentAngle);

        // Draw Background using this gradient vector
        
        // LEDs (Static)
        const drawCornerLed = (cx, cy) => {
            bgCtx.beginPath();
            bgCtx.arc(cx, cy, 5, 0, Math.PI * 2);
            const grad = bgCtx.createLinearGradient(cx-5, cy-5, cx+5, cy+5); 
            grad.addColorStop(0, '#333F47');
            grad.addColorStop(0.4, '#090F14');
            bgCtx.fillStyle = grad;
            bgCtx.fill();
            bgCtx.strokeStyle = '#080808';
            bgCtx.lineWidth = 0.5;
            bgCtx.stroke();
            bgCtx.beginPath();
            bgCtx.arc(cx, cy, 3.8, 0, Math.PI * 2);
            bgCtx.fillStyle = '#000';
            bgCtx.fill();
            bgCtx.beginPath();
            bgCtx.arc(cx, cy, 3.2, 0, Math.PI * 2);
            bgCtx.fillStyle = '#1a1a1a';
            bgCtx.fill();
        };
        bgCtx.globalAlpha = 0.75;
        drawCornerLed(10, 10);
        drawCornerLed(90, 10);
        drawCornerLed(90, 90);
        drawCornerLed(10, 90);
        bgCtx.globalAlpha = 1.0;

        // Main Face
        bgCtx.beginPath();
        bgCtx.arc(50, 50, 48, 0, Math.PI * 2);
        bgCtx.fillStyle = '#060606'; 
        bgCtx.fill();

        // Bezel Rings with Varied Gradient
        // Ring 1
        let grad = bgCtx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, '#5F6A72');
        grad.addColorStop(0.4, '#090E13');
        bgCtx.beginPath();
        bgCtx.arc(50, 50, 48, 0, Math.PI * 2);
        bgCtx.strokeStyle = grad;
        bgCtx.lineWidth = 1;
        bgCtx.stroke();

        // Ring 2
        grad = bgCtx.createLinearGradient(x1, y1, x2, y2); // Reuse vector
        grad.addColorStop(0, '#333F47');
        grad.addColorStop(0.4, '#090F14');
        bgCtx.beginPath();
        bgCtx.arc(50, 50, 46.3, 0, Math.PI * 2);
        bgCtx.strokeStyle = grad;
        bgCtx.lineWidth = 2.5;
        bgCtx.stroke();

        // Ring 3
        grad = bgCtx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, '#061119');
        grad.addColorStop(1, '#1F282F');
        bgCtx.beginPath();
        bgCtx.arc(50, 50, 44.4, 0, Math.PI * 2);
        bgCtx.strokeStyle = grad;
        bgCtx.lineWidth = 1.5;
        bgCtx.stroke();

        // Inner Static Rings
        bgCtx.beginPath();
        bgCtx.arc(50, 50, 41.9, 0, Math.PI * 2);
        bgCtx.strokeStyle = '#040910';
        bgCtx.lineWidth = 1.5;
        bgCtx.stroke();
        
        // Ring 4 (Inner) - Vary this too?
        // Originally vertical gradient (50,0 to 50,100).
        // Let's vary it slightly too.
        grad = bgCtx.createLinearGradient(50 + (factor-0.5)*20, 0, 50 - (factor-0.5)*20, 100);
        grad.addColorStop(0, '#CCC');
        grad.addColorStop(0.75, '#040910');
        bgCtx.beginPath();
        bgCtx.arc(50, 50, 40.5, 0, Math.PI * 2);
        bgCtx.strokeStyle = grad;
        bgCtx.lineWidth = 1;
        bgCtx.stroke();

        // Ticks
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

        // Center Pivot
        grad = bgCtx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, '#4D565B');
        grad.addColorStop(1, '#0C0E12');
        bgCtx.beginPath();
        bgCtx.arc(gcx, gcy, 5, 0, Math.PI * 2);
        bgCtx.fillStyle = '#040910';
        bgCtx.fill();
        bgCtx.strokeStyle = grad;
        bgCtx.lineWidth = 0.75;
        bgCtx.stroke();

        bgCtx.save();
        bgCtx.filter = 'blur(0.5px)';
        bgCtx.beginPath();
        bgCtx.arc(gcx, gcy, 2, 0, Math.PI * 2);
        bgCtx.fillStyle = '#333';
        bgCtx.fill();
        bgCtx.restore();
        bgCtx.beginPath();
        bgCtx.arc(gcx, gcy, 1, 0, Math.PI * 2);
        bgCtx.fillStyle = '#222';
        bgCtx.fill();

        backgrounds.push(bgCanvas);


        // --- Glass Variation ---
        const { canvas: glassCanvas, ctx: glassCtx } = createCanvas();
        glassCtx.scale(scale, scale);
        
        // Glare: Rotate slightly based on factor
        // Base -25 deg. Variation +/- 10 deg.
        const glareRot = -25 + (factor - 0.5) * 20; 
        
        glassCtx.save();
        glassCtx.translate(50, 50);
        glassCtx.rotate(glareRot * Math.PI / 180);
        glassCtx.translate(-50, -50);
        
        const glarePath = new Path2D("M 50 8.1 A 41.9 41.9 0 0 1 91.9 50 A 45 45 0 0 0 50 30 A 45 45 0 0 0 8.1 50 A 41.9 41.9 0 0 1 50 8.1 Z");
        grad = glassCtx.createLinearGradient(50, 8, 50, 32); 
        grad.addColorStop(0, 'rgba(255,255,255,0.25)'); 
        grad.addColorStop(1, 'rgba(255,255,255,0)'); 
        glassCtx.fillStyle = grad;
        glassCtx.fill(glarePath);
        glassCtx.restore();

        // Reflection: Rotate gradient vector
        // Base 0,0 to 100,100.
        // We can use the same rotated vector as background for consistency
        grad = glassCtx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255,255,255,0.15)'); 
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,0.05)'); 
        glassCtx.beginPath();
        glassCtx.arc(50, 50, 41.9, 0, Math.PI * 2);
        glassCtx.fillStyle = grad;
        glassCtx.fill();

        // Specular: Move center slightly
        // Base cx=20 cy=20.
        // Shift +/- 5 units.
        const specX = 20 + (factor - 0.5) * 10;
        const specY = 20; // Keep Y mostly static or vary too
        const rGrad = glassCtx.createRadialGradient(specX, specY, 0, specX, specY, 60);
        rGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
        rGrad.addColorStop(1, 'rgba(255,255,255,0)');
        glassCtx.beginPath();
        glassCtx.arc(50, 50, 41.9, 0, Math.PI * 2);
        glassCtx.fillStyle = rGrad;
        glassCtx.fill();

        glasses.push(glassCanvas);
    }

    return {
        backgrounds,
        glasses,
        needle: needleCanvas
    };
}
