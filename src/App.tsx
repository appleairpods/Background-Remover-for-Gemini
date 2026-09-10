/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Zap,
  Pipette,
  CheckCircle2,
  Download,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Crosshair,
  Sun,
  Moon,
  Info,
  Loader2,
} from 'lucide-react';

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Helper: RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Helper: Hex to RGB
function hexToRgb(hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Built-in sample images generated via canvas data URLs
function createSampleImage(type: 'white' | 'green' | 'black'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (type === 'white') {
    // Solid clean White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 640, 420);

    // Glowing badge in the center
    ctx.save();
    ctx.shadowColor = 'rgba(37, 99, 235, 0.25)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    // Outer rounded card
    const grad = ctx.createLinearGradient(180, 100, 460, 320);
    grad.addColorStop(0, '#1d4ed8');
    grad.addColorStop(0.5, '#2563eb');
    grad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.roundRect(180, 85, 280, 250, 28);
    ctx.fill();
    ctx.restore();

    // Inner icon: Lightning bolt
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(330, 125);
    ctx.lineTo(260, 220);
    ctx.lineTo(310, 220);
    ctx.lineTo(290, 295);
    ctx.lineTo(380, 200);
    ctx.lineTo(330, 200);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PURE ERASER', 320, 310);
  } else if (type === 'green') {
    // Solid Emerald Green background
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, 0, 640, 420);

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(190, 85, 260, 250, 32);
    ctx.fill();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(320, 195, 110, 40, Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();

    const pGrad = ctx.createRadialGradient(305, 180, 10, 320, 195, 60);
    pGrad.addColorStop(0, '#60a5fa');
    pGrad.addColorStop(1, '#2563eb');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(320, 195, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHROMA GREEN', 320, 290);
    ctx.restore();
  } else {
    // Pure Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 640, 420);

    ctx.save();
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(320, 190, 80, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(320, 190, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DARK LOGO', 320, 325);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}

export default function App() {
  // Image & canvas state
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageName, setImageName] = useState<string>('sample_white_bg.png');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [targetColor, setTargetColor] = useState<RGBColor>({ r: 255, g: 255, b: 255 });
  const [tolerance, setTolerance] = useState<number>(35);
  const [edgeFeather, setEdgeFeather] = useState<number>(2);
  const [isPickingColor, setIsPickingColor] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Ready to export');
  const [checkerboardTheme, setCheckerboardTheme] = useState<'dark' | 'light'>('dark');
  const [hoverColor, setHoverColor] = useState<RGBColor | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  // References
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const processingRafRef = useRef<number | null>(null);

  // Keep latest refs to prevent stale closures
  const toleranceRef = useRef<number>(tolerance);
  toleranceRef.current = tolerance;

  const edgeFeatherRef = useRef<number>(edgeFeather);
  edgeFeatherRef.current = edgeFeather;

  // Ultra-fast client-side pixel manipulation using Canvas 2D
  const applyBackgroundRemoval = useCallback(
    (
      origImgData: ImageData,
      target: RGBColor,
      tol: number,
      feather: number,
      destCanvas: HTMLCanvasElement
    ) => {
      setIsProcessing(true);

      if (processingRafRef.current !== null) {
        cancelAnimationFrame(processingRafRef.current);
      }

      processingRafRef.current = requestAnimationFrame(() => {
        try {
          const width = origImgData.width;
          const height = origImgData.height;

          if (destCanvas.width !== width || destCanvas.height !== height) {
            destCanvas.width = width;
            destCanvas.height = height;
          }

          const destCtx = destCanvas.getContext('2d', { willReadFrequently: true });
          if (!destCtx) {
            setIsProcessing(false);
            return;
          }

          const outputImageData = destCtx.createImageData(width, height);
          const srcData = origImgData.data;
          const outData = outputImageData.data;

          // Copy original pixel buffer
          outData.set(srcData);

          const targetR = target.r;
          const targetG = target.g;
          const targetB = target.b;

          // Squared distance comparison avoids expensive Math.sqrt calls on millions of pixels
          const tolSq = tol * tol;
          const maxDist = tol + feather;
          const maxDistSq = maxDist * maxDist;

          if (feather === 0) {
            for (let i = 0; i < srcData.length; i += 4) {
              const a = srcData[i + 3];
              if (a === 0) {
                outData[i + 3] = 0;
                continue;
              }

              const diffR = srcData[i] - targetR;
              const diffG = srcData[i + 1] - targetG;
              const diffB = srcData[i + 2] - targetB;
              const diffSq = diffR * diffR + diffG * diffG + diffB * diffB;

              if (diffSq <= tolSq) {
                outData[i + 3] = 0;
              }
            }
          } else {
            for (let i = 0; i < srcData.length; i += 4) {
              const a = srcData[i + 3];
              if (a === 0) {
                outData[i + 3] = 0;
                continue;
              }

              const diffR = srcData[i] - targetR;
              const diffG = srcData[i + 1] - targetG;
              const diffB = srcData[i + 2] - targetB;
              const diffSq = diffR * diffR + diffG * diffG + diffB * diffB;

              if (diffSq <= tolSq) {
                outData[i + 3] = 0;
              } else if (diffSq < maxDistSq) {
                const dist = Math.sqrt(diffSq);
                const ramp = (dist - tol) / feather;
                outData[i + 3] = Math.round(a * Math.max(0, Math.min(1, ramp)));
              }
            }
          }

          destCtx.putImageData(outputImageData, 0, 0);
          setIsProcessing(false);
          setStatus('Ready to export');
        } catch (err) {
          console.error('Canvas processing error:', err);
          setIsProcessing(false);
          setStatus('Error processing');
        }
      });
    },
    []
  );

  // Load an image file or source data URL
  const loadImage = useCallback(
    (src: string, name: string = 'image.png') => {
      setIsProcessing(true);
      setStatus('Processing image...');
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          setImageDimensions({ width, height });
          setImageName(name);

          // Get canvases
          const sourceCanvas = sourceCanvasRef.current;
          const previewCanvas = previewCanvasRef.current;

          if (!sourceCanvas || !previewCanvas) {
            setIsProcessing(false);
            setStatus('Ready to export');
            return;
          }

          sourceCanvas.width = width;
          sourceCanvas.height = height;
          const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
          if (!srcCtx) {
            setIsProcessing(false);
            return;
          }

          srcCtx.clearRect(0, 0, width, height);
          srcCtx.drawImage(img, 0, 0);

          // Cache original pixel data
          const origData = srcCtx.getImageData(0, 0, width, height);
          originalImageDataRef.current = origData;

          // AUTOMATIC SAMPLING: top-left pixel (0, 0)
          const sampledColor: RGBColor = {
            r: origData.data[0],
            g: origData.data[1],
            b: origData.data[2],
          };
          setTargetColor(sampledColor);
          setImageLoaded(true);

          applyBackgroundRemoval(
            origData,
            sampledColor,
            toleranceRef.current,
            edgeFeatherRef.current,
            previewCanvas
          );
        } catch (err) {
          console.error('Failed to load image into canvas:', err);
          setIsProcessing(false);
          setStatus('Failed to load image');
        }
      };

      img.onerror = () => {
        setIsProcessing(false);
        setStatus('Failed to load image');
      };

      img.src = src;
    },
    [applyBackgroundRemoval]
  );

  // Load initial sample badge image on mount
  useEffect(() => {
    const sample = createSampleImage('white');
    loadImage(sample, 'pureeraser_badge_sample.png');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up animation frames
  useEffect(() => {
    return () => {
      if (processingRafRef.current !== null) {
        cancelAnimationFrame(processingRafRef.current);
      }
    };
  }, []);

  // Re-run background removal when targetColor, tolerance, or edgeFeather change
  useEffect(() => {
    if (imageLoaded && originalImageDataRef.current && previewCanvasRef.current) {
      applyBackgroundRemoval(
        originalImageDataRef.current,
        targetColor,
        tolerance,
        edgeFeather,
        previewCanvasRef.current
      );
    }
  }, [targetColor, tolerance, edgeFeather, imageLoaded, applyBackgroundRemoval]);

  // File picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          loadImage(event.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          loadImage(event.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Pick color by clicking anywhere on the source image canvas
  const handleSourceCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sourceCanvasRef.current;
    if (!canvas || !originalImageDataRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = Math.floor((e.clientX - rect.left) * scaleX);
    const clickY = Math.floor((e.clientY - rect.top) * scaleY);

    if (clickX >= 0 && clickX < canvas.width && clickY >= 0 && clickY < canvas.height) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const pixel = ctx.getImageData(clickX, clickY, 1, 1).data;
        const newColor: RGBColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
        setTargetColor(newColor);
        if (isPickingColor) {
          setIsPickingColor(false);
        }
      }
    }
  };

  // Eyedropper magnifier loupe when hovering
  const handleSourceCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sourceCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = Math.floor((e.clientX - rect.left) * scaleX);
    const mouseY = Math.floor((e.clientY - rect.top) * scaleY);

    if (mouseX >= 0 && mouseX < canvas.width && mouseY >= 0 && mouseY < canvas.height) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const pixel = ctx.getImageData(mouseX, mouseY, 1, 1).data;
        setHoverColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
        setHoverPos({ x: e.clientX, y: e.clientY });
      }
    } else {
      setHoverColor(null);
      setHoverPos(null);
    }
  };

  const handleSourceCanvasMouseLeave = () => {
    setHoverColor(null);
    setHoverPos(null);
  };

  // Export processed PNG
  const handleExportPNG = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !imageLoaded) return;

    const exportName = imageName
      ? imageName.replace(/\.[^/.]+$/, '') + '_transparent.png'
      : 'pureeraser_transparent.png';

    const link = document.createElement('a');
    link.download = exportName;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Clear All
  const handleClearAll = () => {
    setImageLoaded(false);
    setImageName('');
    setImageDimensions({ width: 0, height: 0 });
    originalImageDataRef.current = null;
    setTargetColor({ r: 255, g: 255, b: 255 });
    setTolerance(35);
    setIsPickingColor(false);
    setStatus('Upload an image to start');

    const srcCanvas = sourceCanvasRef.current;
    if (srcCanvas) {
      const ctx = srcCanvas.getContext('2d');
      ctx?.clearRect(0, 0, srcCanvas.width, srcCanvas.height);
    }

    const prevCanvas = previewCanvasRef.current;
    if (prevCanvas) {
      const ctx = prevCanvas.getContext('2d');
      ctx?.clearRect(0, 0, prevCanvas.width, prevCanvas.height);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const targetHex = rgbToHex(targetColor.r, targetColor.g, targetColor.b);

  return (
    <div
      id="pureeraser-app"
      className="flex flex-col lg:flex-row h-screen w-screen bg-[#070d18] text-slate-100 font-sans antialiased overflow-hidden select-none"
    >
      {/* Hidden file & native color picker inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="color"
        ref={colorInputRef}
        value={targetHex}
        onChange={(e) => {
          const rgb = hexToRgb(e.target.value);
          if (rgb) setTargetColor(rgb);
        }}
        className="hidden"
      />

      {/* =========================================================================
          LEFT SIDEBAR
          ========================================================================= */}
      <aside
        id="sidebar"
        className="w-full lg:w-84 xl:w-92 h-auto lg:h-full bg-[#0b1325] border-b lg:border-b-0 lg:border-r border-slate-800/90 flex flex-col flex-shrink-0 z-20 shadow-2xl overflow-y-auto"
      >
        {/* App Header with PureEraser Branding & Blue Lightning Bolt Icon */}
        <div id="app-header" className="p-5 border-b border-slate-800/80 bg-[#0d172e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
              <Zap className="w-5 h-5 fill-blue-400 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PureEraser
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Solid-Color Background Removal
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="p-5 flex-1 flex flex-col gap-5">
          {/* TARGET COLOR Section */}
          <div id="target-color-section" className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                TARGET COLOR
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {targetHex}
              </span>
            </div>

            <div className="bg-[#0f1b33] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 shadow-sm">
              {/* Color Swatch */}
              <div className="flex items-center gap-3">
                <button
                  id="color-swatch-button"
                  type="button"
                  title="Click to choose custom color"
                  onClick={() => colorInputRef.current?.click()}
                  className="w-11 h-11 rounded-lg border-2 border-slate-700 hover:border-blue-400 transition-all shadow-md relative overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: targetHex }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                    <span className="text-[10px] text-white opacity-0 group-hover:opacity-100 font-medium drop-shadow">
                      Edit
                    </span>
                  </div>
                </button>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white font-mono">
                    {targetHex}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    RGB({targetColor.r}, {targetColor.g}, {targetColor.b})
                  </span>
                </div>
              </div>

              {/* Pick Color Button with Eyedropper Icon */}
              <button
                id="pick-color-btn"
                type="button"
                onClick={() => setIsPickingColor((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isPickingColor
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-2 ring-blue-400'
                    : 'bg-[#182645] hover:bg-[#20325a] text-slate-200 border border-slate-700/80'
                }`}
                title="Click and then click anywhere on the source image to sample color"
              >
                <Pipette className="w-3.5 h-3.5 text-blue-400" />
                <span>{isPickingColor ? 'Sampling...' : 'Pick Color'}</span>
              </button>
            </div>

            {isPickingColor && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-[11px] text-blue-300">
                <Crosshair className="w-3.5 h-3.5 animate-pulse text-blue-400 flex-shrink-0" />
                <span>Click any pixel on the SOURCE IMAGE to sample</span>
              </div>
            )}
          </div>

          {/* TOLERANCE Section */}
          <div id="tolerance-section" className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                TOLERANCE
              </span>
              <span className="text-sm font-bold text-blue-400 font-mono">
                {tolerance}
              </span>
            </div>

            <div className="bg-[#0f1b33] p-4 rounded-xl border border-slate-800 flex flex-col gap-2.5 shadow-sm">
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
                <span>Euclidean Distance</span>
                <span className="font-mono text-slate-300">{tolerance} / 150</span>
              </div>

              {/* Slider Control showing numeric value above */}
              <input
                id="tolerance-slider"
                type="range"
                min="0"
                max="150"
                step="1"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              {/* STRICT and LOOSE labels at the ends */}
              <div className="flex justify-between items-center text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                <span
                  className="hover:text-slate-200 cursor-pointer"
                  onClick={() => setTolerance(10)}
                  title="Strict: Only exact matching colors removed"
                >
                  STRICT
                </span>
                <span
                  className="hover:text-slate-200 cursor-pointer"
                  onClick={() => setTolerance(35)}
                  title="Default tolerance (35)"
                >
                  DEFAULT
                </span>
                <span
                  className="hover:text-slate-200 cursor-pointer"
                  onClick={() => setTolerance(90)}
                  title="Loose: Wide color range removed"
                >
                  LOOSE
                </span>
              </div>
            </div>
          </div>

          {/* Edge Feathering Smoothing Control */}
          <div className="bg-[#0f1b33]/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-300">Edge Feathering</span>
              <span className="text-[11px] text-slate-400">Anti-aliasing boundary</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={edgeFeather}
                onChange={(e) => setEdgeFeather(Number(e.target.value))}
                className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
              />
              <span className="text-xs font-mono text-slate-400 w-5 text-right">{edgeFeather}px</span>
            </div>
          </div>

          {/* Preset Sample Quick-Pick */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Samples
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => loadImage(createSampleImage('white'), 'sample_white_bg.png')}
                className="px-2 py-1.5 rounded-lg bg-[#0f1b33] hover:bg-[#182645] border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="White Background sample"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400"></span>
                White
              </button>
              <button
                type="button"
                onClick={() => loadImage(createSampleImage('green'), 'sample_green_bg.png')}
                className="px-2 py-1.5 rounded-lg bg-[#0f1b33] hover:bg-[#182645] border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Green Screen sample"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                Green
              </button>
              <button
                type="button"
                onClick={() => loadImage(createSampleImage('black'), 'sample_black_bg.png')}
                className="px-2 py-1.5 rounded-lg bg-[#0f1b33] hover:bg-[#182645] border border-slate-800 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Black Background sample"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-black border border-slate-700"></span>
                Black
              </button>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-2" />

          {/* Status Indicator displaying "Ready to export" with Checkmark icon */}
          <div
            id="status-indicator"
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0e192f] border border-slate-800 text-xs font-medium text-slate-300"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-blue-300">Processing image...</span>
              </>
            ) : imageLoaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Ready to export</span>
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Upload an image to start</span>
              </>
            )}
          </div>

          {/* Prominent Blue "Export PNG" Button */}
          <button
            id="export-png-btn"
            type="button"
            disabled={!imageLoaded || isProcessing}
            onClick={handleExportPNG}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800/80 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 hover:shadow-blue-800/50 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export PNG</span>
          </button>

          {/* "Clear All" Button Below */}
          <button
            id="clear-all-btn"
            type="button"
            onClick={handleClearAll}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#0f1b33] hover:bg-slate-800/90 border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT SIDE: Divided into TWO EQUAL SECTIONS
          1. SOURCE IMAGE (Top)
          2. PREVIEW RESULT (Bottom)
          ========================================================================= */}
      <main id="main-content" className="flex-1 flex flex-col h-full bg-[#050914] overflow-hidden">
        {/* =======================================================================
            TOP SECTION: SOURCE IMAGE
            ======================================================================= */}
        <section
          id="source-image-section"
          className="flex-1 min-h-0 border-b border-slate-800/90 flex flex-col bg-[#070e1c] relative overflow-hidden"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Header Bar */}
          <div className="h-11 px-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0a1326] flex-shrink-0">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                SOURCE IMAGE
              </h2>
              {imageDimensions.width > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {imageDimensions.width} × {imageDimensions.height} px
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isPickingColor && (
                <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                  <Pipette className="w-3.5 h-3.5 animate-bounce" /> Click pixel to sample
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded-lg bg-[#14223f] hover:bg-[#1e325d] text-xs font-medium text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload New</span>
              </button>
            </div>
          </div>

          {/* Section Body */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 overflow-auto">
            {/* Drag Overlay */}
            {dragOver && (
              <div className="absolute inset-0 z-30 bg-blue-950/80 border-2 border-dashed border-blue-400 flex flex-col items-center justify-center text-white backdrop-blur-xs">
                <Upload className="w-12 h-12 text-blue-400 mb-2 animate-bounce" />
                <p className="text-sm font-semibold">Drop image here to load</p>
              </div>
            )}

            {/* The source canvas is ALWAYS rendered so sourceCanvasRef is NEVER null */}
            <div
              className={`relative max-w-full max-h-full flex items-center justify-center group ${
                !imageLoaded ? 'hidden' : ''
              }`}
            >
              {/* Eyedropper Magnifier Loupe */}
              {hoverColor && hoverPos && isPickingColor && (
                <div
                  className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-16 bg-slate-900/95 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xl flex items-center gap-2 backdrop-blur-md"
                  style={{ left: hoverPos.x, top: hoverPos.y }}
                >
                  <div
                    className="w-5 h-5 rounded-md border border-white/40 shadow-inner"
                    style={{ backgroundColor: rgbToHex(hoverColor.r, hoverColor.g, hoverColor.b) }}
                  />
                  <div className="flex flex-col text-[10px] font-mono leading-tight">
                    <span className="font-bold text-white">
                      {rgbToHex(hoverColor.r, hoverColor.g, hoverColor.b)}
                    </span>
                    <span className="text-slate-400">
                      {hoverColor.r}, {hoverColor.g}, {hoverColor.b}
                    </span>
                  </div>
                </div>
              )}

              <canvas
                id="source-canvas"
                ref={sourceCanvasRef}
                onClick={handleSourceCanvasClick}
                onMouseMove={handleSourceCanvasMouseMove}
                onMouseLeave={handleSourceCanvasMouseLeave}
                className={`max-w-full max-h-[calc(50vh-4rem)] object-contain rounded-lg shadow-xl border border-slate-800 ${
                  isPickingColor ? 'cursor-crosshair' : 'cursor-pointer'
                }`}
                title={isPickingColor ? 'Click to pick target color' : 'Click to sample color from this image'}
              />
            </div>

            {/* Empty state when no image loaded */}
            {!imageLoaded && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/60 bg-[#091224]/50 hover:bg-[#0d1a33]/60 transition-all cursor-pointer text-center max-w-md w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  Upload an image with solid background
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Drag & drop PNG, JPG, WebP here, or browse
                </p>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md shadow-blue-900/30 cursor-pointer"
                >
                  Choose Image File
                </button>
              </div>
            )}
          </div>
        </section>

        {/* =======================================================================
            BOTTOM SECTION: PREVIEW RESULT (with Checkerboard Pattern)
            ======================================================================= */}
        <section
          id="preview-result-section"
          className="flex-1 min-h-0 flex flex-col bg-[#070e1c] relative overflow-hidden"
        >
          {/* Header Bar */}
          <div className="h-11 px-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0a1326] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                PREVIEW RESULT
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                Transparent PNG
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Checkerboard Pattern Theme Switcher */}
              <div className="flex items-center bg-[#101b33] rounded-lg p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCheckerboardTheme('dark')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    checkerboardTheme === 'dark'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Dark checkerboard"
                >
                  <Moon className="w-3 h-3" />
                  <span>Dark Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCheckerboardTheme('light')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                    checkerboardTheme === 'light'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Light checkerboard"
                >
                  <Sun className="w-3 h-3" />
                  <span>Light Grid</span>
                </button>
              </div>

              {/* Quick Export icon button */}
              {imageLoaded && (
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download transparent PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              )}
            </div>
          </div>

          {/* Section Body: Transparent Preview on Checkerboard */}
          <div
            id="preview-canvas-container"
            className={`flex-1 min-h-0 relative flex items-center justify-center p-4 overflow-auto ${
              checkerboardTheme === 'dark' ? 'checkerboard-dark' : 'checkerboard-light'
            }`}
          >
            {/* The preview canvas is ALWAYS rendered in DOM so previewCanvasRef is NEVER null */}
            <div
              className={`relative max-w-full max-h-full flex items-center justify-center ${
                !imageLoaded ? 'hidden' : ''
              }`}
            >
              <canvas
                id="preview-canvas"
                ref={previewCanvasRef}
                className="max-w-full max-h-[calc(50vh-4rem)] object-contain rounded-lg shadow-2xl border border-slate-700/50"
                title="Processed image with transparent background"
              />

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center rounded-lg">
                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-2 shadow-xl">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-xs text-slate-200 font-medium">Updating preview...</span>
                  </div>
                </div>
              )}
            </div>

            {!imageLoaded && (
              <div className="text-center p-6 text-slate-400 text-xs">
                Processed result will appear here once an image is loaded.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
