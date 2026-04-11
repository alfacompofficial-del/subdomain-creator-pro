import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Users, FolderOpen, Eye, Mail, Globe,
  ArrowLeft, Lock, BarChart3, Code2, ChevronRight, Calendar, X
} from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";

const ADMIN_PASSWORD = "Bilol2013/";
const SESSION_KEY = "alfa_admin_auth";

interface UserInfo {
  id: string;
  email: string;
  created_at: string;
}

interface UserSite {
  id: string;
  subdomain: string;
  title: string | null;
  html_code: string | null;
  css_code: string | null;
  js_code: string | null;
  created_at: string;
}

// ─── Read-only code viewer ────────────────────────────────────────────────────
function CodeViewer({ language, value }: { language: string; value: string }) {
  return (
    <div className="rounded-md overflow-hidden border border-white/10">
      <div className="bg-[#1e1e1e] px-3 py-1.5 flex items-center gap-2 border-b border-white/10">
        <span className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest">
          {language}
        </span>
        <span className="ml-auto text-xs text-white/30 italic">только чтение</span>
      </div>
      <Editor
        height="220px"
        language={language === "JS" ? "javascript" : language.toLowerCase()}
        value={value || "/* пусто */"}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: "on",
          wordWrap: "on",
          scrollBeyondLastLine: false,
          domReadOnly: true,
          contextmenu: false,
          renderLineHighlight: "none",
          padding: { top: 8 },
        }}
      />
    </div>
  );
}

