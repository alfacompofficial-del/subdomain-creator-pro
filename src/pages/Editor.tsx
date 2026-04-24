import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CodeEditor from "@/components/CodeEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import TerminalApp from "@/components/TerminalApp";
import JsTerminal from "@/components/JsTerminal";
import { Code2, Eye, Save, ArrowLeft, Globe, Search, Copy, ExternalLink } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { AiAssistantPanel } from "@/components/AiAssistantPanel";

const SITE_BASE_URL = `${window.location.origin}/site`;

export default function Editor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const urlLang = searchParams.get("lang") || "html";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [currentLang, setCurrentLang] = useState<"html" | "css" | "javascript" | "python">(urlLang as any);

  const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Мой сайт</title>
</head>
<body>

</body>
</html>`;

  const DEFAULT_PYTHON = `def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("World"))`;

  const DEFAULT_JS = `console.log("Hello, World!");\n\nfunction calculate(a, b) {\n    return a + b;\n}\n\nconsole.log("Result:", calculate(5, 7));`;

  const getInitialCode = () => {
    if (currentLang === "python") return DEFAULT_PYTHON;
    if (currentLang === "javascript") return DEFAULT_JS;
    return DEFAULT_HTML;
  };

  const [htmlCode, setHtmlCode] = useState(isEditing ? "" : getInitialCode());
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [subdomain, setSubdomain] = useState(
    isEditing ? "" : currentLang === "html" ? "" : `proj-${Math.random().toString(36).substring(2, 8)}`
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("html");
  const [showPreview, setShowPreview] = useState(false);
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowAiPanel(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) loadSite();
  }, [id, user]);

  const loadSite = async () => {
    const { data, error } = await supabase
      .from("sites")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single();

    if (error || !data) {
      toast.error("Сайт не найден");
      navigate("/dashboard");
      return;
    }

    setHtmlCode(data.html_code || "");
    setCssCode(data.css_code || "");
    setJsCode(data.js_code || "");
    setSubdomain(data.subdomain);
    setTitle(data.title || "");
    setDescription(data.description || "");
    
    // Detect language from keywords tag
    const keywordsVal = data.keywords || "";
    if (keywordsVal.includes("_lang:python")) setCurrentLang("python");
    else if (keywordsVal.includes("_lang:javascript")) setCurrentLang("javascript");
    else if (keywordsVal.includes("_lang:html")) setCurrentLang("html");
    
    setKeywords(keywordsVal.replace(/_lang:[a-z]+,?\s?/, ""));
  };

  const generatePreview = () => {
    if (currentLang !== "html") return "";
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords}">
  <style>${cssCode}</style>
</head>
<body>
${htmlCode}
<script>${jsCode}<\/script>
</body>
</html>`;
  };

  const handleSave = async () => {
    if (!subdomain.trim()) {
      toast.error("Укажите имя для ссылки");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      toast.error("Имя может содержать только буквы (a-z), цифры и дефис");
      return;
    }

    setSaving(true);

    const siteData = {
      user_id: user!.id,
      subdomain: subdomain.toLowerCase(),
      html_code: htmlCode,
      css_code: cssCode,
      js_code: jsCode,
      title,
      description,
      keywords: `_lang:${currentLang}${keywords ? `, ${keywords}` : ""}`,
      full_html: generatePreview(),
    };

    let saveError;
    let insertedId = null;

    if (isEditing) {
      const { error } = await supabase.from("sites").update(siteData).eq("id", id);
      saveError = error;
    } else {
      const { data, error } = await supabase.from("sites").insert(siteData).select("id").single();
      saveError = error;
      if (!error && data) {
        insertedId = data.id;
      }
    }

    if (saveError) {
      if (saveError.code === "23505") {
        toast.error("Это имя уже занято, выберите другое");
      } else {
        toast.error("Ошибка сохранения: " + saveError.message);
      }
    } else {
      const link = `${SITE_BASE_URL}/${subdomain}`;
      setSavedLink(link);
      toast.success(currentLang === "html" ? (isEditing ? "Сайт обновлён!" : "Сайт создан!") : "Проект сохранён!");
      
      // If we just created the site, redirect to its edit URL so future saves update instead of inserting
      if (insertedId) {
        navigate(`/editor/${insertedId}?lang=${currentLang}`, { replace: true });
      } else {
        // Even if editing, update the URL to ensure lang param is present
        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has("lang")) {
           navigate(`/editor/${id}?lang=${currentLang}`, { replace: true });
        }
      }
    }
    setSaving(false);
  };

  const copyLink = () => {
    if (savedLink) {
      navigator.clipboard.writeText(savedLink);
      toast.success("Ссылка скопирована!");
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Назад
            </Button>
            <span className="text-sm text-muted-foreground">
              {isEditing ? "Редактирование" : "Новый проект"}
              {currentLang !== "html" && <span className="ml-2 px-2 py-0.5 rounded bg-white/10 uppercase text-xs">{currentLang}</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentLang === "html" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-1" />
                {showPreview ? "Код" : "Превью"}
              </Button>
            )}
            <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Сохранение..." : (currentLang === "html" ? "Опубликовать" : "Сохранить")}
            </Button>
          </div>
        </div>
      </header>

      {/* Success banner with link */}
      {savedLink && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="container flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">
                {currentLang === "html" ? "Ваш сайт:" : "Проект сохранен:"}
              </span>
              <code className="text-sm font-mono text-primary truncate">{savedLink}</code>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="w-4 h-4 mr-1" />
                Копировать
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(savedLink, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Открыть
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Settings panel - ONLY FOR HTML PROJECTS */}
        {currentLang === "html" && (
          <aside className={`${activeTab === 'settings' && !showPreview ? 'block' : 'hidden'} lg:block w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border/50 bg-card/30 p-4 space-y-4 overflow-y-auto shrink-0 max-h-screen lg:max-h-none`}>
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" />
                Настройки ссылки
              </h3>
              <div className="space-y-2">
                <Label htmlFor="subdomain">Имя сайта (в ссылке)</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/site/</span>
                  <Input
                    id="subdomain"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                    placeholder="mysite"
                    className="font-mono"
                  />
                </div>
                {subdomain && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {SITE_BASE_URL}/{subdomain}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Search className="w-4 h-4" />
                SEO настройки
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="title">Заголовок (title)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Мой крутой сайт"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">{title.length}/60</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Описание (meta description)</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Описание для поисковых систем"
                    maxLength={160}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">{description.length}/160</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Ключевые слова</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="сайт, html, веб"
                  />
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Editor / Preview */}
        <main className={`${activeTab === 'settings' && !showPreview && currentLang === 'html' ? 'hidden' : 'flex'} lg:flex flex-1 flex-col h-[700px] md:h-[800px] lg:h-auto min-h-0 shrink-0 relative`}>
          {currentLang === "html" ? (
            showPreview ? (
              <div className="flex-1 bg-background relative h-full">
                <iframe
                  srcDoc={generatePreview()}
                  className="w-full h-full border-0 absolute inset-0"
                  title="Превью сайта"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div className="flex justify-between items-center mx-4 mt-4">
                    <TabsList className="w-fit flex flex-wrap gap-1">
                      <TabsTrigger value="settings" className="lg:hidden font-mono text-sm">Настройки</TabsTrigger>
                      <TabsTrigger value="html" className="font-mono text-sm">HTML</TabsTrigger>
                      <TabsTrigger value="css" className="font-mono text-sm">CSS</TabsTrigger>
                      <TabsTrigger value="js" className="font-mono text-sm">JavaScript</TabsTrigger>
                    </TabsList>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="hidden md:flex">
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить код
                    </Button>
                  </div>
                  <TabsContent value="html" className="flex-1 px-4 pb-4">
                    <CodeEditor language="html" value={htmlCode} onChange={setHtmlCode} />
                  </TabsContent>
                  <TabsContent value="css" className="flex-1 px-4 pb-4">
                    <CodeEditor language="css" value={cssCode} onChange={setCssCode} />
                  </TabsContent>
                  <TabsContent value="js" className="flex-1 px-4 pb-4">
                    <CodeEditor language="javascript" value={jsCode} onChange={setJsCode} />
                  </TabsContent>
                </Tabs>
              </div>
            )
          ) : (
            <div className="flex-1 flex p-4 min-h-0 relative overflow-hidden h-full">
              <PanelGroup direction={isDesktop ? "horizontal" : "vertical"} className="w-full h-full">
                <Panel defaultSize={50} minSize={20} className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border/40 flex flex-col">
                  <div className="bg-muted px-4 py-2 flex justify-between items-center border-b border-border/40 shrink-0">
                    <span className="text-sm font-medium text-muted-foreground uppercase">{currentLang}</span>
                    <Button size="sm" onClick={handleSave} disabled={saving} variant="outline" className="bg-background">
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить код
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      language={currentLang}
                      value={htmlCode}
                      onChange={setHtmlCode}
                    />
                  </div>
                </Panel>
                
                <PanelResizeHandle className="w-full h-4 lg:w-4 lg:h-full flex items-center justify-center bg-transparent group cursor-row-resize lg:cursor-col-resize shrink-0">
                  <div className="w-8 h-1 lg:w-1 lg:h-8 rounded-full bg-border/50 group-hover:bg-primary/50 transition-colors" />
                </PanelResizeHandle>
                
                <Panel defaultSize={50} minSize={20} className="flex-1 min-h-[300px] lg:min-h-0 rounded-lg overflow-hidden shadow-xl border border-border/40 flex flex-col">
                  {currentLang === "python" && <TerminalApp code={htmlCode} onCodeFix={setHtmlCode} />}
                  {currentLang === "javascript" && <JsTerminal code={htmlCode} onCodeFix={setHtmlCode} />}
                </Panel>
              </PanelGroup>
            </div>
          )}

          {showAiPanel && (
            <AiAssistantPanel 
              code={currentLang === 'html' ? (activeTab === 'css' ? cssCode : activeTab === 'js' ? jsCode : htmlCode) : htmlCode} 
              language={currentLang === 'html' ? activeTab : currentLang}
              onApply={(newCode) => {
                if (currentLang === 'html') {
                  if (activeTab === 'css') setCssCode(newCode);
                  else if (activeTab === 'js') setJsCode(newCode);
                  else setHtmlCode(newCode);
                } else {
                  setHtmlCode(newCode);
                }
              }}
              onClose={() => setShowAiPanel(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}