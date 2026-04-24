import React, { useState, useRef, useCallback, useEffect } from 'react';

function hsvToRgb(h: number, s: number, v: number) {
  s /= 100; v /= 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: Math.round(max === 0 ? 0 : (d / max) * 100), v: Math.round(max * 100) };
}

function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToRgb(hslStr: string) {
  const parts = hslStr.match(/(\d+\.?\d*)/g);
  if (!parts || parts.length < 3) return { r: 100, g: 100, b: 255 };
  let h = parseFloat(parts[0]) / 360;
  let s = parseFloat(parts[1]) / 100;
  let l = parseFloat(parts[2]) / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

interface Props {
  value: string; // HSL string like "217 91% 60%"
  onChange: (hsl: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  const { r: iR, g: iG, b: iB } = hslToRgb(value);
  const iHsv = rgbToHsv(iR, iG, iB);

  const [hue, setHue] = useState(iHsv.h);
  const [sat, setSat] = useState(iHsv.s / 100);
  const [bri, setBri] = useState(iHsv.v / 100);
  const [rgb, setRgb] = useState({ r: iR, g: iG, b: iB });

  const squareRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingSquare = useRef(false);
  const draggingHue = useRef(false);

  const applyHSV = useCallback((h: number, s: number, v: number) => {
    const newRgb = hsvToRgb(h, s * 100, v * 100);
    setRgb(newRgb);
    onChange(rgbToHsl(newRgb.r, newRgb.g, newRgb.b));
  }, [onChange]);

  const handleSquare = useCallback((e: MouseEvent | TouchEvent) => {
    if (!squareRef.current) return;
    const rect = squareRef.current.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (cy - rect.top) / rect.height));
    setSat(x); setBri(1 - y);
    applyHSV(hue, x, 1 - y);
  }, [hue, applyHSV]);

  const handleHue = useCallback((e: MouseEvent | TouchEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    const newHue = Math.round(x * 360);
    setHue(newHue);
    applyHSV(newHue, sat, bri);
  }, [sat, bri, applyHSV]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingSquare.current) handleSquare(e);
      if (draggingHue.current) handleHue(e);
    };
    const onUp = () => { draggingSquare.current = false; draggingHue.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [handleSquare, handleHue]);

  const pickerColor = `hsl(${hue}, 100%, 50%)`;

  return (
    <div className="space-y-3 w-full">
      {/* Saturation/Brightness square */}
      <div
        ref={squareRef}
        className="relative w-full h-44 rounded-xl cursor-crosshair select-none overflow-hidden shadow-inner"
        style={{ background: `linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, ${pickerColor})` }}
        onMouseDown={(e) => { draggingSquare.current = true; handleSquare(e.nativeEvent); }}
        onTouchStart={(e) => handleSquare(e.nativeEvent)}
        onTouchMove={(e) => handleSquare(e.nativeEvent)}
      >
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-1 ring-black/30"
          style={{ left: `${sat * 100}%`, top: `${(1 - bri) * 100}%` }}
        />
      </div>

      {/* Preview + Hue slider */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-border shrink-0 shadow-md"
          style={{ backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }}
        />
        <div
          ref={hueRef}
          className="flex-1 h-4 rounded-full cursor-pointer relative select-none shadow-inner"
          style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
          onMouseDown={(e) => { draggingHue.current = true; handleHue(e.nativeEvent); }}
          onTouchStart={(e) => handleHue(e.nativeEvent)}
          onTouchMove={(e) => handleHue(e.nativeEvent)}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none"
            style={{ left: `${(hue / 360) * 100}%`, backgroundColor: pickerColor }}
          />
        </div>
      </div>

      {/* RGB Inputs */}
      <div className="grid grid-cols-3 gap-2">
        {(['r', 'g', 'b'] as const).map((ch) => (
          <div key={ch} className="flex flex-col items-center gap-1">
            <input
              type="number"
              min="0"
              max="255"
              value={rgb[ch]}
              onChange={(e) => {
                const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                const newRgb = { ...rgb, [ch]: val };
                setRgb(newRgb);
                const hsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
                setHue(hsv.h); setSat(hsv.s / 100); setBri(hsv.v / 100);
                onChange(rgbToHsl(newRgb.r, newRgb.g, newRgb.b));
              }}
              className="w-full text-center text-sm bg-muted border border-border rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground font-semibold uppercase">{ch}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