// ─── Password screen ──────────────────────────────────────────────────────────
function PasswordScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error("Неверный пароль");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          На главную
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg shadow-purple-900/50 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Админ-панель</h1>
          <p className="text-white/40 text-sm mt-1">Введите пароль для входа</p>
        </div>

        <div
          className={`transition-transform ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
          style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}
        >
          <Card className="bg-white/5 border-white/10 shadow-2xl">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    placeholder="Пароль"
                    autoFocus
                    className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/60 ${
                      error ? "border-red-500/50" : ""
                    }`}
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-xs text-center">Неверный пароль</p>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-purple-900/30"
                >
                  Войти
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [totalSites, setTotalSites] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userSites, setUserSites] = useState<UserSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [viewingSite, setViewingSite] = useState<UserSite | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState("html");
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingUsers(true);

    // Total sites count
    const { count } = await supabase
      .from("sites")
      .select("*", { count: "exact", head: true });
    setTotalSites(count || 0);

    // Users via edge function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("admin-users", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Не удалось загрузить пользователей");
    }
    setLoadingUsers(false);
  };

  const handleSelectUser = async (u: UserInfo) => {
    setSelectedUser(u);
    setViewingSite(null);
    setLoadingSites(true);

    const { data } = await supabase
      .from("sites")
      .select("id, subdomain, title, html_code, css_code, js_code, created_at")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false });

    setUserSites(data || []);
    setLoadingSites(false);
  };

  const avgSitesPerUser = users.length > 0
    ? (totalSites / users.length).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">На главную</span>
            </button>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-sm">Админ-панель</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-white/40 hover:text-red-400 hover:bg-red-400/10 text-xs"
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            Выйти
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300"
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Статистика
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Пользователи и проекты
            </TabsTrigger>
          </TabsList>

          {/* ─── STATS TAB ─────────────────────────────────────── */}
          <TabsContent value="stats" className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Пользователей",
                  value: loadingUsers ? "..." : users.length,
                  icon: Users,
                  color: "from-purple-600/20 to-indigo-600/20 border-purple-500/20",
                  iconColor: "text-purple-400",
                },
                {
                  label: "Всего сайтов",
                  value: totalSites,
                  icon: Globe,
                  color: "from-blue-600/20 to-cyan-600/20 border-blue-500/20",
                  iconColor: "text-blue-400",
                },
                {
                  label: "Сайтов на пользователя",
                  value: loadingUsers ? "..." : avgSitesPerUser,
                  icon: BarChart3,
                  color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/20",
                  iconColor: "text-emerald-400",
                },
              ].map(({ label, value, icon: Icon, color, iconColor }) => (
                <Card
                  key={label}
                  className={`bg-gradient-to-br ${color} border`}
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-white/50">{label}</p>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <p className="text-4xl font-bold text-white">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Users list */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Зарегистрированные пользователи
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-center text-white/30 py-8">Нет зарегистрированных пользователей</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((u, idx) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-white">{u.email}</p>
                            <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(u.created_at).toLocaleDateString("ru-RU", {
                                day: "numeric", month: "long", year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-white/20 font-mono">#{u.id.slice(0, 6)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── USERS & PROJECTS TAB ──────────────────────────── */}
          <TabsContent value="users">
            {/* Code viewer modal overlay */}
            {viewingSite && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
                <div className="bg-[#0f0f1a] border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="font-semibold text-sm text-white">
                        {viewingSite.title || viewingSite.subdomain}
                      </p>
                      <p className="text-xs text-white/30 font-mono">/site/{viewingSite.subdomain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-md">
                      👁 Только просмотр
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingSite(null)}
                      className="text-white/40 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <Tabs value={activeCodeTab} onValueChange={setActiveCodeTab} className="h-full flex flex-col">
                    <TabsList className="bg-white/5 border border-white/10 w-fit mb-4">
                      <TabsTrigger value="html" className="font-mono text-xs data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300">
                        HTML
                      </TabsTrigger>
                      <TabsTrigger value="css" className="font-mono text-xs data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">
                        CSS
                      </TabsTrigger>
                      <TabsTrigger value="js" className="font-mono text-xs data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300">
                        JavaScript
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1">
                      {activeCodeTab === "html" && (
                        <CodeViewer language="HTML" value={viewingSite.html_code || ""} />
                      )}
                      {activeCodeTab === "css" && (
                        <CodeViewer language="CSS" value={viewingSite.css_code || ""} />
                      )}
                      {activeCodeTab === "js" && (
                        <CodeViewer language="JS" value={viewingSite.js_code || ""} />
                      )}
                    </div>
                  </Tabs>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Users list */}
              <Card className="bg-white/5 border-white/10 lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/70 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Пользователи ({users.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  {loadingUsers ? (
                    <div className="space-y-2">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group ${
                        selectedUser?.id === u.id
                          ? "bg-purple-600/20 border border-purple-500/30"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-white truncate">{u.email}</p>
                        <p className="text-xs text-white/30 mt-0.5">
                          {new Date(u.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ml-2 transition-colors ${
                        selectedUser?.id === u.id ? "text-purple-400" : "text-white/20 group-hover:text-white/40"
                      }`} />
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Projects panel */}
              <div className="lg:col-span-2">
                {!selectedUser ? (
                  <Card className="bg-white/5 border-white/10 h-full">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                      <FolderOpen className="w-12 h-12 text-white/10 mb-4" />
                      <p className="text-white/30 text-sm">Выберите пользователя слева,<br />чтобы просмотреть его проекты</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600/60 flex items-center justify-center">
                        <Mail className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm font-medium text-white/70">
                        {selectedUser.email}
                      </p>
                    </div>

                    {loadingSites ? (
                      <div className="space-y-3">
                        {[1,2].map(i => (
                          <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />
                        ))}
                      </div>
                    ) : userSites.length === 0 ? (
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="py-12 text-center">
                          <Globe className="w-10 h-10 text-white/10 mx-auto mb-3" />
                          <p className="text-white/30 text-sm">У этого пользователя нет проектов</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {userSites.map((site) => (
                          <Card
                            key={site.id}
                            onClick={() => { setViewingSite(site); setActiveCodeTab("html"); }}
                            className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/8 hover:border-purple-500/30 transition-all group"
                          >
                            <CardContent className="py-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600/40 to-indigo-600/40 border border-purple-500/20 flex items-center justify-center shrink-0">
                                  <Globe className="w-4 h-4 text-purple-300" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-white">
                                    {site.title || "Без названия"}
                                  </p>
                                  <p className="text-xs text-white/30 font-mono mt-0.5">
                                    /site/{site.subdomain}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-white/30">
                                  {new Date(site.created_at).toLocaleDateString("ru-RU")}
                                </span>
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-purple-600/20 border border-purple-500/20 group-hover:bg-purple-600/30 transition-colors">
                                  <Eye className="w-3.5 h-3.5 text-purple-300" />
                                  <span className="text-xs text-purple-300">Код</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function SecretAdmin() {
  const [authenticated, setAuthenticated] = useState(
    sessionStorage.getItem(SESSION_KEY) === "true"
  );

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <PasswordScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return <AdminPanel onLogout={handleLogout} />;
}
