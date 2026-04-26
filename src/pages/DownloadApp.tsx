import { useEffect, useState } from "react";
import { Monitor, Smartphone, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const APP_DOWNLOAD_URL = "https://bmvqbxqsyuratutvolwd.supabase.co/storage/v1/object/public/apps//Code_Alfacomp_v1.zip";

const DownloadApp = () => {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    // Detect mobile device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const mobile = mobileRegex.test(userAgent.toLowerCase());
    setIsMobile(mobile);

    // If on PC, start automatic download after 3 seconds
    if (!mobile) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = APP_DOWNLOAD_URL;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f111a] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl relative z-10">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
            {isMobile ? (
              <Smartphone className="w-10 h-10 text-blue-400" />
            ) : (
              <Monitor className="w-10 h-10 text-blue-400 animate-pulse" />
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Code Alfacomp Desktop
        </h1>

        {isMobile === null ? (
          <p className="text-white/60">Определение устройства...</p>
        ) : isMobile ? (
          <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
              К сожалению, мобильная версия приложения еще находится в разработке. 
              Пожалуйста, откройте эту ссылку с компьютера (Windows).
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> На главную
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-white/70 leading-relaxed">
              Вы используете ПК. Загрузка приложения Code Alfacomp начнется автоматически через:
            </p>
            
            <div className="text-6xl font-black text-blue-400 my-4">
              {countdown}
            </div>

            <p className="text-xs text-white/40">
              Если загрузка не началась, нажмите на кнопку ниже:
            </p>

            <Button 
              asChild
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <a href={APP_DOWNLOAD_URL}>
                <Download className="w-5 h-5 mr-2" /> Скачать сейчас
              </a>
            </Button>
            
            <div className="text-[10px] text-white/30 uppercase tracking-widest pt-4">
              Версия: 1.0.0 • Windows x64 • ZIP
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 text-white/20 text-sm">
        © {new Date().getFullYear()} Alfacomp Official. Все права защищены.
      </footer>
    </div>
  );
};

export default DownloadApp;
