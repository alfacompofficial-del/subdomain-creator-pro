import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, Trash2, Calendar, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  created_by: string;
}

interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  comment: string | null;
  submitted_at: string;
  grade: number | null;
  teacher_comment: string | null;
}

interface HomeworkPanelProps {
  userId: string;
  isTeacher: boolean;
  /** nickname of the current user (for student view) */
  nickname?: string;
}

export default function HomeworkPanel({ userId, isTeacher, nickname }: HomeworkPanelProps) {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Teacher: create form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");
  const [creating, setCreating] = useState(false);

  // Student: submit dialog
  const [submitHw, setSubmitHw] = useState<Homework | null>(null);
  const [submitComment, setSubmitComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Teacher: view submissions dialog
  const [viewHw, setViewHw] = useState<Homework | null>(null);
  const [viewSubs, setViewSubs] = useState<HomeworkSubmission[]>([]);
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeVal, setGradeVal] = useState(5);
  const [gradeComment, setGradeComment] = useState("");

  useEffect(() => {
    fetchHomeworks();
  }, [userId]);

  const fetchHomeworks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("homeworks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setHomeworks(data);

    // Fetch own submissions (student) or all (teacher)
    const { data: subs } = await supabase
      .from("homework_submissions")
      .select("*")
      .eq(isTeacher ? "homework_id" : "student_id", isTeacher ? "" : userId);
    if (subs) setSubmissions(subs);
    setLoading(false);
  };

  // Fetch all submissions for a specific homework (teacher)
  const fetchSubmissionsForHw = async (hwId: string) => {
    const { data } = await supabase
      .from("homework_submissions")
      .select("*")
      .eq("homework_id", hwId)
      .order("submitted_at", { ascending: false });
    if (data) setViewSubs(data);
  };

  const createHomework = async () => {
    if (!newTitle.trim()) { toast.error("Введите название"); return; }
    setCreating(true);
    const { error } = await supabase.from("homeworks").insert({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      due_date: newDue ? new Date(newDue).toISOString() : null,
      created_by: userId,
    });
    if (error) toast.error("Ошибка: " + error.message);
    else {
      toast.success("Задание создано!");
      setNewTitle(""); setNewDesc(""); setNewDue("");
      setShowCreate(false);
      fetchHomeworks();
    }
    setCreating(false);
  };

  const deleteHomework = async (id: string) => {
    if (!window.confirm("Удалить задание?")) return;
    const { error } = await supabase.from("homeworks").delete().eq("id", id);
    if (error) toast.error("Ошибка удаления");
    else { toast.success("Задание удалено"); setHomeworks(prev => prev.filter(h => h.id !== id)); }
  };

  const submitHomework = async () => {
    if (!submitHw) return;
    setSubmitting(true);
    const existing = submissions.find(s => s.homework_id === submitHw.id);
    let error;
    if (existing) {
      ({ error } = await supabase.from("homework_submissions")
        .update({ comment: submitComment.trim() || null, submitted_at: new Date().toISOString() })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("homework_submissions").insert({
        homework_id: submitHw.id,
        student_id: userId,
        comment: submitComment.trim() || null,
      }));
    }
    if (error) toast.error("Ошибка: " + error.message);
    else {
      toast.success("Задание сдано!");
      setSubmitHw(null);
      setSubmitComment("");
      fetchHomeworks();
    }
    setSubmitting(false);
  };

  const saveGrade = async (subId: string) => {
    const { error } = await supabase.from("homework_submissions")
      .update({ grade: gradeVal, teacher_comment: gradeComment.trim() || null })
      .eq("id", subId);
    if (error) toast.error("Ошибка");
    else {
      toast.success("Оценка сохранена");
      setGradingSubId(null);
      fetchSubmissionsForHw(viewHw!.id);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  };

  const isOverdue = (due: string | null) => due ? new Date(due) < new Date() : false;

  const getStudentSubmission = (hwId: string) => submissions.find(s => s.homework_id === hwId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/40 bg-muted/20 shrink-0 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> Домашние задания
        </p>
        {isTeacher && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3 h-3 mr-1" /> Создать
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />)}
          </div>
        ) : homeworks.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Заданий пока нет</p>
          </div>
        ) : (
          <div className="space-y-2">
            {homeworks.map(hw => {
              const sub = !isTeacher ? getStudentSubmission(hw.id) : null;
              const overdue = isOverdue(hw.due_date);
              return (
                <Card key={hw.id} className="border-border/40">
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-tight">{hw.title}</CardTitle>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isTeacher && sub && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-500/30 bg-green-500/10">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Сдано
                          </Badge>
                        )}
                        {!isTeacher && sub?.grade && (
                          <Badge className="text-[10px]">{sub.grade}</Badge>
                        )}
                        {isTeacher && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive"
                            onClick={() => deleteHomework(hw.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 space-y-2">
                    {hw.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{hw.description}</p>
                    )}
                    {hw.due_date && (
                      <div className={`flex items-center gap-1 text-[10px] ${overdue ? "text-red-500" : "text-muted-foreground"}`}>
                        {overdue ? <Clock className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        {overdue ? "Просрочено: " : "Срок: "}{formatDate(hw.due_date)}
                      </div>
                    )}
                    {sub?.teacher_comment && (
                      <p className="text-[10px] text-primary bg-primary/10 rounded px-2 py-1">
                        Комментарий: {sub.teacher_comment}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {!isTeacher && (
                        <Button size="sm" variant={sub ? "outline" : "hero"} className="h-7 text-xs flex-1"
                          onClick={() => { setSubmitHw(hw); setSubmitComment(sub?.comment || ""); }}>
                          {sub ? "Обновить" : "Сдать"}
                        </Button>
                      )}
                      {isTeacher && (
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                          onClick={() => { setViewHw(hw); fetchSubmissionsForHw(hw.id); }}>
                          Ответы
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Teacher: Create homework dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Новое задание
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Название *</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Создать сайт-визитку" />
            </div>
            <div className="space-y-1">
              <Label>Описание</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Подробное описание задания..." rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Срок сдачи</Label>
              <Input type="datetime-local" value={newDue} onChange={e => setNewDue(e.target.value)} />
            </div>
            <Button variant="hero" className="w-full" onClick={createHomework} disabled={creating}>
              {creating ? "Создание..." : "Создать задание"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student: Submit dialog */}
      <Dialog open={!!submitHw} onOpenChange={() => setSubmitHw(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> {submitHw?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {submitHw?.description && (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{submitHw.description}</p>
            )}
            <div className="space-y-1">
              <Label>Комментарий (необязательно)</Label>
              <Textarea value={submitComment} onChange={e => setSubmitComment(e.target.value)}
                placeholder="Что сделал, что не получилось..." rows={3} />
            </div>
            <Button variant="hero" className="w-full" onClick={submitHomework} disabled={submitting}>
              {submitting ? "Отправка..." : "Сдать задание"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher: View submissions dialog */}
      <Dialog open={!!viewHw} onOpenChange={() => { setViewHw(null); setGradingSubId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewHw?.title} — ответы</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {viewSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Никто ещё не сдал</p>
            ) : (
              <div className="space-y-3 py-2">
                {viewSubs.map(sub => (
                  <Card key={sub.id} className="border-border/40">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(sub.submitted_at).toLocaleString("ru-RU")}
                        </span>
                        {sub.grade && <Badge>{sub.grade}</Badge>}
                      </div>
                      {sub.comment && <p className="text-sm">{sub.comment}</p>}
                      {sub.teacher_comment && (
                        <p className="text-xs text-primary bg-primary/10 rounded px-2 py-1">
                          Ваш комментарий: {sub.teacher_comment}
                        </p>
                      )}
                      {gradingSubId === sub.id ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex gap-2">
                            {[2, 3, 4, 5].map(g => (
                              <button key={g} onClick={() => setGradeVal(g)}
                                className={`flex-1 py-1 rounded text-sm font-bold border transition-all ${
                                  gradeVal === g ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
                                }`}>{g}</button>
                            ))}
                          </div>
                          <Input value={gradeComment} onChange={e => setGradeComment(e.target.value)}
                            placeholder="Комментарий..." className="text-sm h-8" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="hero" className="flex-1 h-7 text-xs" onClick={() => saveGrade(sub.id)}>
                              Сохранить
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGradingSubId(null)}>
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full"
                          onClick={() => { setGradingSubId(sub.id); setGradeVal(sub.grade || 5); setGradeComment(sub.teacher_comment || ""); }}>
                          {sub.grade ? "Изменить оценку" : "Поставить оценку"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
