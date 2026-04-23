import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  User, 
  Palette, 
  GraduationCap, 
  Settings as SettingsIcon, 
  Save, 
  Mail, 
  Moon, 
  Sun, 
  Monitor,
  Code2,
  Sparkles,
  Check,
  LogIn,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Languages
} from "lucide-react";

interface Homework {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const PRESET_COLORS = [
  { name: "Classic Blue", value: "217 91% 60%" },
  { name: "Royal Purple", value: "262 83% 58%" },
  { name: "Emerald Green", value: "142 76% 36%" },
  { name: "Ruby Red", value: "0 84% 60%" },
  { name: "Golden Sunset", value: "38 92% 50%" },
  { name: "Midnight", value: "220 25% 10%" },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isTeacher, isAdmin } = useAdmin();
  const { 
    theme, setTheme, 
    accentColor, setAccentColor, 
    pycharmComments, setPycharmComments,
    defaultLobbyLanguage, setDefaultLobbyLanguage,
    language, setLanguage
  } = useSettings();
  const l = (key: string) => t(key, language);

  const navigate = useNavigate();
  const [lobbyCode, setLobbyCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  // Homework state (localStorage for test version)
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isEditingHomework, setIsEditingHomework] = useState<string | null>(null);
  const [hwTitle, setHwTitle] = useState("");
  const [hwDescription, setHwDescription] = useState("");

  useEffect(() => {
    const savedHomeworks = localStorage.getItem("subdomain_homework_test_v1");
    if (savedHomeworks) {
      try {
        setHomeworks(JSON.parse(savedHomeworks));
      } catch (e) {
        console.error("Failed to parse homeworks", e);
      }
    }
  }, []);

  const saveHomeworks = (newHomeworks: Homework[]) => {
    setHomeworks(newHomeworks);
    localStorage.setItem("subdomain_homework_test_v1", JSON.stringify(newHomeworks));
  };

  const handleCreateOrUpdateHomework = () => {
    if (!hwTitle.trim() || !hwDescription.trim()) {
      toast.error(l("homework.fillFields"));
      return;
    }

    if (isEditingHomework) {
      const updated = homeworks.map(h => 
        h.id === isEditingHomework ? { ...h, title: hwTitle, description: hwDescription } : h
      );
      saveHomeworks(updated);
      toast.success(l("homework.updated"));
    } else {
      const newHw: Homework = {
        id: crypto.randomUUID(),
        title: hwTitle,
        description: hwDescription,
        createdAt: new Date().toISOString()
      };
      saveHomeworks([newHw, ...homeworks]);
      toast.success(l("homework.added"));
    }
    
    setHwTitle("");
    setHwDescription("");
    setIsEditingHomework(null);
  };

  const handleEditHomework = (h: Homework) => {
    setHwTitle(h.title);
    setHwDescription(h.description);
    setIsEditingHomework(h.id);
  };

