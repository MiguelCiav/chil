import React, { useState } from 'react';
import { ShieldAlert, Flame, Loader2 } from 'lucide-react';
import { Button } from './Button';

export const HolaAri: React.FC = () => {
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [loadingIp, setLoadingIp] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const fetchIp = async () => {
    setLoadingIp(true);
    try {
      const resp = await fetch('https://api.ipify.org?format=json');
      const data = await resp.json();
      setIpAddress(data.ip);
      setShowWarning(true);
    } catch (err) {
      console.error(err);
      setIpAddress('Desconocida 🇻🇪');
      setShowWarning(true);
    } finally {
      setLoadingIp(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center bg-gradient-to-br from-[#FFFBE6] via-[#FFEBEB] to-[#FFE6F2] py-12 px-6 overflow-hidden relative">
      
      {/* Decorative Floating Flames */}
      <div className="absolute bottom-12 left-16 text-[#FF4C4C] animate-pulse opacity-70">
        <Flame className="w-10 h-10 fill-current" />
      </div>
      <div className="absolute top-16 right-16 text-[#FF4C4C] animate-bounce duration-700 opacity-60">
        <Flame className="w-8 h-8 fill-current animate-pulse" />
      </div>

      <div className="max-w-xl w-full bg-white/70 backdrop-blur-md rounded-[32px] p-8 md:p-12 border border-white/50 shadow-xl flex flex-col items-center text-center space-y-8 relative z-10 transition-all duration-300 hover:shadow-2xl">
        
        {/* Banner Alert Icon */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
          <ShieldAlert className="w-4 h-4" />
          Alerta de Seguridad
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#5A3825] font-sans drop-shadow-sm">
            ¡Hola Ari! 💛
          </h1>
          <p className="text-xl md:text-2xl font-bold text-[#E53E3E] leading-relaxed drop-shadow-sm">
            no entres en enlaces engañosos
          </p>
        </div>

        {/* Generated Image Asset */}
        <div className="relative group">
          <div className="absolute inset-0 bg-[#FFD15C]/40 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
          <img
            src="/pompompurin_cheetos.jpg"
            alt="Pompompurin eating Flamin Hot Cheetos"
            className="w-72 h-72 md:w-80 md:h-80 object-contain rounded-3xl relative z-10 shadow-lg border-4 border-white transform transition-all duration-500 hover:scale-105 hover:rotate-2"
          />
        </div>

        {/* Interactive Button */}
        <div className="w-full flex flex-col items-center gap-4">
          <Button
            variant="primary"
            onClick={fetchIp}
            disabled={loadingIp}
            className="shadow-md hover:scale-105 transition-all bg-[#FF4C4C] hover:bg-[#E53E3E] border-none text-white font-bold px-6 py-3 rounded-full flex items-center gap-2"
            icon={loadingIp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
          >
            Toca para flamin hots gratis
          </Button>

          {showWarning && (
            <div className="w-full p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 space-y-2 animate-fade-in">
              <p className="text-sm font-semibold">
                No toques enlaces engañosos chama 🚨
              </p>
              {ipAddress && (
                <p className="text-xs font-mono bg-white/60 py-1.5 px-3 rounded-lg border border-red-150 select-all">
                  Tu dirección IP: <strong className="text-red-700">{ipAddress}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Small Footer Text */}
        <p className="text-sm font-semibold text-[#5A3825]/70 flex items-center gap-1.5">
          Viva venezuela en esta mi3rda caballero 🔥🇻🇪
        </p>

      </div>
      
    </div>
  );
};

export default HolaAri;
