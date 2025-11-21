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
    'Z',
  ].join(' ');

  return (
    <path d={pathData} fill={fill} />
  );
}

const RadialGauge = ({ min = 0, max = 100, value, label, units, size = 100, colorRanges = [] }) => {
  const minAngle = -70;
  const maxAngle = 70;
  const needleAngle = Math.min(
    Math.max(
      ((value - min) / (max - min)) * (maxAngle - minAngle) + minAngle,
      minAngle
    ),
    maxAngle
  );
  
  const baseFontSize = 16; // the font size for a short text
  const maxChars = 22;     // character count where scaling reaches minimum
  const minFontSize = 6;  // smallest allowable font size

  const computedFontSize = Math.max(
    minFontSize,
    baseFontSize - (label.length / maxChars) * (baseFontSize - minFontSize)
  );

  const [labelLine1, labelLine2] = label.includes('\n') ? label.split('\n') : [label, null];

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}>
      <circle cx="50" cy="50" r="48" fill="#ffffff66" />
      <circle cx="51.5" cy="51.5" r="45.5" stroke="#999895" strokeWidth="5" fill="none" />
      <circle cx="51" cy="51" r="44.5" stroke="#999895" strokeWidth="5" fill="none" />
      <circle cx="50" cy="50" r="48" stroke="black" strokeWidth="1" fill="none" />
      <circle cx="50" cy="50" r="46.75" stroke="url(#u01JRN9714WDMNZ7A067CDBVGXD)" strokeWidth="2" fill="none" />
      <circle cx="50" cy="50" r="44.75" stroke="url(#u01JRN9714WYJ50MCSHR0HQX6C8)" strokeWidth="2" fill="none" />
      <circle cx="50" cy="50" r="42.75" stroke="black" strokeWidth="2" fill="none" />
      <circle cx="50" cy="50" r="42.75" stroke="url(#u01JRN9714WDBRB7JCGWBY94CZN)" strokeWidth="1" fill="none" />
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
            d={describeArcPath(50, 50, 30, 38, fromAngle, toAngle)}
            fill={color}
          />
        )
      })}
      <path
        d={describeArcPath(50, 50, 30, 38, minAngle, maxAngle)}
        fill="none"
        stroke="#888888"
        strokeWidth={0.5}
      />
      <Needle cx={50} cy={50} r1={10} r2={37} angle={needleAngle} baseWidth={3} fill="black" />
      <text x="13" y="49" textAnchor="start" fontSize={10} fill="black">{min}</text>
      <text x="87" y="49" textAnchor="end" fontSize={10} fill="black">{max}</text>

      {labelLine2 ? (
        <>
          <text x="50" y="55" textAnchor="middle" fontSize={computedFontSize} fontWeight="bold" fill="black">
            {labelLine1}
          </text>
          <text x="50" y="63" textAnchor="middle" fontSize={computedFontSize} fontWeight="bold" fill="black">
            {labelLine2}
          </text>
        </>
      ) : (
        <text x="50" y="57" textAnchor="middle" dominantBaseline="middle" fontSize={computedFontSize} fontWeight="bold" fill="black">
          {label}
        </text>
      )}

      <text x="50" y="77" textAnchor="middle" fontSize="16" fontWeight="bold" fill="black">
        {value}
      </text>
      <text x="50" y="86" textAnchor="middle" fontSize="7" fontWeight="bold" fill="black">
        {units}
      </text>
    </svg>
  )
}

export default RadialGauge