  const handleDeleteHomework = (id: string) => {
    const updated = homeworks.filter(h => h.id !== id);
    saveHomeworks(updated);
    toast.success(l("homework.deleted"));
  };

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setFullName(data.display_name || "");
      setAvatarUrl((data as any).avatar_url ?? null);
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user!.id);

    if (error) {
      toast.error(l("profile.error"));
    } else {
      toast.success(l("profile.saved"));
    }
    setSavingProfile(false);
  };

  const joinLobby = async () => {
    if (!lobbyCode.trim()) { toast.error("Введите код лобби"); return; }
    setJoining(true);

    const { data: lobby } = await supabase
      .from("lobbies")
      .select("*")
      .eq("code", lobbyCode.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (!lobby) {
      toast.error("Лобби не найдено или завершено");
      setJoining(false);
      return;
    }

    const { data: existing } = await supabase
      .from("lobby_participants")
      .select("id")
      .eq("lobby_id", lobby.id)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (existing) {
      navigate(`/lobby/${lobby.id}`);
      setJoining(false);
      return;
    }

    const nickname = fullName || user!.email?.split("@")[0] || "Ученик";
    const { error } = await supabase.from("lobby_participants").insert({
      lobby_id: lobby.id,
      user_id: user!.id,
      nickname,
      is_online: true,
    });

    if (error) {
      toast.error("Ошибка подключения: " + error.message);
    } else {
      toast.success("Вы подключились к лобби!");
      navigate(`/lobby/${lobby.id}`);
    }
    setJoining(false);
  };

  if (authLoading || !user) return null;

  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase() : user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl py-10">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{l("settings.title")}</h1>
            <p className="text-muted-foreground mt-1">{l("settings.subtitle")}</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <div className="w-full overflow-x-auto pb-2 mb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex h-10 w-max min-w-full sm:w-full items-center justify-start rounded-md bg-muted p-1 text-muted-foreground sm:grid sm:grid-cols-4 lg:w-[600px]">
                <TabsTrigger value="profile" className="flex-1">{l("settings.tab.profile")}</TabsTrigger>
                <TabsTrigger value="appearance" className="flex-1">{l("settings.tab.appearance")}</TabsTrigger>
                <TabsTrigger value="lessons" className="flex-1">{l("settings.tab.lessons")}</TabsTrigger>
                <TabsTrigger value="account" className="flex-1">{l("settings.tab.account")}</TabsTrigger>
              </TabsList>
            </div>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {l("profile.title")}
                  </CardTitle>
                  <CardDescription>{l("profile.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{l("profile.displayName")}</Label>
                      <Input 
                        id="name" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={l("profile.displayNamePlaceholder")} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">{l("profile.bio")}</Label>
                      <Textarea 
                        id="bio" 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={l("profile.bioPlaceholder")} 
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button variant="hero" onClick={handleSaveProfile} disabled={savingProfile}>
                    <Save className="w-4 h-4 mr-2" />
                    {savingProfile ? l("profile.saving") : l("profile.save")}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    {l("appearance.title")}
                  </CardTitle>
                  <CardDescription>{l("appearance.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4">
                    <Label>{l("appearance.theme")}</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Sun className="w-6 h-6" />
                        <span className="text-sm font-medium">{l("appearance.light")}</span>
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Moon className="w-6 h-6" />
                        <span className="text-sm font-medium">{l("appearance.dark")}</span>
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Monitor className="w-6 h-6" />
                        <span className="text-sm font-medium">{l("appearance.system")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>{l("appearance.accent")}</Label>
                    <div className="flex flex-wrap gap-3">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setAccentColor(color.value)}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${accentColor === color.value ? 'ring-4 ring-offset-4 ring-offset-background ring-primary scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: `hsl(${color.value})` }}
                          title={color.name}
                        >
                          {accentColor === color.value && <Check className="w-6 h-6 text-white drop-shadow-md" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Editor Settings Card */}
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-primary" />
                    {l("editor.title")}
                  </CardTitle>
                  <CardDescription>{l("editor.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">{l("editor.ctrlSlash")}</Label>
                      <p className="text-xs text-muted-foreground">{l("editor.ctrlSlashDesc")}</p>
                    </div>
                    <Switch checked={pycharmComments} onCheckedChange={setPycharmComments} />
                  </div>
                </CardContent>
              </Card>

              {/* Language Card */}
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Languages className="w-5 h-5 text-primary" />
                    {l("language.title")}
                  </CardTitle>
                  <CardDescription>{l("language.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { code: "ru" as const, label: "Русский", flag: "🇷🇺" },
                      { code: "en" as const, label: "English", flag: "🇬🇧" },
                      { code: "uz" as const, label: "O'zbek", flag: "🇺🇿" },
                    ]).map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${language === lang.code ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="text-sm font-medium">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lessons Tab */}
            <TabsContent value="lessons" className="space-y-6">
              {/* Join Lobby Card - For Everyone */}
              <Card className="border-primary/30 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="w-5 h-5 text-primary" />
                    Присоединиться к уроку
                  </CardTitle>
                  <CardDescription>Введите код, предоставленный учителем, чтобы войти в лобби.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      value={lobbyCode}
                      onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                      placeholder="НАПРИМЕР: ABC-123"
                      className="font-mono text-center sm:text-left text-lg tracking-wider"
                    />
                    <Button variant="hero" onClick={joinLobby} disabled={joining} className="w-full sm:w-auto">
                      {joining ? "Вход..." : "Войти"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Homeworks / Домашние задания */}
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Домашние задания
                  </CardTitle>
                  <CardDescription>
                    {(isAdmin || isTeacher) 
                      ? "Управление домашними заданиями для учеников." 
                      : "Список домашних заданий от преподавателей."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(isAdmin || isTeacher) && (
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-4">
                      <h4 className="font-semibold text-sm">
                        {isEditingHomework ? "Редактирование задания" : "Новое задание"}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label>Заголовок (например: Практика Python)</Label>
                          <Input 
                            value={hwTitle} 
                            onChange={e => setHwTitle(e.target.value)} 
                            placeholder="Тема задания"
                          />
                        </div>
                        <div>
                          <Label>Описание задачи</Label>
                          <Textarea 
                            value={hwDescription} 
                            onChange={e => setHwDescription(e.target.value)} 
                            placeholder="Опишите, что нужно сделать ученикам..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          {isEditingHomework && (
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setIsEditingHomework(null);
                                setHwTitle("");
                                setHwDescription("");
                              }}
                            >
                              Отмена
                            </Button>
                          )}
                          <Button onClick={handleCreateOrUpdateHomework}>
                            {isEditingHomework ? "Сохранить изменения" : (
                              <>
                                <Plus className="w-4 h-4 mr-2" /> Добавить задание
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {homeworks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-xl">
                        Пока нет активных домашних заданий
                      </p>
                    ) : (
                      homeworks.map(hw => (
                        <div key={hw.id} className="border border-border/50 bg-card rounded-xl p-4 shadow-sm relative group">
                          <div className="pr-0 md:pr-16">
                            <h3 className="font-semibold text-lg">{hw.title}</h3>
                            <p className="text-muted-foreground mt-2 whitespace-pre-wrap text-sm">
                              {hw.description}
                            </p>
                            <span className="text-xs text-muted-foreground mt-4 block opacity-50">
                              Добавлено: {new Date(hw.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {(isAdmin || isTeacher) && (
                            <div className="mt-4 flex gap-2 md:absolute md:top-4 md:right-4 md:mt-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="sm" className="h-9 md:h-8 flex-1 md:flex-none md:w-8 md:p-0 hover:bg-primary/10 hover:text-primary" onClick={() => handleEditHomework(hw)}>
                                <Edit2 className="w-4 h-4 mr-1 md:mr-0" />
                                <span className="md:hidden">Изменить</span>
                              </Button>
                              <Button variant="outline" size="sm" className="h-9 md:h-8 flex-1 md:flex-none md:w-8 md:p-0 hover:bg-destructive/10 hover:text-destructive text-destructive md:text-muted-foreground md:border-transparent border-destructive/20" onClick={() => handleDeleteHomework(hw.id)}>
                                <Trash2 className="w-4 h-4 mr-1 md:mr-0" />
                                <span className="md:hidden">Удалить</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Teacher settings - Only for accounts with teacher/admin rights */}
              {(isAdmin || isTeacher) && (
                <Card className="border-border/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Параметры уроков
                    </CardTitle>
                    <CardDescription>Настройки для учителей по умолчанию.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Язык новых лобби по умолчанию</Label>
                        <select 
                          value={defaultLobbyLanguage}
                          onChange={(e) => setDefaultLobbyLanguage(e.target.value)}
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="html">Web (HTML/CSS/JS)</option>
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                        </select>
                      </div>
                      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                        Эти настройки помогут вам быстрее создавать учебные сессии.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Безопасность аккаунта
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Электронная почта</Label>
                    <Input value={user.email} disabled className="bg-muted/50 cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground mt-1">Почту можно будет сменить в будущих обновлениях.</p>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => supabase.auth.signOut()}>
                      Выйти из аккаунта
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
