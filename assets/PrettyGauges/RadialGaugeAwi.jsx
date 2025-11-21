import React from 'react';
import numbro from 'numbro';

var rad = Math.PI / 180;

export default class RadialGaugeAwi extends React.Component {
  static defaultProps = {
    min: 0,
    max: 100,
    value: 0,
    width: 400,
    height: 320,
    color: '#fe0400',
    backgroundColor: "#edebeb",
    valueLabelStyle: {
      textAnchor: "middle",
      fill: "#010101",
      stroke: "none",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: 'bold',
      fontStretch: 'normal',
      fontSize: 36,
      lineHeight: 'normal',
      fillOpacity: 1
    },
    minMaxLabelStyle: {
      textAnchor: "middle",
      fill: "#999999",
      stroke: "none",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: 'normal',
      fontStretch: 'normal',
      fontSize: 20,
      lineHeight: 'normal',
      fillOpacity: 1
    }
  };

  _getRxRy = (r, value) => {
    if (value < this.props.min) value = this.props.min;
    if (value > this.props.max) value = this.props.max;

    let dx = 0;
    let dy = 0;

    let alpha = (1 - (value - this.props.min) / (this.props.max - this.props.min)) * Math.PI;
    let R = this.props.width / 2 * r;

    let Cx = this.props.width / 2 + dx;
    let Cy = this.props.height / 1.5 + dy;

    let Rx = this.props.width / 2 + dx + R * Math.cos(alpha);
    let Ry = this.props.height - (this.props.height - Cy) - R * Math.sin(alpha);

    return { alpha, Cx, Cy, Rx, Ry };
  };

  _getPathValues = (value) => {
    if (value < this.props.min) value = this.props.min;
    if (value > this.props.max) value = this.props.max;

    let dx = 0;
    let dy = 0;

    let alpha = (1 - (value - this.props.min) / (this.props.max - this.props.min)) * Math.PI;
    let Ro = this.props.width / 2 - this.props.width / 10;
    let Ri = Ro - this.props.width / 6.666666666666667;

    let Cx = this.props.width / 2 + dx;
    let Cy = this.props.height / 1.5 + dy;

    let Xo = this.props.width / 2 + dx + Ro * Math.cos(alpha);
    let Yo = this.props.height - (this.props.height - Cy) - Ro * Math.sin(alpha);
    let Xi = this.props.width / 2 + dx + Ri * Math.cos(alpha);
    let Yi = this.props.height - (this.props.height - Cy) - Ri * Math.sin(alpha);

    return { alpha, Ro, Ri, Cx, Cy, Xo, Yo, Xi, Yi };
  };

  _getPath = (value) => {
    let { Ro, Ri, Cx, Cy, Xo, Yo, Xi, Yi } = this._getPathValues(value);

    let path = "M" + (Cx - Ri) + "," + Cy + " ";
    path += "L" + (Cx - Ro) + "," + Cy + " ";
    path += "A" + Ro + "," + Ro + " 0 0 1 " + Xo + "," + Yo + " ";
    path += "L" + Xi + "," + Yi + " ";
    path += "A" + Ri + "," + Ri + " 0 0 0 " + (Cx - Ri) + "," + Cy + " ";
    path += "Z ";

    return path;
  };

  _getPathValuesFrom_r1_r2_v = (r1, r2, value) => {
    if (value < this.props.min) value = this.props.min;
    if (value > this.props.max) value = this.props.max;

    let dx = 0;
    let dy = 0;

    let alpha = (1 - (value - this.props.min) / (this.props.max - this.props.min)) * Math.PI;
    let Ri = this.props.width / 2 * r1;
    let Ro = this.props.width / 2 * r2;

    let Cx = this.props.width / 2 + dx;
    let Cy = this.props.height / 1.5 + dy;

    let Xo = this.props.width / 2 + dx + Ro * Math.cos(alpha);
    let Yo = this.props.height - (this.props.height - Cy) - Ro * Math.sin(alpha);
    let Xi = this.props.width / 2 + dx + Ri * Math.cos(alpha);
    let Yi = this.props.height - (this.props.height - Cy) - Ri * Math.sin(alpha);

    return { alpha, Ro, Ri, Cx, Cy, Xo, Yo, Xi, Yi };
  };

