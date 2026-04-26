import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileIcon, getLanguageFromExt } from "@/components/FileIcon";
import IdeAiPanel from "@/components/IdeAiPanel";
import TerminalApp from "@/components/TerminalApp";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { FolderOpen, FilePlus, FolderPlus, ChevronRight, ChevronDown, X, ArrowLeft, Trash2, Sparkles, RefreshCw, Terminal as TerminalIcon, Play, Globe, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const idb = {
  get(key: string): Promise<any> {
    return new Promise((resolve) => {
      const req = indexedDB.open('alfa-ide-db', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('fsa');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('fsa')) return resolve(null);
        const tReq = db.transaction('fsa', 'readonly').objectStore('fsa').get(key);
        tReq.onsuccess = () => resolve(tReq.result);
        tReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  },
  set(key: string, val: any): Promise<void> {
    return new Promise((resolve) => {
      const req = indexedDB.open('alfa-ide-db', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('fsa');
      req.onsuccess = () => {
        const tx = req.result.transaction('fsa', 'readwrite');
        tx.objectStore('fsa').put(val, key);
        tx.oncomplete = () => resolve();
      };
      req.onerror = () => resolve();
    });
  }
};

interface FsNode {
  name: string;
  kind: "file" | "directory";
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  parentHandle: FileSystemDirectoryHandle | null;
  path: string;
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  language: string;
  handle: FileSystemFileHandle;
  dirty: boolean;
}

function AlfaLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#4dabf7"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs>
      <polygon points="20,10 40,10 50,25 30,25" fill="url(#lg)" opacity="0.9"/>
      <polygon points="60,10 80,10 90,25 70,25" fill="url(#lg)" opacity="0.7"/>
      <polygon points="10,35 30,35 40,50 20,50" fill="url(#lg)" opacity="0.8"/>
      <polygon points="40,35 60,35 70,50 50,50" fill="url(#lg)"/>
      <polygon points="70,35 90,35 100,50 80,50" fill="url(#lg)" opacity="0.6"/>
      <polygon points="20,60 40,60 50,75 30,75" fill="url(#lg)" opacity="0.7"/>
      <polygon points="50,60 70,60 80,75 60,75" fill="url(#lg)" opacity="0.9"/>
    </svg>
  );
}

const MENUS = ["File","Edit","Selection","View","Go","Run","Terminal","Help"];

function MenuBar({ onOpenFolder, onSave, onNewFile, onNewFolder, onToggleTerminal, onToggleAi, showTerminal, showAi, hasFolder }: any) {
  const [open, setOpen] = useState<string|null>(null);
  const items: Record<string, {label:string;action?:()=>void;shortcut?:string}[]> = {
    File:[
      {label:"Открыть папку",action:onOpenFolder,shortcut:"Ctrl+Shift+O"},
      {label:"Новый файл",action:()=>hasFolder&&onNewFile(),shortcut:"Ctrl+N"},
      {label:"Новая папка",action:()=>hasFolder&&onNewFolder()},
      {label:"Сохранить",action:onSave,shortcut:"Ctrl+S"},
    ],
    Edit:[{label:"Отменить",shortcut:"Ctrl+Z"},{label:"Повторить",shortcut:"Ctrl+Y"},{label:"Найти",shortcut:"Ctrl+F"},{label:"Заменить",shortcut:"Ctrl+H"}],
    Selection:[{label:"Выбрать всё",shortcut:"Ctrl+A"}],
    View:[{label:showTerminal?"Скрыть терминал":"Показать терминал",action:onToggleTerminal,shortcut:"Ctrl+`"},{label:showAi?"Скрыть AI":"Показать AI",action:onToggleAi}],
    Go:[{label:"Перейти к строке",shortcut:"Ctrl+G"}],
    Run:[{label:"Запустить файл",action:onSave,shortcut:"F5"}],
    Terminal:[{label:showTerminal?"Закрыть терминал":"Открыть терминал",action:onToggleTerminal,shortcut:"Ctrl+`"}],
    Help:[{label:"О программе"}],
  };
  return (
    <div className="flex items-center h-9 bg-[#1a1d27] border-b border-white/8 select-none shrink-0 relative z-50">
      <div className="flex items-center px-3 mr-1"><AlfaLogo /></div>
      {MENUS.map(m=>(
        <div key={m} className="relative">
          <button className={`px-3 h-9 text-xs text-white/60 hover:text-white hover:bg-white/8 transition-colors ${open===m?"bg-white/10 text-white":""}`}
            onClick={()=>setOpen(open===m?null:m)} onMouseEnter={()=>open&&setOpen(m)}>{m}</button>
          {open===m&&(
            <div className="absolute left-0 top-9 min-w-[210px] bg-[#1e2130] border border-white/12 rounded shadow-xl py-1 z-50">
              {items[m]?.map((it,i)=>(
                <button key={i} className="w-full text-left px-4 py-1.5 text-xs text-white/70 hover:bg-white/8 hover:text-white flex items-center justify-between gap-6"
                  onClick={()=>{it.action?.();setOpen(null);}}>
                  <span>{it.label}</span>
                  {it.shortcut&&<span className="text-white/30 text-[10px]">{it.shortcut}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {open&&<div className="fixed inset-0 z-40" onClick={()=>setOpen(null)}/>}
    </div>
  );
}

function TreeNode({node,depth,activeTab,refreshId,onFileClick,onDelete,onContextMenu}:{node:FsNode;depth:number;activeTab:string|null;refreshId:number;onFileClick:(n:FsNode)=>void;onDelete:(n:FsNode)=>void;onContextMenu:(e:React.MouseEvent,n:FsNode)=>void}) {
  const [expanded,setExpanded]=useState(false);
  const [children,setChildren]=useState<FsNode[]>([]);
  const [hover,setHover]=useState(false);
  const isActive=node.kind==="file"&&activeTab===node.path;
  const prevRefreshId=useRef(refreshId);

  const fetchChildren = async () => {
    const nodes = await readDir(node.handle as FileSystemDirectoryHandle, node.path, node.handle as FileSystemDirectoryHandle);
    setChildren(nodes);
  };

  useEffect(() => {
    if (expanded && refreshId !== prevRefreshId.current) {
      prevRefreshId.current = refreshId;
      fetchChildren();
    }
  }, [refreshId, expanded]);

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false);
    } else {
      if (children.length === 0) {
        await fetchChildren();
      }
      setExpanded(true);
    }
  };

  return (
    <div>
      <div className={`flex items-center gap-1 cursor-pointer text-xs rounded-sm group transition-colors overflow-hidden ${isActive?"bg-white/10 text-white":"text-white/60 hover:text-white hover:bg-white/5"}`}
        style={{paddingLeft:`${8+depth*12}px`,paddingTop:"2px",paddingBottom:"2px",paddingRight:"6px"}}
        onClick={()=>node.kind==="directory"?toggleExpand():onFileClick(node)}
        onContextMenu={(e)=>{e.preventDefault();e.stopPropagation();onContextMenu(e,node);}}
        onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
        {node.kind==="directory"?(expanded?<ChevronDown className="w-3 h-3 shrink-0 text-white/30"/>:<ChevronRight className="w-3 h-3 shrink-0 text-white/30"/>):<span className="w-3 shrink-0"/>}
        <FileIcon name={node.name} isDirectory={node.kind==="directory"} isOpen={expanded} size={14}/>
        <span className="truncate ml-1 text-[12px] flex-1">{node.name}</span>
        {hover&&node.parentHandle&&(
          <button className="p-0.5 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 shrink-0"
            onClick={e=>{e.stopPropagation();onDelete(node);}}>
            <Trash2 className="w-3 h-3"/>
          </button>
        )}
      </div>
      {node.kind==="directory"&&expanded&&children.map(c=>(
        <TreeNode key={c.path} node={c} depth={depth+1} activeTab={activeTab} refreshId={refreshId} onFileClick={onFileClick} onDelete={onDelete} onContextMenu={onContextMenu}/>
      ))}
    </div>
  );
}

async function readDir(handle: FileSystemDirectoryHandle, path="", parentHandle: FileSystemDirectoryHandle|null=null): Promise<FsNode[]> {
  const nodes: FsNode[]=[];
  for await (const [name,entry] of (handle as any).entries()) {
    const p=path?`${path}/${name}`:name;
    nodes.push({name,kind:entry.kind,handle:entry,parentHandle:handle,path:p});
  }
  return nodes.sort((a,b)=>a.kind!==b.kind?(a.kind==="directory"?-1:1):a.name.localeCompare(b.name));
}

async function readFileContent(h: FileSystemFileHandle): Promise<string> {
  const f=await h.getFile(); return f.text();
}

async function writeFileContent(h: FileSystemFileHandle, content: string): Promise<void> {
  const w=await (h as any).createWritable();
  await w.write(content); await w.close();
}

export default function FullIDE() {
  const {user,loading:authLoading}=useAuth();
  const navigate=useNavigate();
  const [rootHandle,setRootHandle]=useState<FileSystemDirectoryHandle|null>(null);
  const [savedHandle,setSavedHandle]=useState<FileSystemDirectoryHandle|null>(null);
  const [tree,setTree]=useState<FsNode[]>([]);
  const [refreshId,setRefreshId]=useState(0);
  const [tabs,setTabs]=useState<OpenTab[]>([]);
  const [activeTabPath,setActiveTabPath]=useState<string|null>(null);
  const [showTerminal,setShowTerminal]=useState(false);
  const [showAi,setShowAi]=useState(true);
  const [contextMenu,setContextMenu]=useState<{x:number,y:number,node:FsNode|null,isRoot?:boolean}|null>(null);
  const [dialog,setDialog]=useState<"file"|"folder"|null>(null);
  const [deleteConfirm,setDeleteConfirm]=useState<FsNode|null>(null);
  const [newName,setNewName]=useState("");
  const saveTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const rootHandleRef=useRef<FileSystemDirectoryHandle|null>(null);

  useEffect(()=>{if(!authLoading&&!user)navigate("/auth");},[user,authLoading,navigate]);

  useEffect(()=>{
    idb.get('ide-root').then(h => {
      if(h) setSavedHandle(h);
    });
  },[]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.ctrlKey&&e.key==="s"){e.preventDefault();saveActive();}
      if(e.ctrlKey&&e.key==="`"){e.preventDefault();setShowTerminal(v=>!v);}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  });

  const openFolder=async()=>{
    try {
      const h=await (window as any).showDirectoryPicker({mode:"readwrite"});
      await idb.set('ide-root', h);
      rootHandleRef.current=h;
      setRootHandle(h);
      setSavedHandle(null);
      setTabs([]);
      setActiveTabPath(null);
      const nodes=await readDir(h);
      setTree(nodes);
      toast.success(`Папка "${h.name}" открыта`);
    } catch(e:any){if(e.name!=="AbortError")toast.error("Не удалось открыть папку");}
  };

  const restoreFolder=async()=>{
    if(!savedHandle)return;
    try {
      const status = await (savedHandle as any).queryPermission({mode:"readwrite"});
      if(status !== 'granted') {
        const req = await (savedHandle as any).requestPermission({mode:"readwrite"});
        if(req !== 'granted') throw new Error('Permission denied');
      }
      rootHandleRef.current=savedHandle;
      setRootHandle(savedHandle);
      setTabs([]);
      setActiveTabPath(null);
      const nodes=await readDir(savedHandle);
      setTree(nodes);
      toast.success(`Папка "${savedHandle.name}" восстановлена`);
    } catch {
      toast.error("Не удалось восстановить доступ к папке. Выберите её заново.");
    }
  };

  const refreshTree=useCallback(async()=>{
    const h=rootHandleRef.current;
    if(!h)return;
    const nodes=await readDir(h);
    setTree(nodes);
    setRefreshId(r=>r+1);
  },[]);

  const openFile=async(node:FsNode)=>{
    if(node.kind!=="file")return;
    const existing=tabs.find(t=>t.path===node.path);
    if(existing){setActiveTabPath(node.path);return;}
    try {
      const content=await readFileContent(node.handle as FileSystemFileHandle);
      const tab:OpenTab={path:node.path,name:node.name,content,language:getLanguageFromExt(node.name),handle:node.handle as FileSystemFileHandle,dirty:false};
      setTabs(prev=>[...prev,tab]);
      setActiveTabPath(node.path);
    } catch{toast.error("Не удалось открыть файл");}
  };

  const closeTab=(path:string)=>{
    setTabs(prev=>{
      const idx=prev.findIndex(t=>t.path===path);
      const next=prev.filter(t=>t.path!==path);
      if(activeTabPath===path)setActiveTabPath(next[idx-1]?.path||next[0]?.path||null);
      return next;
    });
  };

  const saveTab=useCallback(async(path:string,content:string)=>{
    const tab=tabs.find(t=>t.path===path);
    if(!tab)return;
    try {
      await writeFileContent(tab.handle,content);
      setTabs(prev=>prev.map(t=>t.path===path?{...t,dirty:false}:t));
      toast.success("Сохранено",{duration:1000});
    } catch(e:any){toast.error("Ошибка сохранения: "+e.message);}
  },[tabs]);

  const saveActive=useCallback(()=>{
    if(!activeTabPath)return;
    const tab=tabs.find(t=>t.path===activeTabPath);
    if(tab)saveTab(tab.path,tab.content);
  },[activeTabPath,tabs,saveTab]);

  const updateTabContent=(path:string,content:string)=>{
    setTabs(prev=>prev.map(t=>t.path===path?{...t,content,dirty:true}:t));
    if(saveTimerRef.current)clearTimeout(saveTimerRef.current);
    saveTimerRef.current=setTimeout(async()=>{
      const t=tabs.find(x=>x.path===path);
      if(t)await writeFileContent(t.handle,content).catch(()=>{});
      setTabs(prev=>prev.map(x=>x.path===path?{...x,dirty:false}:x));
    },1500);
  };

  const deleteNode=async()=>{
    if(!deleteConfirm||!deleteConfirm.parentHandle)return;
    try {
      await (deleteConfirm.parentHandle as any).removeEntry(deleteConfirm.name,{recursive:true});
      if(deleteConfirm.kind==="file")closeTab(deleteConfirm.path);
      await refreshTree();
      toast.success(`"${deleteConfirm.name}" удалён`);
    } catch(e:any){toast.error("Ошибка удаления: "+e.message);}
    finally{setDeleteConfirm(null);}
  };

  const triggerDelete=(node:FsNode)=>{
    if(!node.parentHandle){toast.error("Нельзя удалить корневую папку");return;}
    setDeleteConfirm(node);
  };

  const createNew=async()=>{
    const h=rootHandleRef.current;
    if(!h||!newName.trim())return;
    try {
      const parts=newName.trim().split("/");
      const fileName=parts[parts.length-1];
      let targetDir=h;
      for(let i=0;i<parts.length-1;i++){
        targetDir=await targetDir.getDirectoryHandle(parts[i],{create:true});
      }
      if(dialog==="file"){
        const handle = await targetDir.getFileHandle(fileName,{create:true});
        if (fileName.toLowerCase().endsWith('.html')) {
          const htmlBoilerplate = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Мой сайт</title>\n</head>\n<body>\n    \n</body>\n</html>`;
          const writable = await (handle as any).createWritable();
          await writable.write(htmlBoilerplate);
          await writable.close();
        }
        toast.success(`Файл создан: ${newName}`);
      } else {
        await targetDir.getDirectoryHandle(fileName,{create:true});
        toast.success(`Папка создана: ${newName}`);
      }
      await refreshTree();
      setDialog(null);
      setNewName("");
    } catch(e:any){toast.error("Ошибка: "+e.message);}
  };

  const activeTab=tabs.find(t=>t.path===activeTabPath)||null;

  const handleMount:OnMount=(editor)=>{
    editor.addCommand(2048|49/*Ctrl+S*/,()=>saveActive());
  };

  const handleRun = () => {
    if(!activeTab)return;
    const isWeb = ["html", "css", "javascript", "typescript"].includes(activeTab.language);
    if (!isWeb) {
      setShowTerminal(true);
      toast.success("Запуск в терминале...");
      return;
    }
    // Handle Web run inside render
  };

  const openPreview = (browser: string) => {
    if(!activeTab)return;
    // We create a Blob to simulate a localhost server for the file
    let htmlContent = activeTab.content;
    if (activeTab.language !== "html") {
      // Wrap non-HTML content into an HTML document
      htmlContent = `<!DOCTYPE html><html><body><script>${htmlContent}</script></body></html>`;
    }
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    toast.success(`Открыто в новой вкладке. Вы выбрали: ${browser}. В веб-версии откроется браузер по умолчанию.`);
  };

  if(authLoading||!user)return null;

  const handleGlobalClick = () => {
    if (contextMenu) setContextMenu(null);
  };

  return (
    <div className="h-screen bg-[#12141a] flex flex-col overflow-hidden text-white" onClick={handleGlobalClick} onContextMenu={handleGlobalClick}>
      <MenuBar onOpenFolder={openFolder} onSave={saveActive} onNewFile={()=>{setDialog("file");setNewName("");}}
        onNewFolder={()=>{setDialog("folder");setNewName("");}} onToggleTerminal={()=>setShowTerminal(v=>!v)}
        onToggleAi={()=>setShowAi(v=>!v)} showTerminal={showTerminal} showAi={showAi} hasFolder={!!rootHandle}/>

      <div className="flex flex-1 overflow-hidden">
        {/* Explorer */}
        <div className="w-56 shrink-0 flex flex-col border-r border-white/8 bg-[#161820]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Проводник</span>
            <div className="flex gap-0.5">
              <button className="p-1 rounded hover:bg-white/8 text-white/30 hover:text-white/70" title="Новый файл" onClick={()=>{if(rootHandle){setDialog("file");setNewName("");}}}>
                <FilePlus className="w-3.5 h-3.5"/>
              </button>
              <button className="p-1 rounded hover:bg-white/8 text-white/30 hover:text-white/70" title="Новая папка" onClick={()=>{if(rootHandle){setDialog("folder");setNewName("");}}}>
                <FolderPlus className="w-3.5 h-3.5"/>
              </button>
              <button className="p-1 rounded hover:bg-white/8 text-white/30 hover:text-white/70" title="Обновить" onClick={refreshTree}>
                <RefreshCw className="w-3.5 h-3.5"/>
              </button>
              <button className="p-1 rounded hover:bg-white/8 text-white/30 hover:text-white/70" title="Открыть папку" onClick={openFolder}>
                <FolderOpen className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {!rootHandle?(
              <div className="flex flex-col items-center justify-center h-48 px-4 text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-white/20"/>
                </div>
                <p className="text-[11px] text-white/40">Откройте папку проекта</p>
                {savedHandle && (
                  <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white w-full shadow-lg shadow-violet-500/20 border-0 overflow-hidden justify-start px-3" onClick={restoreFolder}>
                    <FolderOpen className="w-3.5 h-3.5 mr-1.5 shrink-0"/> 
                    <span className="truncate">Открыть: {(savedHandle as any).name}</span>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 w-full transition-colors overflow-hidden justify-start px-3" onClick={openFolder}>
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5 shrink-0"/> 
                  <span className="truncate">Выбрать новую папку</span>
                </Button>
              </div>
            ):(
              <div className="py-1">
                <div className="flex items-center gap-1.5 px-2 py-1 overflow-hidden cursor-pointer hover:bg-white/5 transition-colors"
                  onContextMenu={(e)=>{e.preventDefault();e.stopPropagation();setContextMenu({x:e.clientX,y:e.clientY,node:null,isRoot:true});}}>
                  <div className="shrink-0 flex items-center justify-center w-[13px] h-[13px]"><FileIcon name="" isDirectory size={13}/></div>
                  <span className="text-[11px] font-semibold text-white/50 uppercase truncate block">{(rootHandle as any).name}</span>
                </div>
                {tree.map(n=><TreeNode key={n.path} node={n} depth={0} activeTab={activeTabPath} refreshId={refreshId} onFileClick={openFile} onDelete={triggerDelete} onContextMenu={(e,node)=>{setContextMenu({x:e.clientX,y:e.clientY,node});}}/>)}
              </div>
            )}
          </ScrollArea>
          {rootHandle&&(
            <div className="px-2 py-2 border-t border-white/8">
              <Button size="sm" variant="ghost" className="w-full h-7 text-[11px] text-white/30 hover:text-white/60 justify-start" onClick={openFolder}>
                <FolderOpen className="w-3.5 h-3.5 mr-1.5"/> Сменить папку
              </Button>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center bg-[#161820] border-b border-white/8 shrink-0 overflow-x-auto">
            <Button variant="ghost" size="sm" className="h-9 px-2 text-white/30 hover:text-white/60 shrink-0" onClick={()=>navigate("/dashboard")}>
              <ArrowLeft className="w-3.5 h-3.5"/>
            </Button>
            {tabs.map(tab=>(
              <div key={tab.path}
                className={`flex items-center gap-1.5 px-3 h-9 cursor-pointer border-r border-white/8 shrink-0 text-xs transition-colors ${activeTabPath===tab.path?"bg-[#12141a] text-white border-t-2 border-t-blue-500":"text-white/40 hover:text-white/70 hover:bg-white/5"}`}
                onClick={()=>setActiveTabPath(tab.path)}>
                <FileIcon name={tab.name} size={13}/>
                <span className="max-w-[120px] truncate">{tab.name}</span>
                {tab.dirty&&<span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"/>}
                <button className="ml-1 p-0.5 rounded hover:bg-white/10 text-white/20 hover:text-white/60"
                  onClick={e=>{e.stopPropagation();closeTab(tab.path);}}>
                  <X className="w-3 h-3"/>
                </button>
              </div>
            ))}
            {tabs.length===0&&(
              <span className="text-[11px] text-white/20 px-4">Выберите файл в проводнике</span>
            )}
            
            <div className="ml-auto px-2 flex items-center shrink-0">
              {activeTab && ["html", "css", "javascript", "typescript"].includes(activeTab.language) ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-500 text-white rounded gap-1 px-2">
                      <Play className="w-3.5 h-3.5 fill-current" /> Запустить
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-[#1e2130] border-white/12 text-white">
                    <DropdownMenuItem onClick={() => openPreview("Chrome")} className="cursor-pointer hover:bg-white/10 gap-2">
                      <Globe className="w-4 h-4 text-green-400" /> Chrome
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openPreview("Firefox")} className="cursor-pointer hover:bg-white/10 gap-2">
                      <Globe className="w-4 h-4 text-orange-400" /> Firefox
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openPreview("Edge")} className="cursor-pointer hover:bg-white/10 gap-2">
                      <Globe className="w-4 h-4 text-blue-400" /> Edge
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : activeTab ? (
                <Button size="sm" onClick={handleRun} className="h-7 text-xs bg-green-600 hover:bg-green-500 text-white rounded gap-1 px-2">
                  <Play className="w-3.5 h-3.5 fill-current" /> Run
                </Button>
              ) : null}
            </div>
          </div>

          {/* Monaco + Terminal */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={showTerminal?"h-[60%]":"flex-1"}>
              {activeTab?(
                <Editor height="100%" language={activeTab.language} value={activeTab.content} theme="vs-dark"
                  onMount={handleMount}
                  onChange={val=>activeTab&&updateTabContent(activeTab.path,val||"")}
                  options={{minimap:{enabled:false},fontSize:14,fontFamily:"'JetBrains Mono','Fira Code',monospace",fontLigatures:true,lineNumbers:"on",wordWrap:"on",automaticLayout:true,tabSize:4,scrollBeyondLastLine:false,padding:{top:8,bottom:8},bracketPairColorization:{enabled:true},renderLineHighlight:"all",cursorBlinking:"smooth",smoothScrolling:true,folding:true,guides:{bracketPairs:true,indentation:true},suggest:{showSnippets:true,showKeywords:true,showFunctions:true},inlineSuggest:{enabled:true}}}/>
              ):(
                <div className="flex flex-col items-center justify-center h-full gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner">
                    <FolderOpen className="w-8 h-8 text-white/20"/>
                  </div>
                  <p className="text-white/30 text-sm font-medium">Выберите файл или откройте папку</p>
                  {!rootHandle&&<Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 border-0 text-xs px-6 h-9" onClick={openFolder}><FolderOpen className="w-4 h-4 mr-2"/> Открыть папку</Button>}
                </div>
              )}
            </div>
            {showTerminal&&(
              <div className="border-t border-white/8" style={{height:"40%"}}>
                <TerminalApp code={activeTab?.language==="python"?activeTab.content:""}
                  rootHandle={rootHandle}
                  onCodeFix={newCode=>activeTab&&updateTabContent(activeTab.path,newCode)}/>
              </div>
            )}
          </div>
        </div>

        {/* AI Panel */}
        {showAi&&(
          <div className="w-64 shrink-0 flex flex-col border-l border-white/8">
            <IdeAiPanel currentCode={activeTab?.content||""} currentLang={activeTab?.language||"plaintext"} fileName={activeTab?.name}
              onApply={code=>activeTab&&updateTabContent(activeTab.path,code)}/>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="h-6 bg-[#1a1d27] border-t border-white/8 flex items-center px-3 gap-4 shrink-0">
        <span className="text-[10px] text-white/50 font-medium tracking-wide">{activeTab?activeTab.language.toUpperCase():"НЕТ ФАЙЛА"}</span>
        {activeTab?.dirty&&<span className="text-[10px] text-orange-400 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Не сохранено</span>}
        {rootHandle&&<span className="text-[10px] text-white/40 flex items-center gap-1.5"><FolderOpen className="w-3 h-3"/> {(rootHandle as any).name}</span>}
        <span className="ml-auto text-[10px] text-violet-400 flex items-center gap-1.5 font-medium bg-violet-500/10 px-2 py-0.5 rounded-sm">
          <Sparkles className="w-3 h-3"/> Gemini AI
        </span>
        <button className="text-[10px] text-white/50 hover:text-white flex items-center gap-1.5 transition-colors" onClick={()=>setShowTerminal(v=>!v)}>
          <TerminalIcon className="w-3 h-3"/> Терминал
        </button>
      </div>

      {/* Dialog */}
      <Dialog open={!!dialog} onOpenChange={()=>setDialog(null)}>
        <DialogContent className="sm:max-w-sm bg-[#1e2130] border-white/12 text-white" onClick={(e)=>e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {dialog==="file"?<FilePlus className="w-4 h-4"/>:<FolderPlus className="w-4 h-4"/>}
              {dialog==="file"?"Новый файл":"Новая папка"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[11px] text-white/40">Можно указать путь: src/main.py</p>
            <Input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&createNew()}
              placeholder={dialog==="file"?"main.py или src/utils.py":"src или components"}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/25"/>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs shadow-lg shadow-violet-500/20 border-0" onClick={createNew} disabled={!newName.trim()}>Создать</Button>
              <Button variant="outline" className="flex-1 border-white/10 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white text-xs transition-colors" onClick={()=>setDialog(null)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={()=>setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm bg-[#1e2130] border-white/12 text-white" onClick={(e)=>e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4"/>
              Подтверждение удаления
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px] text-white/70">
              Вы уверены, что хотите удалить <b>{deleteConfirm?.name}</b>?
              <br/><span className="text-[10px] text-red-400/80">Это действие нельзя отменить. Файл будет удален с вашего компьютера.</span>
            </p>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs shadow-lg shadow-red-500/20 border-0" onClick={deleteNode}>Удалить</Button>
              <Button variant="outline" className="flex-1 border-white/10 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white text-xs transition-colors" onClick={()=>setDeleteConfirm(null)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed z-[100] bg-[#1a1d27] border border-white/12 rounded-lg shadow-2xl py-1 w-48 text-white overflow-hidden"
             style={{left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 150)}}>
          {(contextMenu.isRoot || contextMenu.node?.kind === "directory") && (
            <>
              <button className="w-full text-left px-3 py-1.5 hover:bg-violet-500/20 text-[11px] flex items-center gap-2 transition-colors"
                onClick={() => {
                  setDialog("file");
                  const p = contextMenu.node ? `${contextMenu.node.path}/` : "";
                  setNewName(p);
                  setContextMenu(null);
                }}>
                <FilePlus className="w-3.5 h-3.5 text-blue-400"/> Новый файл
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-violet-500/20 text-[11px] flex items-center gap-2 transition-colors"
                onClick={() => {
                  setDialog("folder");
                  const p = contextMenu.node ? `${contextMenu.node.path}/` : "";
                  setNewName(p);
                  setContextMenu(null);
                }}>
                <FolderPlus className="w-3.5 h-3.5 text-blue-400"/> Новая папка
              </button>
              <div className="h-px bg-white/10 my-1 mx-2" />
            </>
          )}
          {contextMenu.node && (
            <button className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-[11px] flex items-center gap-2 text-red-300 transition-colors"
              onClick={() => {
                triggerDelete(contextMenu.node!);
                setContextMenu(null);
              }}>
              <Trash2 className="w-3.5 h-3.5"/> Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
