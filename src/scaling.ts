export const VIEWPORT_BORDER_PX = 4;
export const FALLBACK_CELL_SCALE = {
  width: 0.6,
  height: 1.2,
};

export const calculateFontSize = (
  containerW: number,
  containerH: number,
  cellScale: { width: number; height: number },
  cols: number,
  rows: number,
  borderPx = VIEWPORT_BORDER_PX,
) => {
  const usableW = Math.max(0, containerW - borderPx);
  const usableH = Math.max(0, containerH - borderPx);
  const maxByWidth = usableW / (cols * cellScale.width);
  const maxByHeight = usableH / (rows * cellScale.height);

  return Math.max(1, Math.floor(Math.min(maxByWidth, maxByHeight)));
};

export const calculateTerminalViewport = (
  fontSize: number,
  cellScale: { width: number; height: number },
  cols: number,
  rows: number,
  borderPx = VIEWPORT_BORDER_PX,
) => ({
  width: Math.round(fontSize * cols * cellScale.width) + borderPx,
  height: Math.round(fontSize * rows * cellScale.height) + borderPx,
});

export const calculateTerminalFit = (
  containerW: number,
  containerH: number,
  cellScale: { width: number; height: number },
  cols: number,
  rows: number,
  borderPx = VIEWPORT_BORDER_PX,
) => {
  const fontSize = calculateFontSize(
    containerW,
    containerH,
    cellScale,
    cols,
    rows,
    borderPx,
  );

  return {
    fontSize,
    ...calculateTerminalViewport(fontSize, cellScale, cols, rows, borderPx),
  };
};