  _getPathValuesFrom_v1_v2 = (value1, value2) => {
    if (value1 < this.props.min) value1 = this.props.min;
    if (value1 > this.props.max) value1 = this.props.max;
    if (value2 < this.props.min) value2 = this.props.min;
    if (value2 > this.props.max) value2 = this.props.max;

    let dx = 0;
    let dy = 0;

    let alpha1 = (1 - (value1 - this.props.min) / (this.props.max - this.props.min)) * Math.PI;
    let alpha2 = (1 - (value2 - this.props.min) / (this.props.max - this.props.min)) * Math.PI;
    let Ro = this.props.width / 2 - this.props.width / 10;
    let Ri = Ro - this.props.width / 6.666666666666667;

    let Cx = this.props.width / 2 + dx;
    let Cy = this.props.height / 1.5 + dy;

    let X1o = this.props.width / 2 + dx + Ro * Math.cos(alpha1);
    let Y1o = this.props.height - (this.props.height - Cy) - Ro * Math.sin(alpha1);
    let X1i = this.props.width / 2 + dx + Ri * Math.cos(alpha1);
    let Y1i = this.props.height - (this.props.height - Cy) - Ri * Math.sin(alpha1);

    let X2o = this.props.width / 2 + dx + Ro * Math.cos(alpha2);
    let Y2o = this.props.height - (this.props.height - Cy) - Ro * Math.sin(alpha2);
    let X2i = this.props.width / 2 + dx + Ri * Math.cos(alpha2);
    let Y2i = this.props.height - (this.props.height - Cy) - Ri * Math.sin(alpha2);

    return { alpha1, alpha2, Ro, Ri, Cx, Cy, X1o, Y1o, X1i, Y1i, X2o, Y2o, X2i, Y2i };
  };

  _getPathFrom_v1_v2 = (value1, value2) => {
    let { Ro, Ri, X1o, Y1o, X1i, Y1i, X2o, Y2o, X2i, Y2i } = this._getPathValuesFrom_v1_v2(value1, value2);

    let path = "M" + X1i + "," + Y1i + " ";
    path += "L" + X1o + "," + Y1o + " ";
    path += "A" + Ro + "," + Ro + " 0 0 1 " + X2o + "," + Y2o + " ";
    path += "L" + X2i + "," + Y2i + " ";
    path += "A" + Ri + "," + Ri + " 0 0 0 " + X1i + "," + Y1i + " ";
    path += "Z ";

    return path;
  }

  _getPathValuesFrom_r1_r2_v1_v2 = (r1, r2, value1, value2) => {
    if (value1 < this.props.min) value1 = this.props.min;
    if (value1 > this.props.max) value1 = this.props.max;
    if (value2 < this.props.min) value2 = this.props.min;
    if (value2 > this.props.max) value2 = this.props.max;

    let dx = 0;
    let dy = 0;

    let alpha1 = (1 - (value1 - this.props.min) / (this.props.max - this.props.min)) * Math.PI;
    let alpha2 = (1 - (value2 - this.props.min) / (this.props.max - this.props.min)) * Math.PI;
    let Ri = this.props.width / 2 * r1;
    let Ro = this.props.width / 2 * r2;

    let Cx = this.props.width / 2 + dx;
    let Cy = this.props.height / 1.5 + dy;

    let X1o = this.props.width / 2 + dx + Ro * Math.cos(alpha1);
    let Y1o = this.props.height - (this.props.height - Cy) - Ro * Math.sin(alpha1);
    let X1i = this.props.width / 2 + dx + Ri * Math.cos(alpha1);
    let Y1i = this.props.height - (this.props.height - Cy) - Ri * Math.sin(alpha1);

    let X2o = this.props.width / 2 + dx + Ro * Math.cos(alpha2);
    let Y2o = this.props.height - (this.props.height - Cy) - Ro * Math.sin(alpha2);
    let X2i = this.props.width / 2 + dx + Ri * Math.cos(alpha2);
    let Y2i = this.props.height - (this.props.height - Cy) - Ri * Math.sin(alpha2);

    return { alpha1, alpha2, Ro, Ri, Cx, Cy, X1o, Y1o, X1i, Y1i, X2o, Y2o, X2i, Y2i };
  };

  _getPathFrom_r1_r2_v1_v2 = (r1, r2, value1, value2) => {
    let { Ro, Ri, X1o, Y1o, X1i, Y1i, X2o, Y2o, X2i, Y2i } = this._getPathValuesFrom_r1_r2_v1_v2(r1, r2, value1, value2);

    let path = "M" + X1i + "," + Y1i + " ";
    path += "L" + X1o + "," + Y1o + " ";
    path += "A" + Ro + "," + Ro + " 0 0 1 " + X2o + "," + Y2o + " ";
    path += "L" + X2i + "," + Y2i + " ";
    path += "A" + Ri + "," + Ri + " 0 0 0 " + X1i + "," + Y1i + " ";
    path += "Z ";

    return path;
  }

