export function colorWithOpacity(color: string, opacity: number) {
  const parsed = parseColor(color);
  const alpha = Math.min(1, Math.max(0, opacity));
  if (!parsed) return color;
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
}

export function parseColor(color: string) {
  const hex = color.trim();
  const shortHex = /^#([0-9a-f]{3})$/i.exec(hex);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('').map((value) => parseInt(value + value, 16));
    return { r, g, b, alpha: 1, hex: rgbToHex(r, g, b) };
  }
  const longHex = /^#([0-9a-f]{6})$/i.exec(hex);
  if (longHex) {
    const value = longHex[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return { r, g, b, alpha: 1, hex: rgbToHex(r, g, b) };
  }
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/i.exec(hex);
  if (!rgba) return null;
  const r = Number(rgba[1]);
  const g = Number(rgba[2]);
  const b = Number(rgba[3]);
  return { r, g, b, alpha: rgba[4] === undefined ? 1 : Number(rgba[4]), hex: rgbToHex(r, g, b) };
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
}
