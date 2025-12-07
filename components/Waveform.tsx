import React, { useEffect, useRef } from 'react';

interface WaveformProps {
  intensity: number; // 0 to 1
  active: boolean;
}

const Waveform: React.FC<WaveformProps> = ({ intensity, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      // Resize
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!active) return;

      const baseAmplitude = 20 + (intensity * 100);
      const frequency = 0.02;
      const speed = 0.1;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(100, 200, 255, ${0.3 + intensity})`;
      ctx.lineWidth = 2 + intensity * 3;

      for (let x = 0; x < width; x++) {
        const y = centerY + Math.sin(x * frequency + phase) * baseAmplitude * Math.sin(x / width * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Second wave for depth
      ctx.beginPath();
      ctx.strokeStyle = `rgba(200, 100, 255, ${0.3 + intensity})`;
      for (let x = 0; x < width; x++) {
        const y = centerY + Math.sin(x * (frequency * 1.5) + phase * 1.2) * (baseAmplitude * 0.7) * Math.sin(x / width * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += speed + (intensity * 0.2);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [intensity, active]);

  return <canvas ref={canvasRef} className="w-full h-32" />;
};

export default Waveform;