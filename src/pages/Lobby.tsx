import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CodeEditor from "@/components/CodeEditor";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Users, Code2, Star, Download, Eye, Edit, Save, X, MessageSquare
} from "lucide-react";

function generateLobbyCode(): string {
  const prefixes = ["PYT", "FLX", "WEB", "CSS", "HTM", "JSX", "COD", "DEV"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 90 + 10).toString();
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}-${suffix}${letter}`;
}

const LANGUAGES = [
  { value: "html", label: "HTML / CSS / JS" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "css", label: "CSS" },
];

interface Lobby {
  id: string;
  title: string;
  language: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

interface Participant {
  id: string;
  lobby_id: string;
  user_id: string;
  nickname: string;
  student_code: string;
  is_online: boolean;
  joined_at: string;
}

interface Grade {
  id: string;
  lobby_id: string;
  student_id: string;
  teacher_id: string;
  grade: number;
  comment: string;
  updated_at: string;
}

function gradeColor(grade: number) {
  if (grade === 2) return "bg-red-500 text-white";
  if (grade === 3) return "bg-yellow-700 text-white";
  if (grade === 4) return "bg-yellow-400 text-black";
  if (grade === 5) return "bg-green-500 text-white";
  return "";
}

export default function LobbyPage() {
  const { user, loading: authLoading } = useAuth();
  const { isTeacher, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  // Create lobby form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLanguage, setNewLanguage] = useState("html");

  // Student code viewer
  const [viewingStudent, setViewingStudent] = useState<Participant | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  // Grading
  const [gradingStudent, setGradingStudent] = useState<Participant | null>(null);
  const [gradeValue, setGradeValue] = useState(5);
  const [gradeComment, setGradeComment] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) { navigate("/auth"); return; }
      if (!isTeacher) { navigate("/dashboard"); toast.error("Доступ только для учителей"); return; }
    }
  }, [user, authLoading, adminLoading, isTeacher, navigate]);

  useEffect(() => {
    if (user && isTeacher) fetchLobbies();
  }, [user, isTeacher]);

  const fetchLobbies = async () => {
    const { data } = await supabase
      .from("lobbies")
      .select("*")
      .eq("teacher_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setLobbies(data);
    setLoading(false);
  };

  const createLobby = async () => {
    if (!newTitle.trim()) { toast.error("Введите название урока"); return; }
    const code = generateLobbyCode();
    const { error } = await supabase.from("lobbies").insert({
      teacher_id: user!.id,
      title: newTitle.trim(),
      language: newLanguage,
      code,
    });
    if (error) { toast.error("Ошибка создания: " + error.message); return; }
    toast.success(`Лобби создано! Код: ${code}`);
    setNewTitle("");
    setShowCreate(false);
    fetchLobbies();
  };

  const selectLobby = async (lobby: Lobby) => {
    setSelectedLobby(lobby);
    setViewingStudent(null);
    setGradingStudent(null);
    // Fetch participants
    const { data: parts } = await supabase
      .from("lobby_participants")
      .select("*")
      .eq("lobby_id", lobby.id)
      .order("joined_at", { ascending: true });
    if (parts) setParticipants(parts);
    // Fetch grades
    const { data: gr } = await supabase
      .from("lobby_grades")
      .select("*")
      .eq("lobby_id", lobby.id);
    if (gr) setGrades(gr);
  };

  // Realtime subscriptions
  useEffect(() => {
    if (!selectedLobby) return;
    const channel = supabase
      .channel(`lobby-${selectedLobby.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_participants", filter: `lobby_id=eq.${selectedLobby.id}` }, () => {
        selectLobby(selectedLobby);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_grades", filter: `lobby_id=eq.${selectedLobby.id}` }, () => {
        supabase.from("lobby_grades").select("*").eq("lobby_id", selectedLobby.id).then(({ data }) => { if (data) setGrades(data); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedLobby?.id]);

  const openStudentCode = (p: Participant) => {
    setViewingStudent(p);
    setEditingCode(p.student_code);
  };

  const saveStudentCode = async () => {
    if (!viewingStudent) return;
    setSavingCode(true);
    const { error } = await supabase
      .from("lobby_participants")
      .update({ student_code: editingCode })
      .eq("id", viewingStudent.id);
    if (error) toast.error("Ошибка сохранения");
    else {
      toast.success("Код ученика сохранён");
      setViewingStudent({ ...viewingStudent, student_code: editingCode });
      setParticipants(prev => prev.map(p => p.id === viewingStudent.id ? { ...p, student_code: editingCode } : p));
    }
    setSavingCode(false);
  };

  const openGrading = (p: Participant) => {
    setGradingStudent(p);
    const existing = grades.find(g => g.student_id === p.user_id);
    if (existing) {
      setGradeValue(existing.grade);
      setGradeComment(existing.comment || "");
    } else {
      setGradeValue(5);
      setGradeComment("");
    }
  };

  const saveGrade = async () => {
    if (!gradingStudent || !selectedLobby) return;
    setSavingGrade(true);
    const existing = grades.find(g => g.student_id === gradingStudent.user_id);
    let error;
    if (existing) {
      ({ error } = await supabase.from("lobby_grades").update({ grade: gradeValue, comment: gradeComment }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("lobby_grades").insert({
        lobby_id: selectedLobby.id,
        student_id: gradingStudent.user_id,
        teacher_id: user!.id,
        grade: gradeValue,
        comment: gradeComment,
      }));
    }
    if (error) toast.error("Ошибка: " + error.message);
    else {
      toast.success("Оценка сохранена");
      setGradingStudent(null);
      const { data } = await supabase.from("lobby_grades").select("*").eq("lobby_id", selectedLobby.id);
      if (data) setGrades(data);
    }
    setSavingGrade(false);
  };

  const exportToExcel = async () => {
    if (!selectedLobby) return;
    // Build CSV-like data (simple xlsx via edge function would be ideal, but let's do CSV download for now)
    const rows = participants.map(p => {
      const g = grades.find(gr => gr.student_id === p.user_id);
      return `${p.nickname},${g?.grade || "—"},${g?.comment || ""}`;
    });
    const csv = `Ученик,Оценка,Комментарий\n${rows.join("\n")}`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedLobby.title}_оценки.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Файл скачан!");
  };

  const toggleLobbyActive = async () => {
    if (!selectedLobby) return;
    const { error } = await supabase
      .from("lobbies")
      .update({ is_active: !selectedLobby.is_active })
      .eq("id", selectedLobby.id);
    if (!error) {
      const updated = { ...selectedLobby, is_active: !selectedLobby.is_active };
      setSelectedLobby(updated);
      setLobbies(prev => prev.map(l => l.id === updated.id ? updated : l));
      toast.success(updated.is_active ? "Лобби активировано" : "Лобби завершено");
    }
  };

  if (authLoading || adminLoading || !user) return null;

  // If viewing a student's code
  if (viewingStudent && selectedLobby) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setViewingStudent(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Назад к списку
              </Button>
              <span className="text-sm font-medium">{viewingStudent.nickname}</span>
            </div>
            <Button variant="hero" size="sm" onClick={saveStudentCode} disabled={savingCode}>
              <Save className="w-4 h-4 mr-1" />
              {savingCode ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4">
          <CodeEditor
            language={selectedLobby.language === "python" ? "python" : selectedLobby.language === "css" ? "css" : selectedLobby.language === "javascript" ? "javascript" : "html"}
            value={editingCode}
            onChange={setEditingCode}
          />
        </main>
      </div>
    );
  }

  // If a lobby is selected — show participants
  if (selectedLobby) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedLobby(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Мои лобби
              </Button>
              <span className="font-semibold">{selectedLobby.title}</span>
              <Badge variant={selectedLobby.is_active ? "default" : "secondary"}>
                {selectedLobby.is_active ? "Активно" : "Завершено"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-base px-3 py-1">
                Код: {selectedLobby.code}
              </Badge>
              <Button variant="outline" size="sm" onClick={toggleLobbyActive}>
                {selectedLobby.is_active ? "Завершить" : "Активировать"}
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-1" /> Экспорт
              </Button>
            </div>
          </div>
        </header>

        <main className="container py-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Ученики ({participants.length})</h2>
          </div>

          {participants.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Пока никто не подключился</p>
                <p className="text-sm text-muted-foreground mt-1">Код для подключения: <span className="font-mono font-bold text-primary">{selectedLobby.code}</span></p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map(p => {
                const g = grades.find(gr => gr.student_id === p.user_id);
                return (
                  <Card key={p.id} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{p.nickname}</CardTitle>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.is_online ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                          {g && (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${gradeColor(g.grade)}`}>
                              {g.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {g?.comment && (
                        <p className="text-xs text-muted-foreground mb-3 flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                          {g.comment}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openStudentCode(p)}>
                          <Code2 className="w-3 h-3 mr-1" /> Код
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openGrading(p)}>
                          <Star className="w-3 h-3 mr-1" /> Оценка
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* Grading dialog */}
        <Dialog open={!!gradingStudent} onOpenChange={(open) => { if (!open) setGradingStudent(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Оценка — {gradingStudent?.nickname}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Оценка</Label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => setGradeValue(v)}
                      className={`w-12 h-12 rounded-lg text-lg font-bold transition-all ${gradeColor(v)} ${gradeValue === v ? "ring-2 ring-ring ring-offset-2" : "opacity-60 hover:opacity-80"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Textarea value={gradeComment} onChange={e => setGradeComment(e.target.value)} placeholder="Хорошая работа!" rows={3} />
              </div>
              <Button variant="hero" onClick={saveGrade} disabled={savingGrade} className="w-full">
                <Save className="w-4 h-4 mr-1" />
                {savingGrade ? "Сохранение..." : "Сохранить оценку"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Lobby list
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Дашборд
            </Button>
            <span className="font-semibold">Мои лобби</span>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Создать лобби
          </Button>
        </div>
      </header>

      <main className="container py-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
        ) : lobbies.length === 0 && !showCreate ? (
          <Card className="text-center py-16">
            <CardContent>
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Нет лобби</h3>
              <p className="text-muted-foreground mb-6">Создайте лобби для урока</p>
              <Button variant="hero" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1" /> Создать лобби
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {showCreate && (
              <Card className="mb-6 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg">Новое лобби</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Название урока</Label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Урок 7 — Циклы" />
                  </div>
                  <div className="space-y-2">
                    <Label>Язык программирования</Label>
                    <Select value={newLanguage} onValueChange={setNewLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="hero" onClick={createLobby}><Plus className="w-4 h-4 mr-1" /> Создать</Button>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lobbies.map(lobby => (
                <Card key={lobby.id} className="cursor-pointer hover:shadow-lg transition-all border-border/50" onClick={() => selectLobby(lobby)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{lobby.title}</CardTitle>
                        <CardDescription className="font-mono mt-1">Код: {lobby.code}</CardDescription>
                      </div>
                      <Badge variant={lobby.is_active ? "default" : "secondary"}>
                        {lobby.is_active ? "Активно" : "Завершено"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Язык: {LANGUAGES.find(l => l.value === lobby.language)?.label || lobby.language}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
