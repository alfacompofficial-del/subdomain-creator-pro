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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ColorPicker } from "@/components/ColorPicker";
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
  Languages,
  Lock,
  RotateCcw,
  Github,
  ExternalLink
} from "lucide-react";

interface Homework {
  id: string;
  title: string;
  description: string;
  due_date?: string | null;
  created_at: string;
  created_by: string;
}

const PRESET_COLORS = [
  { name: "Синий", value: "217 91% 60%" },
  { name: "Фиолетовый", value: "262 83% 58%" },
  { name: "Зелёный", value: "142 76% 36%" },
  { name: "Красный", value: "0 84% 60%" },
  { name: "Оранжевый", value: "38 92% 50%" },
  { name: "Розовый", value: "330 80% 60%" },
  { name: "Бирюзовый", value: "180 70% 40%" },
  { name: "Жёлтый", value: "55 90% 50%" },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isTeacher, isAdmin } = useAdmin();
  const { 
    language, setLanguage,
    githubToken, setGithubToken,
    githubAutoPush, setGithubAutoPush,
    aiProvider, setAiProvider,
    groqApiKey, setGroqApiKey,
    theme, setTheme,
    accentColor, setAccentColor,
    pycharmComments, setPycharmComments,
    defaultLobbyLanguage, setDefaultLobbyLanguage
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

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Homework state
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isEditingHomework, setIsEditingHomework] = useState<string | null>(null);
  const [hwTitle, setHwTitle] = useState("");
  const [hwDescription, setHwDescription] = useState("");
  const [hwDueDate, setHwDueDate] = useState("");

  const loadHomeworks = async () => {
    const { data, error } = await supabase
      .from("homeworks")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Failed to load homeworks", error);
    } else if (data) {
      setHomeworks(data as Homework[]);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
      loadHomeworks();
    }
  }, [user]);

  const handleCreateOrUpdateHomework = async () => {
    if (!hwTitle.trim() || !hwDescription.trim()) {
      toast.error(l("homework.fillFields"));
      return;
    }

    if (isEditingHomework) {
      const { error } = await supabase
        .from("homeworks")
        .update({ 
          title: hwTitle, 
          description: hwDescription,
          due_date: hwDueDate || null
        })
        .eq("id", isEditingHomework);

      if (error) {
        toast.error("Ошибка при обновлении задания: " + error.message);
        return;
      }
      toast.success(l("homework.updated"));
    } else {
      const { error } = await supabase
        .from("homeworks")
        .insert([{
          title: hwTitle,
          description: hwDescription,
          due_date: hwDueDate || null,
          created_by: user!.id
        }]);

      if (error) {
        toast.error("Ошибка при добавлении задания: " + error.message);
        return;
      }
      toast.success(l("homework.added"));
    }
    
    setHwTitle("");
    setHwDescription("");
    setHwDueDate("");
    setIsEditingHomework(null);
    loadHomeworks();
  };

  const handleEditHomework = (h: Homework) => {
    setHwTitle(h.title);
    setHwDescription(h.description);
    setHwDueDate(h.due_date ? new Date(h.due_date).toISOString().slice(0, 16) : "");
    setIsEditingHomework(h.id);
  };

  const handleDeleteHomework = async (id: string) => {
    const { error } = await supabase
      .from("homeworks")
      .delete()
      .eq("id", id);
      
    if (error) {
      toast.error("Ошибка при удалении: " + error.message);
    } else {
      toast.success(l("homework.deleted"));
      loadHomeworks();
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setSavingProfile(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Вы должны выбрать изображение для загрузки.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}-${Math.random()}.${fileExt}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', user!.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(data.publicUrl);
      toast.success('Аватар успешно обновлён!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

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
      setBio((data as any).bio || "");
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
        bio: bio,
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

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Ошибка смены пароля: " + error.message);
    } else {
      toast.success("Пароль успешно изменён!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const handleResetSettings = () => {
    setTheme("dark");
    setAccentColor("217 91% 60%");
    setPycharmComments(false);
    setLanguage("ru");
    toast.success("Настройки сброшены по умолчанию");
  };

  const joinLobby = async () => {
    if (!lobbyCode.trim()) { toast.error(l("lessons.join.enterCode")); return; }
    setJoining(true);

    const { data: lobby } = await supabase
      .from("lobbies")
      .select("*")
      .eq("code", lobbyCode.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (!lobby) {
      toast.error(l("lessons.join.notFound"));
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
      toast.error(l("lessons.join.error") + error.message);
    } else {
      toast.success(l("lessons.join.success"));
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
              <TabsList className="inline-flex h-10 w-max min-w-full sm:w-full items-center justify-start rounded-md bg-muted p-1 text-muted-foreground sm:grid sm:grid-cols-5 lg:w-[750px]">
                <TabsTrigger value="profile" className="flex-1">{l("settings.tab.profile")}</TabsTrigger>
                <TabsTrigger value="appearance" className="flex-1">{l("settings.tab.appearance")}</TabsTrigger>
                <TabsTrigger value="lessons" className="flex-1">{l("settings.tab.lessons")}</TabsTrigger>
                <TabsTrigger value="integrations" className="flex-1">{l("settings.tab.integrations")}</TabsTrigger>
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
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <Avatar className="w-24 h-24 text-2xl shadow-md border-4 border-background">
                      {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="object-cover" /> : <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>}
                    </Avatar>
                    <div className="space-y-2 text-center sm:text-left">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                          Загрузить фото
                        </div>
                      </Label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={uploadAvatar}
                        disabled={savingProfile}
                      />
                      <p className="text-xs text-muted-foreground">Рекомендуется 256x256 px. JPG, PNG или GIF.</p>
                    </div>
                  </div>
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
                        onClick={() => { setTheme("light"); toast.success("Светлая тема применена"); }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Sun className="w-6 h-6" />
                        <span className="text-sm font-medium">{l("appearance.light")}</span>
                      </button>
                      <button
                        onClick={() => { setTheme("dark"); toast.success("Тёмная тема применена"); }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Moon className="w-6 h-6" />
                        <span className="text-sm font-medium">{l("appearance.dark")}</span>
                      </button>
                      <button
                        onClick={() => { setTheme("system"); toast.success("Системная тема применена"); }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Monitor className="w-6 h-6" />
                        <span className="text-sm font-medium">{l("appearance.system")}</span>
                      </button>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" onClick={handleResetSettings} className="text-muted-foreground">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Сбросить настройки
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>{l("appearance.accent")}</Label>
                    <ColorPicker value={accentColor} onChange={setAccentColor} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Быстрый выбор:</p>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setAccentColor(color.value)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${accentColor === color.value ? 'ring-4 ring-offset-2 ring-offset-background ring-primary scale-110' : 'hover:scale-105 hover:ring-2 hover:ring-offset-2 hover:ring-primary/50 hover:ring-offset-background'}`}
                            style={{ backgroundColor: `hsl(${color.value})` }}
                            title={color.name}
                          >
                            {accentColor === color.value && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                          </button>
                        ))}
                      </div>
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
                  <div className="pt-4 border-t border-border/50 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Модель ИИ</Label>
                      <p className="text-xs text-muted-foreground">Выберите провайдера искусственного интеллекта для помощи в написании кода</p>
                      <select 
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value as "gemini" | "groq")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="gemini">Gemini 2.5 Flash</option>
                        <option value="groq">Groq (Llama 3 / Mixtral)</option>
                      </select>
                    </div>
                    
                    {aiProvider === "groq" && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-sm font-medium">Groq API Key</Label>
                        <Input 
                          type="password"
                          value={groqApiKey}
                          onChange={(e) => setGroqApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="font-mono text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Ваш API ключ хранится локально в браузере.
                        </p>
                      </div>
                    )}
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
                    {l("lessons.join.title")}
                  </CardTitle>
                  <CardDescription>{l("lessons.join.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      value={lobbyCode}
                      onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                      placeholder={l("lessons.join.placeholder")}
                      className="font-mono text-center sm:text-left text-lg tracking-wider"
                    />
                    <Button variant="hero" onClick={joinLobby} disabled={joining} className="w-full sm:w-auto">
                      {joining ? l("lessons.join.joining") : l("lessons.join.button")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    {l("homework.title")}
                  </CardTitle>
                  <CardDescription>
                    {(isAdmin || isTeacher) 
                      ? l("homework.subtitle.teacher") 
                      : l("homework.subtitle.student")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(isAdmin || isTeacher) && (
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-4">
                      <h4 className="font-semibold text-sm">
                        {isEditingHomework ? l("homework.editing") : l("homework.new")}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label>{l("homework.titleLabel")}</Label>
                          <Input 
                            value={hwTitle} 
                            onChange={e => setHwTitle(e.target.value)} 
                            placeholder={l("homework.titlePlaceholder")}
                          />
                        </div>
                        <div>
                          <Label>{l("homework.descLabel")}</Label>
                          <Textarea 
                            value={hwDescription} 
                            onChange={e => setHwDescription(e.target.value)} 
                            placeholder={l("homework.descPlaceholder")}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Дедлайн (необязательно)</Label>
                          <Input 
                            type="datetime-local"
                            value={hwDueDate} 
                            onChange={e => setHwDueDate(e.target.value)} 
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
                                setHwDueDate("");
                              }}
                            >
                              {l("homework.cancel")}
                            </Button>
                          )}
                          <Button onClick={handleCreateOrUpdateHomework}>
                            {isEditingHomework ? l("homework.saveChanges") : (
                              <>
                                <Plus className="w-4 h-4 mr-2" /> {l("homework.add")}
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
                        {l("homework.empty")}
                      </p>
                    ) : (
                      homeworks.map(hw => (
                        <div key={hw.id} className="border border-border/50 bg-card rounded-xl p-4 shadow-sm relative group">
                          <div className="pr-0 md:pr-16">
                            <h3 className="font-semibold text-lg">{hw.title}</h3>
                            <p className="text-muted-foreground mt-2 whitespace-pre-wrap text-sm">
                              {hw.description}
                            </p>
                            <span className="text-xs text-muted-foreground mt-4 flex items-center gap-2 opacity-60">
                              <span>Добавлено: {new Date(hw.created_at).toLocaleDateString()}</span>
                              {hw.due_date && (
                                <span className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                  Дедлайн: {new Date(hw.due_date).toLocaleString()}
                                </span>
                              )}
                            </span>
                          </div>

                          {(isAdmin || isTeacher) && (
                            <div className="mt-4 flex gap-2 md:absolute md:top-4 md:right-4 md:mt-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="sm" className="h-9 md:h-8 flex-1 md:flex-none md:w-8 md:p-0 hover:bg-primary/10 hover:text-primary" onClick={() => handleEditHomework(hw)}>
                                <Edit2 className="w-4 h-4 mr-1 md:mr-0" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-9 md:h-8 flex-1 md:flex-none md:w-8 md:p-0 hover:bg-destructive/10 hover:text-destructive text-destructive md:text-muted-foreground md:border-transparent border-destructive/20">
                                    <Trash2 className="w-4 h-4 mr-1 md:mr-0" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Удалить задание?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Задание «{hw.title}» будет удалено безвозвратно.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteHomework(hw.id)} className="bg-destructive hover:bg-destructive/90">
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {(isAdmin || isTeacher) && (
                <Card className="border-border/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      {l("teacher.title")}
                    </CardTitle>
                    <CardDescription>{l("teacher.subtitle")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{l("teacher.defaultLang")}</Label>
                        <select 
                          value={defaultLobbyLanguage}
                          onChange={(e) => { setDefaultLobbyLanguage(e.target.value); toast.success("Язык по умолчанию изменён"); }}
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="html">Web (HTML / CSS / JS)</option>
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="cpp">C++</option>
                          <option value="sql">SQL</option>
                        </select>
                      </div>
                      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                        {l("teacher.hint")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-primary" />
                    GitHub
                  </CardTitle>
                  <CardDescription>Синхронизируйте свои проекты с GitHub репозиториями</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="github-token">Personal Access Token (PAT)</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="github-token"
                          type="password"
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxx"
                          className="font-mono"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          asChild
                        >
                          <a href="https://github.com/settings/tokens/new?scopes=repo&description=Alfacomp%20IDE" target="_blank" rel="noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Нужен токен с правами <code className="bg-muted px-1 rounded">repo</code>. 
                        <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">Создать тут</a>
                      </p>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-border/50">
                      <div className="space-y-0.5">
                        <Label>Авто-пуш при выходе</Label>
                        <p className="text-xs text-muted-foreground">Спрашивать об отправке изменений в GitHub при закрытии IDE</p>
                      </div>
                      <Switch 
                        checked={githubAutoPush} 
                        onCheckedChange={setGithubAutoPush} 
                      />
                    </div>

                    {githubToken && (
                      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-green-400 font-medium">GitHub подключен</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    {l("account.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{l("account.email")}</Label>
                    <Input value={user.email} disabled className="bg-muted/50 cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground mt-1">{l("account.emailHint")}</p>
                  </div>
                  <div className="pt-4 border-t border-border/50">
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => supabase.auth.signOut()}>
                      {l("account.signOut")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    Сменить пароль
                  </CardTitle>
                  <CardDescription>Введите новый пароль для вашего аккаунта</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Новый пароль</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Повторите новый пароль"
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
                    <Lock className="w-4 h-4 mr-2" />
                    {savingPassword ? "Сохранение..." : "Сменить пароль"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
