import React from 'react';

const polarToCartesian = (cx, cy, r, angleDegrees) => {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRadians),
    y: cy + r * Math.sin(angleRadians),
  };
};

const describeArcPath = (cx, cy, r1, r2, startAngle, endAngle) => {
  const startOuter = polarToCartesian(cx, cy, r2, startAngle);
  const endOuter = polarToCartesian(cx, cy, r2, endAngle);
  const startInner = polarToCartesian(cx, cy, r1, endAngle);
  const endInner = polarToCartesian(cx, cy, r1, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${startOuter.x},${startOuter.y}`,
    `A ${r2},${r2} 0 ${largeArcFlag},1 ${endOuter.x},${endOuter.y}`,
    `L ${startInner.x},${startInner.y}`,
    `A ${r1},${r1} 0 ${largeArcFlag},0 ${endInner.x},${endInner.y}`,
    'Z',
  ].join(' ');
};

const Needle = ({ cx, cy, r1, r2, angle, baseWidth, fill }) => {
  const tip = polarToCartesian(cx, cy, r2, angle);
  const baseCenter = polarToCartesian(cx, cy, r1, angle);
  const baseLeft = polarToCartesian(baseCenter.x, baseCenter.y, baseWidth / 2, angle - 90);
  const baseRight = polarToCartesian(baseCenter.x, baseCenter.y, baseWidth / 2, angle + 90);

  const arcRadius = baseWidth;

  const pathData = [
    `M ${tip.x},${tip.y}`,
    `L ${baseLeft.x},${baseLeft.y}`,
    `A ${arcRadius},${arcRadius} 0 0,0 ${baseRight.x},${baseRight.y}`,
  ].join(' ');

  return (
    <path d={pathData} fill={fill} />
  );
}

const RadialGaugeDark2 = ({ min = 0, max = 100, value, label, units, size = 100, colorRanges = [] }) => {
  const minAngle = -100;
  const maxAngle = 100;
  const needleAngle = Math.min(
    Math.max(
      ((value - min) / (max - min)) * (maxAngle - minAngle) + minAngle,
      minAngle
    ),
    maxAngle
  );
  const gcx = 50;
  const gcy = 63;
  const gr1 = 27;
  const gr2 = 31;
  
  const baseFontSize = 10; // the font size for a short text
  const maxChars = 22;     // character count where scaling reaches minimum
  const minFontSize = 6;  // smallest allowable font size

  const computedFontSize = Math.max(
    minFontSize,
    baseFontSize - (label.length / maxChars) * (baseFontSize - minFontSize)
  );

  const [labelLine1, labelLine2] = label.includes('\n') ? label.split('\n') : [label, null];

  const activeColorRange = colorRanges.find(({ from, to }) => value >= from && value <= to);
  const circleStroke = activeColorRange ? activeColorRange.color : 'url(#u01JRPTFJ0J5SDS8D17V29QAVDA)';
  const glowId = React.useId();

  return (
    <div style={{ display: "inline-block", width: size, aspectRatio: '1 / 1' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          {activeColorRange && (
            <radialGradient id={glowId} cx={gcx} cy={gcy} r={gr2} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={activeColorRange.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={activeColorRange.color} stopOpacity="0" />
            </radialGradient>
          )}
        </defs>
        <circle cx="50" cy="50" r="48" stroke="none" fill="url(#01JRPTFJ0HQ0T310GM1MRCBFFX)" />
        <circle cx="50" cy="50" r="48" stroke="url(#u01JRPTFJ0H386E2TY2F09DQTXD)" strokeWidth="1" fill="none" />
        <circle cx="50" cy="50" r="46.3" stroke="url(#u01JRPTFJ0HGA59PQZW3HV70NFG)" strokeWidth="2.5" fill="none" />
        <circle cx="50" cy="50" r="44.4" stroke="url(#u01JRPTFJ0HGFVTAKJXF2D1QSMK)" strokeWidth="1.5" fill="none" />
        <circle cx="50" cy="50" r="41.9" stroke="#040910" strokeWidth="1.5" fill="none" />
        <circle cx="50" cy="50" r="40.5" stroke={circleStroke} strokeWidth="1" fill="none" />

        {activeColorRange && (
          <path
            d={describeArcPath(gcx, gcy, 0, gr2, minAngle, maxAngle)}
            fill={`url(#${glowId})`}
          />
        )}

        {colorRanges.map(({ from, to, color }, i) => {
          const fromAngle = Math.min(
            Math.max(
              ((from - min) / (max - min)) * (maxAngle - minAngle) + minAngle,
              minAngle
            ),
            maxAngle
          );
          const toAngle = Math.min(
            Math.max(
              ((to - min) / (max - min)) * (maxAngle - minAngle) + minAngle,
              minAngle
            ),
            maxAngle
          );
          return (
            <path
              key={i}
              d={`${describeArcPath(gcx, gcy, gr1 + (gr2 - gr1) / 2, gr2, fromAngle, toAngle)}Z`}
              fill={color}
            />
          )
        })}
        <path
          d={`
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle, minAngle + 1)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 20 - 0.5, minAngle + 20 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 40 - 0.5, minAngle + 40 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 60 - 0.5, minAngle + 60 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 80 - 0.5, minAngle + 80 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 100 - 0.5, minAngle + 100 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 120 - 0.5, minAngle + 120 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 140 - 0.5, minAngle + 140 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 160 - 0.5, minAngle + 160 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 180 - 0.5, minAngle + 180 + 0.5)}
            ${describeArcPath(gcx, gcy, gr1, gr2, minAngle + 200 - 1, minAngle + 200)}
          Z`}
          fill="#A9ABAF"
        />
        <circle cx={gcx} cy={gcy} r="5" stroke="url(#u01JRPTFJ0JXAQ5G2AM22E9V5PJ)" strokeWidth="0.75" fill="#040910" />
        <Needle cx={gcx} cy={gcy} r1={-4} r2={gr2-1} angle={needleAngle} baseWidth={2} fill="url(#u01JRN9714WS1C8ZAJSPP7QFZKK)" />
        <text x="24.5" y="71" textAnchor="start" fontSize={6} fill="#A9ABAF">
          {min}
        </text>
        <text x="75.5" y="71" textAnchor="end" fontSize={6} fill="#A9ABAF">
          {max}
        </text>

        {labelLine2 ? (
          <>
            <text x="50" y="23" textAnchor="middle" fontSize={computedFontSize} fontWeight="bold" fill="#E8E6E7">
              {labelLine1}
            </text>
            <text x="50" y="30" textAnchor="middle" fontSize={computedFontSize} fontWeight="bold" fill="#E8E6E7">
              {labelLine2}
            </text>
          </>
        ) : (
          <text x="50" y="28" textAnchor="middle" dominantBaseline="middle" fontSize={computedFontSize} fontWeight="bold" fill="#E8E6E7">
            {label}
          </text>
        )}

        <text x="50" y="79" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#A9ABAF">
          {value}
        </text>
        <text x="50" y="86" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#A9ABAF">
          {units}
        </text>
      </svg>
    </div>
  )
}

export default RadialGaugeDark2
