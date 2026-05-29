import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Users, FolderOpen, Eye, Mail, Globe, Save, Lock, GraduationCap, Plus, Copy, Play, Trash2, FolderGit2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CodeEditor from "@/components/CodeEditor";

interface UserInfo {
  id: string;
  email: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
  last_sign_in_at?: string;
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

interface Lobby {
  id: string;
  title: string;
  code: string;
  language: string;
  status: string;
  created_at: string;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isTeacher, isOwner, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [totalSites, setTotalSites] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userProjectCounts, setUserProjectCounts] = useState<Record<string, number>>({});
  
  // Projects Dialog
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userSites, setUserSites] = useState<UserSite[]>([]);
  const [viewingSite, setViewingSite] = useState<UserSite | null>(null);
  
  // Teacher edit state for projects
  const [activeTab, setActiveTab] = useState("html");
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [saving, setSaving] = useState(false);

  // Lobbies state
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [lobbyTitle, setLobbyTitle] = useState("");
  const [lobbyLang, setLobbyLang] = useState("HTML/CSS/JS");
  const [creatingLobby, setCreatingLobby] = useState(false);

  // Add to lobby Dialog
  const [addToLobbyDialogOpen, setAddToLobbyDialogOpen] = useState(false);
  const [lobbyTargetUser, setLobbyTargetUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate("/auth");
      else if (!isAdmin && !isTeacher) {
        toast.error("Доступ запрещён");
        navigate("/dashboard");
      }
    }
  }, [user, isAdmin, isTeacher, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin || isTeacher) {
      loadStats();
      if (user) loadLobbies(user.id);
    }
  }, [isAdmin, isTeacher, user]);

  const loadStats = async () => {
    const { count } = await supabase
      .from("sites")
      .select("*", { count: "exact", head: true });

    setTotalSites(count || 0);

    try {
      const { data: usersData, error } = await supabase.rpc("get_admin_users");

      if (error) {
        toast.error(error.message);
      } else if (usersData) {
        const fetchedUsers: UserInfo[] = usersData;
        setUsers(fetchedUsers);
        // Load project counts for all users
        const counts: Record<string, number> = {};
        await Promise.all(
          fetchedUsers.map(async (u) => {
            const { count } = await supabase
              .from("sites")
              .select("*", { count: "exact", head: true })
              .eq("user_id", u.id);
            counts[u.id] = count || 0;
          })
        );
        setUserProjectCounts(counts);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }

    setLoadingUsers(false);
  };

  const loadUserSites = async (userId: string) => {
    const { data } = await supabase
      .from("sites")
      .select("id, subdomain, title, html_code, css_code, js_code, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setUserSites(data || []);
  };

  const loadLobbies = async (teacherId: string) => {
    const { data } = await supabase
      .from("lobbies")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });
    setLobbies(data || []);
  };

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !lobbyTitle.trim()) return;
    setCreatingLobby(true);
    
    const prefix = lobbyLang === "Python" ? "PYT" : "WEB";
    const shortCode = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { error } = await supabase.from("lobbies").insert({
      teacher_id: user.id,
      title: lobbyTitle,
      code: shortCode,
      language: lobbyLang
    });

    if (error) {
      toast.error("Ошибка при создании лобби: " + error.message);
    } else {
      toast.success(`Лобби ${shortCode} создано!`);
      setLobbyTitle("");
      loadLobbies(user.id);
    }
    setCreatingLobby(false);
  };

  const handleDeleteLobby = async (id: string, title: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить лобби "${title}"? Это действие необратимо.`)) return;
    
    const { error } = await supabase.from("lobbies").delete().eq("id", id);
    if (error) {
      toast.error("Ошибка при удалении: " + error.message);
    } else {
      toast.success("Лобби удалено");
      setLobbies(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleOpenProjects = (u: UserInfo) => {
    setSelectedUser(u);
    setViewingSite(null);
    setUserSites([]);
    setProjectsDialogOpen(true);
    loadUserSites(u.id);
  };

  const handleOpenSite = (site: UserSite) => {
    setViewingSite(site);
    setHtmlCode(site.html_code || "");
    setCssCode(site.css_code || "");
    setJsCode(site.js_code || "");
    setActiveTab("html");
  };

  const generatePreview = (html: string, css: string, js: string) => {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <style>${css}</style>
</head>
<body>
${html}
<script>${js}<\/script>
</body>
</html>`;
  };

  const handleSaveAsTeacher = async () => {
    if (!viewingSite) return;
    setSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("teacher-update-site", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: {
          siteId: viewingSite.id,
          htmlCode,
          cssCode,
          jsCode,
          fullHtml: generatePreview(htmlCode, cssCode, jsCode)
        }
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || "Ошибка сохранения");
      }

      toast.success("Код ученика успешно сохранен!");
      
      const updatedSite = { ...viewingSite, html_code: htmlCode, css_code: cssCode, js_code: jsCode };
      setViewingSite(updatedSite);
      setUserSites(prev => prev.map(s => s.id === updatedSite.id ? updatedSite : s));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!isOwner) {
      toast.error("Только Владелец может изменять звания!");
      return;
    }
    
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.email?.toLowerCase() === 'alfacompofficial@gmail.com') {
      toast.error("Нельзя изменить звание Владельца!");
      return;
    }

    try {
      const { error } = await supabase.rpc("update_user_role", {
        target_user_id: userId,
        new_role: newRole
      });
      
      if (error) {
        throw new Error(error.message || "Ошибка смены роли");
      }
      
      toast.success("Звание успешно изменено!");
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Вы уверены? Это удалит пользователя, его сайты и лобби.")) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("admin-users", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { action: "delete", userId }
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message || "Ошибка удаления");
      }

      toast.success("Пользователь удален!");
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddUserToLobby = async (lobbyId: string) => {
    if (!lobbyTargetUser) return;
    const { error } = await supabase.from("lobby_participants").insert({
      lobby_id: lobbyId,
      user_id: lobbyTargetUser.id,
      nickname: lobbyTargetUser.display_name || lobbyTargetUser.email.split('@')[0],
      student_code: ""
    });

    if (error) {
      toast.error("Ошибка при добавлении в лобби: " + error.message);
    } else {
      toast.success("Ученик добавлен в лобби!");
      setAddToLobbyDialogOpen(false);
    }
  };

  if (authLoading || adminLoading || (!isAdmin && !isTeacher)) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center gap-3 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          <span className="text-sm font-semibold text-primary">
            {isAdmin ? "Админ-панель" : "Учительская"}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {user?.email}
          </span>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue={isAdmin ? "stats" : "lobbies"} className="space-y-6">
          <TabsList>
            {isAdmin && (
              <TabsTrigger value="stats">
                <Users className="w-4 h-4 mr-1" />
                Статистика
              </TabsTrigger>
            )}
            <TabsTrigger value="lobbies">
              <GraduationCap className="w-4 h-4 mr-1" />
              Лобби (Уроки)
            </TabsTrigger>
          </TabsList>

          {/* Stats & Users Tab (Only for Super Admin) */}
          {isAdmin && (
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Пользователей</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{users.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Всего сайтов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{totalSites}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Онлайн сейчас</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-500">
                      {users.filter(u => u.last_sign_in_at && (Date.now() - new Date(u.last_sign_in_at).getTime() < 1000 * 60 * 15)).length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="w-4 h-4" />
                    Все пользователи
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingUsers ? (
                    <p className="text-muted-foreground p-6">Загрузка...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/30">
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Имя</th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Проекты</th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Роль</th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u, idx) => {
                            const isSysOwner = u.email?.toLowerCase() === 'alfacompofficial@gmail.com';
                            const isOnline = u.last_sign_in_at
                              ? Date.now() - new Date(u.last_sign_in_at).getTime() < 1000 * 60 * 15
                              : false;
                            const isUserAdmin = u.role === 'admin' || u.role === 'teacher';

                            return (
                              <tr
                                key={u.id}
                                className={`border-b border-border/30 transition-colors hover:bg-muted/20 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                              >
                                {/* Name + Avatar + Online dot */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative shrink-0">
                                      <Avatar className="w-9 h-9 border border-border/50">
                                        {u.avatar_url
                                          ? <img src={u.avatar_url} alt="av" className="object-cover rounded-full" />
                                          : <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                              {u.display_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        }
                                      </Avatar>
                                      <span
                                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
                                        title={isOnline ? 'В сети' : 'Не в сети'}
                                      />
                                    </div>
                                    <span className="font-medium truncate max-w-[120px]">
                                      {u.display_name || u.email?.split('@')[0] || 'Пользователь'}
                                      {isOnline && <span className="ml-1.5 text-green-500 text-[10px]">●</span>}
                                    </span>
                                  </div>
                                </td>

                                {/* Email */}
                                <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">
                                  {u.email}
                                </td>

                                {/* Projects count */}
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-muted/60 text-xs font-mono font-semibold">
                                    {userProjectCounts[u.id] ?? '—'}
                                  </span>
                                </td>

                                {/* Role */}
                                <td className="px-4 py-3">
                                  {isSysOwner ? (
                                    <span className="text-yellow-500 font-semibold text-xs">Владелец</span>
                                  ) : isUserAdmin ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                                      disabled={!isOwner}
                                      onClick={() => handleChangeRole(u.id, 'student')}
                                      title="Снять права"
                                    >
                                      <ShieldOff className="w-3.5 h-3.5" /> Снять
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-1.5 text-xs hover:text-primary"
                                      disabled={!isOwner}
                                      onClick={() => handleChangeRole(u.id, 'admin')}
                                      title="Сделать админом"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" /> Сделать
                                    </Button>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-8 gap-1.5 text-xs"
                                      onClick={() => handleOpenProjects(u)}
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Проект
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1.5 text-xs"
                                      onClick={() => { setLobbyTargetUser(u); setAddToLobbyDialogOpen(true); }}
                                      title="Добавить в лобби"
                                    >
                                      <GraduationCap className="w-3.5 h-3.5" />
                                    </Button>
                                    {!isSysOwner && (
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleDeleteUser(u.id)}
                                        title="Удалить пользователя"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Lobbies Tab (For Teachers/Admins) */}
          <TabsContent value="lobbies" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Ваши актуальные лобби</h3>
                </div>
                
                {lobbies.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
                      <GraduationCap className="w-12 h-12 mb-3 opacity-20" />
                      Вы еще не создали ни одного лобби
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {lobbies.map((lobby) => (
                      <Card key={lobby.id} className="border-primary/20 hover:border-primary/50 transition-colors">
                        <CardContent className="py-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${lobby.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <h4 className="font-semibold text-lg">{lobby.title}</h4>
                            </div>
                            <div className="flex gap-3 text-sm text-muted-foreground">
                              <span>Код: <strong className="text-foreground tracking-wider">{lobby.code}</strong></span>
                              <span>•</span>
                              <span>Язык: {lobby.language}</span>
                              <span>•</span>
                              <span>{new Date(lobby.created_at).toLocaleDateString("ru-RU")}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              navigator.clipboard.writeText(lobby.code);
                              toast.success("Код скопирован");
                            }}>
                              <Copy className="w-4 h-4 mr-1" /> Код
                            </Button>
                            <Button variant="hero" size="sm" onClick={() => navigate(`/lobby?id=${lobby.id}`)}>
                              <Play className="w-4 h-4 mr-1" /> Войти
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteLobby(lobby.id, lobby.title)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Lobby Pane */}
              <Card className="lg:col-span-1 border-primary/20 border-2 shadow-lg h-fit sticky top-20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Создать новое лобби
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateLobby} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Тема урока</label>
                      <input
                        type="text"
                        required
                        value={lobbyTitle}
                        onChange={(e) => setLobbyTitle(e.target.value)}
                        placeholder="Например: Урок 7 - CSS Grid"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Язык</label>
                      <select
                        value={lobbyLang}
                        onChange={(e) => setLobbyLang(e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="HTML/CSS/JS">Web (HTML/CSS/JS)</option>
                        <option value="Python">Python</option>
                      </select>
                    </div>

                    <Button type="submit" variant="hero" className="w-full" disabled={creatingLobby}>
                      {creatingLobby ? "Создание..." : "Сгенерировать код"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Projects Dialog */}
      <Dialog open={projectsDialogOpen} onOpenChange={setProjectsDialogOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b shrink-0 bg-muted/20">
            <DialogTitle>Проекты: {selectedUser?.display_name || selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 bg-background">
            {viewingSite ? (
              <Card className="border-border/50 shadow-md h-full flex flex-col">
                <CardHeader className="py-3 px-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {viewingSite.title || viewingSite.subdomain} <span className="text-muted-foreground text-sm font-normal">(/site/{viewingSite.subdomain})</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="hero" size="sm" onClick={handleSaveAsTeacher} disabled={saving}>
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? "Сохранение..." : "Сохранить код"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setViewingSite(null)}>
                        Закрыть
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                    <TabsList className="mb-2 w-fit">
                      <TabsTrigger value="html" className="font-mono text-sm">HTML</TabsTrigger>
                      <TabsTrigger value="css" className="font-mono text-sm">CSS</TabsTrigger>
                      <TabsTrigger value="js" className="font-mono text-sm">JavaScript</TabsTrigger>
                      <TabsTrigger value="preview" className="font-mono text-sm text-primary">▶ Результат</TabsTrigger>
                    </TabsList>
                    <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
                      {activeTab === "html" && (
                        <CodeEditor language="html" value={htmlCode} onChange={setHtmlCode} />
                      )}
                      {activeTab === "css" && (
                        <CodeEditor language="css" value={cssCode} onChange={setCssCode} />
                      )}
                      {activeTab === "js" && (
                        <CodeEditor language="javascript" value={jsCode} onChange={setJsCode} />
                      )}
                      {activeTab === "preview" && (
                        <div className="h-full w-full bg-white">
                          <iframe
                            srcDoc={generatePreview(htmlCode, cssCode, jsCode)}
                            className="w-full h-full border-0"
                            title="Preview"
                            sandbox="allow-scripts allow-modals"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 shrink-0">
                      <Lock className="w-3 h-3" />
                      Вы редактируете этот код в режиме учителя. Ученик увидит эти изменения сразу после сохранения.
                    </p>
                  </Tabs>
                </CardContent>
              </Card>
            ) : userSites.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
                <p>У этого пользователя пока нет проектов</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userSites.map((site) => (
                  <Card key={site.id} className="cursor-pointer hover:border-primary/50 transition-colors border-border/50" onClick={() => handleOpenSite(site)}>
                    <CardContent className="py-4 flex flex-col justify-between h-full gap-4">
                      <div className="flex items-start gap-3">
                        <Globe className="w-6 h-6 text-primary/50 shrink-0 mt-1" />
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{site.title || "Без названия"}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 line-clamp-1">/site/{site.subdomain}</p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-1" /> Редактировать
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add To Lobby Dialog */}
      <Dialog open={addToLobbyDialogOpen} onOpenChange={setAddToLobbyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить {lobbyTargetUser?.display_name || lobbyTargetUser?.email} в лобби</DialogTitle>
            <DialogDescription>
              Выберите лобби, чтобы ученик автоматически присоединился к уроку
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {lobbies.length === 0 ? (
              <p className="text-center text-muted-foreground">У вас нет активных лобби.</p>
            ) : (
              lobbies.map(l => (
                <div key={l.id} className="flex items-center justify-between border p-3 rounded-md hover:bg-muted/30">
                  <div>
                    <p className="font-medium">{l.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{l.code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleAddUserToLobby(l.id)}>
                    Добавить
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
