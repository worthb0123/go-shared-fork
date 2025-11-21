import React from 'react';

const RadialGaugeSVGDefs = () => {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Needle */}
        <linearGradient id="u01JRN9714WS1C8ZAJSPP7QFZKK" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#666" />
          <stop offset="70%" stopColor="white" />
          <stop offset="100%" stopColor="#666" />
        </linearGradient>

        {/* RadialGauge */}
        <linearGradient id="u01JRN9714WDMNZ7A067CDBVGXD" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C7C5C1" />
          <stop offset="100%" stopColor="#4D4E4A" />
        </linearGradient>
        <linearGradient id="u01JRN9714WYJ50MCSHR0HQX6C8" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4D4E4A" />
          <stop offset="100%" stopColor="#C7C5C1" />
        </linearGradient>
        <linearGradient id="u01JRN9714WDBRB7JCGWBY94CZN" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#313332" />
          <stop offset="100%" stopColor="#5D605C" />
        </linearGradient>

        {/* RadialGaugeDark */}
        <linearGradient id="u01JRN9714WNYB1BC7FGQ5G6WDA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#888" />
          <stop offset="20%" stopColor="#222" />
          <stop offset="100%" stopColor="#0A0A08" />
        </linearGradient>
        <linearGradient id="u01JRN9714W674MZ8PRBQS86D1T" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1F1F1D" />
          <stop offset="50%" stopColor="#121110" />
          <stop offset="100%" stopColor="#0F0F0D" />
        </linearGradient>
        <linearGradient id="u01JRN9714WJBDJ2KYXVBC3GX20" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#090B08" />
          <stop offset="50%" stopColor="#0C0E0B" />
          <stop offset="100%" stopColor="#1E1E1E" />
        </linearGradient>
        <linearGradient id="u01JRN9714WHM31J636SXKMFPMY" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#090B08" />
          <stop offset="100%" stopColor="#333" />
        </linearGradient>

        {/* RadialGaugeDark2 */}
          <linearGradient id="u01JRPTFJ0H386E2TY2F09DQTXD" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5F6A72" />
            <stop offset="40%" stopColor="#090E13" />
          </linearGradient>
          <linearGradient id="u01JRPTFJ0HGA59PQZW3HV70NFG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#333F47" />
            <stop offset="40%" stopColor="#090F14" />
          </linearGradient>
          <linearGradient id="u01JRPTFJ0GFVTAKJXF2D1QSMK" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#061119" />
            <stop offset="100%" stopColor="#1F282F" />
          </linearGradient>
          <linearGradient id="u01JRPTFJ0J5SDS8D17V29QAVDA" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#CCC" />
            <stop offset="75%" stopColor="#040910" />
          </linearGradient>
          <linearGradient id="u01JRPTFJ0JXAQ5G2AM22E9V5PJ" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4D565B" />
            <stop offset="100%" stopColor="#0C0E12" />
          </linearGradient>
      </defs>
    </svg>
  );
}

export default RadialGaugeSVGDefs;