  render() {
    if (Number.isNaN(this.props.min) || Number.isNaN(this.props.max) || this.props.max <= this.props.min) {
      return (
        null
      )
    }

    let small = (this.props.width < 100 || this.props.height < 60);
    let valueLabelStyle = { ...this.props.valueLabelStyle, fontSize: (this.props.width / 6)};
    let minMaxLabelStyle = { ...this.props.minMaxLabelStyle, fontSize: Math.max(6, this.props.width / 16)};

    return (
      <svg height="100%" version="1.1" width="100%" xmlns="http://www.w3.org/2000/svg" style={{
        width: this.props.width,
        height: this.props.height,
        overflow: 'hidden',
        position: 'relative',
        left: 0,
        top: 0
      }}>
        {small ?
          <path fill={'silver'} stroke="none" d={this._getPathFrom_r1_r2_v1_v2(0.6, 0.9, this.props.min, this.props.max)} />
        : null}

        {this.props.colorRanges.map(({ from, to, color }) => {
          if (Number.isNaN(from) || Number.isNaN(to)) {
            return (
              null
            )
          }
          return (
            <path key={`${from}${to}${color}`} fill={color} stroke="none" d={this._getPathFrom_r1_r2_v1_v2(small ? 0.6 : 0.7, small ? 0.9 : 0.8, from, to)} />
          )
        })}

        {/* tick marks - major */}
        {
        !small && [0, 25, 50, 75, 100].map(num => {
          const { Xo, Yo, Xi, Yi } = this._getPathValuesFrom_r1_r2_v(0.65, 0.84, this.props.min + (this.props.max - this.props.min) * num / 100);
          return (
            <path key={num} d={`M${Xo},${Yo} L${Xi},${Yi}Z`} stroke="black" strokeWidth={this.props.width / 125} />
          )
        })
        }

        {/* tick marks - minor */}
        {
        !small && [5, 10, 15, 20, 30, 35, 40, 45, 55, 60, 65, 70, 80, 85, 90, 95].map(num => {
          const { Xo, Yo, Xi, Yi } = this._getPathValuesFrom_r1_r2_v(0.68, 0.82, this.props.min + (this.props.max - this.props.min) * num / 100);
          return (
            <path key={num} d={`M${Xo},${Yo} L${Xi},${Yi}Z`} stroke="black" strokeWidth={this.props.width / 175} />
          )
        })
        }

        {/* needle */}
        {(() => {
          const { Xo, Yo, Xi, Yi } = this._getPathValuesFrom_r1_r2_v(0, small ? 0.9 : 0.62, this.props.value)
          return (
            <path d={`M${Xi},${Yi - (small ? 1 : 0)} L${Xo},${Yo - (small ? 1 : 0)}`} stroke="blue" strokeWidth={Math.max(2, this.props.width / 125)} />
          )
        })()}

        {/* value label */}
        {!small &&
          <>
            <text x={this.props.width / 2} y={this.props.height / 1.4 + valueLabelStyle.fontSize} textAnchor="middle" style={valueLabelStyle}>
              { this.props.valueFormatted }
            </text>
          </>
        }

        {/* number label - min */}
        {(() => {
          const num = this.props.min
          const { Cx, Cy, Rx, Ry } = this._getRxRy(0.75, num)
          if (Number.isNaN(Rx)) {
            return null
          }
          return (
            <text x={Rx - this.props.width / 20} y={Ry + minMaxLabelStyle.fontSize} textAnchor="start" style={minMaxLabelStyle}>{
              numbro(num).format({ mantissa: this.props.mantissa })
            }</text>
          )
        })()}

        {/* number label - max */}
        {(() => {
          const num = this.props.max
          const { Cx, Cy, Rx, Ry } = this._getRxRy(0.75, num)
          if (Number.isNaN(Rx)) {
            return null
          }
          return (
            <text x={Rx + this.props.width / 20} y={Ry + minMaxLabelStyle.fontSize} textAnchor="end" style={minMaxLabelStyle}>{
              numbro(num).format({ mantissa: this.props.mantissa })
            }</text>
          )
        })()}

      </svg>
    );
  }
}
