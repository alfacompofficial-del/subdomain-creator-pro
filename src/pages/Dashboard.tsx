import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Plus, Globe, ExternalLink, Trash2, Copy, FileCode2, TerminalSquare } from "lucide-react";
import { Header } from "@/components/Header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const SITE_BASE_URL = `${window.location.origin}/site`;

interface Site {
  id: string;
  subdomain: string;
  title: string;
  description: string;
  keywords: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, isTeacher } = useAdmin();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchSites();
  }, [user]);

  const fetchSites = async () => {
    const { data, error } = await supabase
      .from("sites").select("*").eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (!error && data) setSites(data);
    setLoading(false);
  };

  const deleteSite = async (id: string) => {
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (error) toast.error("Ошибка удаления");
    else { toast.success("Сайт удалён"); setSites(sites.filter(s => s.id !== id)); }
  };

  const copySiteLink = (subdomain: string) => {
    navigator.clipboard.writeText(`${SITE_BASE_URL}/${subdomain}`);
    toast.success("Ссылка скопирована!");
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Content */}
      <main className="container py-6 md:py-8">
        <div className="flex items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Мои сайты & Проекты</h1>
            <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Управляйте своими опубликованными проектами</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="hero" size="sm" className="md:text-sm shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Создать
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-sans">
              <DropdownMenuItem onClick={() => navigate("/editor")} className="cursor-pointer font-medium py-2">
                <Globe className="w-4 h-4 mr-2" />
                HTML / CSS / JS Сайт
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/editor?lang=python")} className="cursor-pointer font-medium py-2">
                <TerminalSquare className="w-4 h-4 mr-2" />
                Python Проект
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/editor?lang=javascript")} className="cursor-pointer font-medium py-2">
                <FileCode2 className="w-4 h-4 mr-2" />
                Обычный JS Проект
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-full mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : sites.length === 0 ? (
          <Card className="text-center py-12 md:py-16">
            <CardContent>
              <Globe className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">Пока нет сайтов</h3>
              <p className="text-muted-foreground mb-6 text-sm">Создайте свой первый проект прямо сейчас</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="hero">
                    <Plus className="w-4 h-4 mr-1" /> Создать проект
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 font-sans">
                  <DropdownMenuItem onClick={() => navigate("/editor")} className="cursor-pointer">
                    <Globe className="w-4 h-4 mr-2" /> HTML / CSS / JS Сайт
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/editor?lang=python")} className="cursor-pointer">
                    <TerminalSquare className="w-4 h-4 mr-2" /> Python Проект
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/editor?lang=javascript")} className="cursor-pointer">
                    <FileCode2 className="w-4 h-4 mr-2" /> Обычный JS Проект
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {sites.map(site => (
              <Card key={site.id} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">{site.title || "Без названия"}</CardTitle>
                      <CardDescription className="mt-1 font-mono text-xs truncate">
                        /site/{site.subdomain}
                      </CardDescription>
                    </div>
                    {/* Always visible on mobile, hover on desktop */}
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => copySiteLink(site.subdomain)} title="Скопировать ссылку">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => deleteSite(site.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {site.description || "Без описания"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1"
                      onClick={() => {
                        let langParam = "";
                        if (site.keywords?.includes("_lang:python")) langParam = "?lang=python";
                        else if (site.keywords?.includes("_lang:javascript")) langParam = "?lang=javascript";
                        
                        navigate(`/editor/${site.id}${langParam}`);
                      }}>
                      <Code2 className="w-3.5 h-3.5 mr-1" /> Редактировать
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                      onClick={() => window.open(`${SITE_BASE_URL}/${site.subdomain}`, "_blank")}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}