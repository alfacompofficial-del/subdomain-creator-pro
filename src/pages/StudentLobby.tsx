import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CodeEditor from "@/components/CodeEditor";
import { toast } from "sonner";
import { ArrowLeft, Save, MessageSquare } from "lucide-react";

function gradeColor(grade: number) {
  if (grade === 2) return "bg-red-500 text-white";
  if (grade === 3) return "bg-yellow-700 text-white";
  if (grade === 4) return "bg-yellow-400 text-black";
  if (grade === 5) return "bg-green-500 text-white";
  return "";
}

export default function StudentLobby() {
  const { lobbyId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [grade, setGrade] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && lobbyId) loadLobby();
  }, [user, lobbyId]);

  const loadLobby = async () => {
    const { data: lob } = await supabase.from("lobbies").select("*").eq("id", lobbyId).single();
    if (!lob) { toast.error("Лобби не найдено"); navigate("/profile"); return; }
    setLobby(lob);

    const { data: part } = await supabase
      .from("lobby_participants")
      .select("*")
      .eq("lobby_id", lobbyId)
      .eq("user_id", user!.id)
      .single();
    if (part) {
      setParticipant(part);
      setCode(part.student_code || "");
    }

    const { data: gr } = await supabase
      .from("lobby_grades")
      .select("*")
      .eq("lobby_id", lobbyId!)
      .eq("student_id", user!.id)
      .maybeSingle();
    if (gr) setGrade(gr);

    // Set online
    if (part) {
      await supabase.from("lobby_participants").update({ is_online: true }).eq("id", part.id);
    }
  };

  // Set offline on unmount
  useEffect(() => {
    return () => {
      if (participant) {
        supabase.from("lobby_participants").update({ is_online: false }).eq("id", participant.id);
      }
    };
  }, [participant]);

  // Realtime for grades
  useEffect(() => {
    if (!lobbyId || !user) return;
    const channel = supabase
      .channel(`student-grade-${lobbyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_grades", filter: `lobby_id=eq.${lobbyId}` }, (payload) => {
        const data = payload.new as any;
        if (data && data.student_id === user.id) setGrade(data);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_participants", filter: `lobby_id=eq.${lobbyId}` }, (payload) => {
        const data = payload.new as any;
        if (data && data.user_id === user.id) {
          setParticipant(data);
          setCode(data.student_code || "");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lobbyId, user]);

  const saveCode = async () => {
    if (!participant) return;
    setSaving(true);
    const { error } = await supabase
      .from("lobby_participants")
      .update({ student_code: code })
      .eq("id", participant.id);
    if (error) toast.error("Ошибка сохранения");
    else toast.success("Код сохранён");
    setSaving(false);
  };

  if (authLoading || !user || !lobby) return null;

  const lang = lobby.language === "python" ? "python" : lobby.language === "css" ? "css" : lobby.language === "javascript" ? "javascript" : "html";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Профиль
            </Button>
            <span className="font-semibold">{lobby.title}</span>
            <Badge variant={lobby.is_active ? "default" : "secondary"}>
              {lobby.is_active ? "Активно" : "Завершено"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {grade && (
              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${gradeColor(grade.grade)}`}>
                {grade.grade}
              </span>
            )}
            <Button variant="hero" size="sm" onClick={saveCode} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </header>

      {grade?.comment && (
        <div className="bg-muted/50 border-b border-border/50 px-4 py-2">
          <div className="container flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Комментарий учителя:</span>
            <span>{grade.comment}</span>
          </div>
        </div>
      )}

      <main className="flex-1 p-4">
        <CodeEditor language={lang} value={code} onChange={setCode} />
      </main>
    </div>
  );
}
