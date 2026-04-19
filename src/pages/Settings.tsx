import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
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
  Check
} from "lucide-react";

const PRESET_COLORS = [
  { name: "Classic Blue", value: "217 91% 60%" },
  { name: "Royal Purple", value: "262 83% 58%" },
  { name: "Emerald Green", value: "142 76% 36%" },
  { name: "Ruby Red", value: "0 84% 60%" },
  { name: "Golden Sunset", value: "38 92% 50%" },
  { name: "Midnight", value: "220 25% 10%" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { isTeacher, isAdmin } = useAdmin();
  const { 
    theme, setTheme, 
    accentColor, setAccentColor, 
    aiEnabled, setAiEnabled,
    pycharmComments, setPycharmComments,
    defaultLobbyLanguage, setDefaultLobbyLanguage 
  } = useSettings();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  if (!user) return null;

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setFullName(data.display_name || "");
      setAvatarUrl(data.avatar_url);
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
      toast.error("Ошибка сохранения профиля");
    } else {
      toast.success("Профиль успешно обновлен!");
    }
    setSavingProfile(false);
  };

  if (!user) return null;

  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase() : user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-4xl py-10">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
            <p className="text-muted-foreground mt-1">Оформите рабочее место и управляйте своим аккаунтом.</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px] mb-8">
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="appearance">Внешний вид</TabsTrigger>
              <TabsTrigger value="lessons">Уроки</TabsTrigger>
              <TabsTrigger value="account">Аккаунт</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Личная информация
                  </CardTitle>
                  <CardDescription>Эти данные будут видны другим участникам в лобби.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Отображаемое имя</Label>
                      <Input 
                        id="name" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Как вас называть?" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">О себе</Label>
                      <Textarea 
                        id="bio" 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Краткая информация о вас..." 
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button variant="hero" onClick={handleSaveProfile} disabled={savingProfile}>
                    <Save className="w-4 h-4 mr-2" />
                    {savingProfile ? "Сохранение..." : "Сохранить профиль"}
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
                    Оформление
                  </CardTitle>
                  <CardDescription>Настройте цветовую схему сайта и тему.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Theme Selector */}
                  <div className="space-y-4">
                    <Label>Цветовая тема</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Sun className="w-6 h-6" />
                        <span className="text-sm font-medium">Светлая</span>
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Moon className="w-6 h-6" />
                        <span className="text-sm font-medium">Темная</span>
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                      >
                        <Monitor className="w-6 h-6" />
                        <span className="text-sm font-medium">Системная</span>
                      </button>
                    </div>
                  </div>

                  {/* Accent Color Picker */}
                  <div className="space-y-4">
                    <Label>Акцентный цвет</Label>
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

            </TabsContent>

            {/* Lessons Tab */}
            <TabsContent value="lessons" className="space-y-6">
              <Card className="border-border/50 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Параметры уроков
                  </CardTitle>
                  <CardDescription>Настройки для учителей по умолчанию.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!(isAdmin || isTeacher) ? (
                    <div className="py-4 text-center text-muted-foreground">
                      Эта вкладка доступна только преподавателям.
                    </div>
                  ) : (
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
                  )}
                </CardContent>
              </Card>
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
