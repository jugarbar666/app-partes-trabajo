import React, { useRef, useState, useEffect } from 'react';
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <PenTool className="w-4 h-4 text-blue-600" />
          <span>Captura de firma manuscrita del cliente en pantalla (Opcional al finalizar)</span>
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={disabled}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700"
        >
          <Eraser className="w-3.5 h-3.5" /> Borrar y repetir trazo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre y apellidos de quien firma *
          </label>
          <input
            type="text"
            value={signerName}
            disabled={disabled}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Ej. Julián Gómez (Conserje / Cliente)"
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            DNI / NIE (Opcional)
          </label>
          <input
            type="text"
            value={signerDni}
            disabled={disabled}
            onChange={(e) => setSignerDni(e.target.value)}
            placeholder="Ej. 12345678Z"
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
          />
        </div>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={560}
          height={160}
          onMouseDown={startDrawing}
          onMouseMove={moveDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={moveDrawing}
          onTouchEnd={stopDrawing}
          className="w-full h-36 cursor-crosshair touch-none"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          Firma manuscrita simple vinculada al resumen y hash del contenido actual del parte (sin atribuir firma electrónica cualificada).
        </p>
        <button
          type="button"
          disabled={disabled || !signerName.trim()}
          onClick={handleConfirm}
          data-testid="btn-save-signature"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold"
        >
          <Check className="w-4 h-4" /> Confirmar firma del cliente
        </button>
      </div>
    </div>
  );
};
