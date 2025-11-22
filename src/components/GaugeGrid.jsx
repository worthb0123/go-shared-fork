import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Grid } from 'react-window';
import Gauge from './Gauge';

const Cell = ({ columnIndex, rowIndex, style, data, configs, columnCount, itemCount, leftOffset, itemSize }) => {
  const index = rowIndex * columnCount + columnIndex;

  if (index >= itemCount) {
    return null;
  }

  const val = data[index] ?? 0;
  const config = configs[index] || {};
  
  const itemStyle = {
    ...style,
    left: style.left + leftOffset,
    width: itemSize,
    height: itemSize,
  };

  return (
    <div style={itemStyle}>
      <Gauge
        value={val}
        min={config.displayMin ?? 0}
        max={config.displayMax ?? 100}
        label={`#${index}`}
        size={itemSize}
        color={config.color || '#f59e0b'}
      />
    </div>
  );
};

const GaugeGrid = ({
  itemCount = 0,
  itemSize = 200,
  gap = 16,
  height = 800,
  data = [],
  configs = [],
  tick = 0
}) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const columnCount = Math.max(1, Math.floor((width + gap) / (itemSize + gap)));
  const rowCount = Math.ceil(itemCount / columnCount);
  
  const contentWidth = columnCount * (itemSize + gap) - gap;
  const leftOffset = Math.max(0, (width - contentWidth) / 2);

  // Pass all dependencies via cellProps
  // Note: we spread this object into Cell props, so we name the keys matching Cell props
  const cellProps = useMemo(() => ({
    data,
    configs,
    columnCount,
    itemCount,
    leftOffset,
    itemSize,
    tick
  }), [data, configs, columnCount, itemCount, leftOffset, itemSize, tick]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: height }}>
        {width > 0 && (
          <Grid
            columnCount={columnCount}
            columnWidth={itemSize + gap}
            height={height}
            rowCount={rowCount}
            rowHeight={itemSize + gap}
            width={width}
            cellProps={cellProps}
            cellComponent={Cell}
          />
        )}
    </div>
  );
};

export default GaugeGrid;
