import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check, PenTool } from 'lucide-react';

export const SignaturePadCanvas: React.FC<{
  onConfirmSignature: (params: {
    signerName: string;
    signerDni: string;
    dataUrl: string;
  }) => void;
  disabled?: boolean;
}> = ({ onConfirmSignature, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');

  // Inicializar o limpiar el canvas preservando el fondo blanco
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: ((e.touches[0].clientX - rect.left) * canvas.width) / rect.width,
        y: ((e.touches[0].clientY - rect.top) * canvas.height) / rect.height,
      };
    }
    const me = e as React.MouseEvent;
    return {
      x: ((me.clientX - rect.left) * canvas.width) / rect.width,
      y: ((me.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasStroke(true);
  };

  const moveDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    initCanvas();
    setHasStroke(false);
  };

  const handleConfirm = () => {
    if (!signerName.trim()) return;
    const canvas = canvasRef.current;
    const dataUrl =
      canvas && hasStroke
        ? canvas.toDataURL('image/png')
        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    onConfirmSignature({
      signerName: signerName.trim(),
      signerDni: signerDni.trim(),
      dataUrl,
    });
  };

  return (
    <div className="flex flex-col h-full space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <PenTool className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Firma manuscrita en pantalla (con el dedo o lápiz táctil)</span>
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 shadow-2xs shrink-0 cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5 text-rose-600" /> Borrar trazo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre y apellidos del firmante *
          </label>
          <input
            type="text"
            required
            value={signerName}
            disabled={disabled}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Ej. Juan Pérez (Cliente o receptor)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            DNI / NIF (Opcional)
          </label>
          <input
            type="text"
            value={signerDni}
            disabled={disabled}
            onChange={(e) => setSignerDni(e.target.value)}
            placeholder="Ej. 12345678Z"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* ÁREA DE FIRMA ESPACIOSA PARA PANTALLAS TÁCTILES */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[220px] sm:min-h-[280px] border-2 border-dashed border-blue-300 rounded-2xl bg-white overflow-hidden relative shadow-inner flex flex-col justify-center"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onMouseDown={startDrawing}
          onMouseMove={moveDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={moveDrawing}
          onTouchEnd={stopDrawing}
          className="w-full h-full min-h-[220px] sm:min-h-[280px] cursor-crosshair touch-none select-none bg-white"
        />
        {!hasStroke && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none px-4 text-center">
            <span className="text-sm font-semibold text-slate-500">✍️ Firme aquí dentro con el dedo</span>
            <span className="text-xs text-slate-400 mt-1">El espacio es amplio para firmar cómodamente</span>
            <div className="w-3/4 border-b border-dashed border-slate-300 mt-6" />
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-slate-500 leading-snug">
          Al pulsar confirmar, la firma quedará registrada de forma proporcional en el parte oficial y en el PDF exportable.
        </p>
        <button
          type="button"
          disabled={disabled || !signerName.trim() || !hasStroke}
          onClick={handleConfirm}
          data-testid="btn-save-signature"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md cursor-pointer shrink-0"
        >
          <Check className="w-4 h-4" /> Guardar y Confirmar Firma
        </button>
      </div>
    </div>
  );
};
