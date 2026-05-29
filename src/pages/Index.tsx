import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, Globe, Search, Zap, ArrowRight, Terminal, Sparkles, Users, Shield } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Code2,
      title: "Мощный редактор",
      description: "HTML, CSS, JavaScript и Python с подсветкой синтаксиса и ИИ‑автодополнением",
      gradient: "from-blue-500 to-cyan-400",
      glow: "shadow-blue-500/20",
    },
    {
      icon: Globe,
      title: "Мгновенная публикация",
      description: "Ваш сайт становится доступен по ссылке в одно нажатие — без серверов и настроек",
      gradient: "from-violet-500 to-purple-400",
      glow: "shadow-violet-500/20",
    },
    {
      icon: Sparkles,
      title: "ИИ Помощник",
      description: "Нажмите Ctrl+Shift+H — и ИИ напишет, исправит или улучшит ваш код по описанию",
      gradient: "from-pink-500 to-rose-400",
      glow: "shadow-pink-500/20",
    },
    {
      icon: Users,
      title: "Класс‑лобби",
      description: "Учитель видит код каждого студента в реальном времени — как в настоящей IDE",
      gradient: "from-amber-500 to-orange-400",
      glow: "shadow-amber-500/20",
    },
  ];

  const codeLines = [
    { text: "def greet(name: str) -> str:", color: "text-violet-300" },
    { text: '    return f"Привет, {name}!"', color: "text-green-300" },
    { text: "", color: "" },
    { text: 'print(greet("Мир"))', color: "text-blue-300" },
    { text: "", color: "" },
    { text: "# ИИ-помощник добавит сюда", color: "text-white/30" },
    { text: "# нужный код автоматически ✨", color: "text-white/30" },
  ];

  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">

      {/* ── Animated Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-violet-600/12 blur-[120px] animate-pulse" style={{ animationDelay: "2s", animationDuration: "8s" }} />
        <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDelay: "4s", animationDuration: "10s" }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-20 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl">
        <div className="container flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">
              <span className="text-white">Code</span>{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Alfacomp</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/8"
              onClick={() => navigate("/auth")}
            >
              Войти
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-90 border-0 text-white shadow-lg shadow-violet-500/25 transition-all"
              onClick={() => navigate("/auth")}
            >
              Начать бесплатно
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 container px-4 md:px-6 pt-24 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full px-4 py-1.5 text-sm font-medium mb-8 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Платформа для обучения программированию
          </div>

          <h1 className="text-5xl md:text-[72px] font-black tracking-tight mb-6 leading-[1.05]">
            <span className="text-white">Пишите код.</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Публикуйте мгновенно.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/45 mb-10 max-w-2xl mx-auto leading-relaxed">
            HTML, CSS, JavaScript и Python прямо в браузере. ИИ‑помощник, онлайн‑терминал и система классов для учителей и учеников.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-90 border-0 text-white shadow-2xl shadow-violet-500/30 text-base px-8 h-12 transition-all hover:scale-[1.02]"
              onClick={() => navigate("/auth")}
            >
              Создать проект
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 text-base px-8 h-12 backdrop-blur-sm"
              onClick={() => navigate("/auth")}
            >
              Посмотреть демо
            </Button>
          </div>
        </div>

        {/* Code mockup card */}
        <div className="mt-20 max-w-2xl mx-auto relative">
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-pink-500/30 rounded-2xl blur-lg" />
          <div className="relative bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-white/30 font-mono">main.py — Code Alfacomp</span>
            </div>
            {/* Code */}
            <div className="p-5 font-mono text-sm leading-7">
              {codeLines.map((line, i) => (
                <div key={i} className={line.color || "text-white/20"}>
                  <span className="text-white/20 select-none mr-4 text-xs">{i + 1}</span>
                  {line.text || " "}
                </div>
              ))}
            </div>
            {/* Terminal output */}
            <div className="border-t border-white/8 bg-black/40 px-5 py-3">
              <div className="flex items-center gap-2 text-xs text-white/30 mb-1">
                <Terminal className="w-3 h-3" />
                <span>Terminal</span>
              </div>
              <p className="font-mono text-green-400 text-sm">Привет, Мир!</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 container px-4 md:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Всё что нужно для{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">разработки</span>
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Профессиональные инструменты, доступные прямо в браузере</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <div
              key={i}
              className="group relative bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300 overflow-hidden"
            >
              {/* Glow on hover */}
              <div className={`absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl bg-gradient-to-br ${f.gradient} blur-2xl`} style={{ opacity: 0 }} />

              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg ${f.glow} group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg text-white mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 container px-4 md:px-6 pb-24">
        <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-violet-600/40 to-pink-600/30" />
          <div className="absolute inset-0 bg-[#080b14]/60 backdrop-blur-sm" />
          <div className="absolute inset-0 border border-white/10 rounded-3xl" />
          <div className="relative z-10 text-center py-16 px-6">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 rounded-full px-4 py-1.5 text-sm mb-6">
              <Shield className="w-3.5 h-3.5" />
              Бесплатно для учеников и учителей
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">
              Готовы начать?
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Регистрация занимает 30 секунд. Никаких платёжных данных не нужно.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-90 border-0 text-white shadow-2xl shadow-violet-500/40 text-base px-10 h-12 hover:scale-[1.02] transition-all"
              onClick={() => navigate("/auth")}
            >
              Зарегистрироваться бесплатно
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/25">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Code Alfacomp</span>
          </div>
          <span>© 2026 Code Alfacomp — Платформа для обучения и разработки</span>
        </div>
      </footer>
    </div>
  );
}