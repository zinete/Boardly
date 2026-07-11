import React, { useState, useEffect, useRef, useMemo } from "react";
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';
import { useKanbanStore, getAiEnabled, setAiEnabled } from "../store/useKanbanStore";
import { useTheme } from "../lib/ThemeContext";
import { openDB } from "../lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Database, Download, Upload, Trash2, RotateCcw, AlertTriangle, CheckCircle2, Loader2, FileJson, X, HardDrive, LayoutDashboard, Info, Sparkles, Check, Palette } from "lucide-react";
interface SettingsViewProps { onBackToBoard: () => void; }
export function SettingsView({ onBackToBoard }: SettingsViewProps) {
  const { tasks, labels, smartLabels, initStore, restoreDemoData } = useKanbanStore();
  const { currentTheme, setTheme, themes } = useTheme();
  const scrollbarOptions = useMemo(() => ({
    scrollbars: {
      autoHide: 'scroll' as const,
      theme: currentTheme.isDark ? 'os-theme-light' : 'os-theme-dark',
    },
  }), [currentTheme.isDark]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [quotaUsed, setQuotaUsed] = useState("0%");
  const [aiProvider, setAiProvider] = useState("gemini");
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customModel, setCustomModel] = useState("gemini-3.5-flash");
  const [customInstruction, setCustomInstruction] = useState("");
  const [aiEnabled, setAiEnabledState] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{tasks:any[];labels:any[];smartLabels:any[];fileName:string;fileSize:string;}|null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{success:boolean;message:string;response?:string;}|null>(null);
  useEffect(() => { calculateStorageSize(); }, [tasks, labels, smartLabels]);
  useEffect(() => {
    const sp = localStorage.getItem("taskflow_ai_provider") || "gemini";
    setAiProvider(sp); setUseCustomKey(localStorage.getItem("taskflow_ai_use_custom_key") === "true");
    setCustomApiKey(localStorage.getItem("taskflow_ai_custom_key") || "");
    setCustomUrl(localStorage.getItem("taskflow_ai_custom_url") || "");
    setCustomInstruction(localStorage.getItem("taskflow_ai_custom_instruction") || "");
    setAiEnabledState(getAiEnabled());
    const sm = localStorage.getItem("taskflow_ai_model") || "";
    setCustomModel(sm || (sp==="gemini"?"gemini-3.5-flash":sp==="openai"?"gpt-4o-mini":sp==="deepseek"?"deepseek-chat":sp==="anthropic"?"claude-3-5-sonnet-latest":"gpt-4o-mini"));
  }, []);
  const handleToggleAi = (enabled: boolean) => { setAiEnabledState(enabled); setAiEnabled(enabled); };
  const handleProviderChange = (p: string) => { setAiProvider(p); setCustomModel(p==="gemini"?"gemini-3.5-flash":p==="openai"?"gpt-4o-mini":p==="deepseek"?"deepseek-chat":p==="anthropic"?"claude-3-5-sonnet-latest":"gpt-4o-mini"); setCustomUrl(p==="deepseek"?"https://api.deepseek.com":""); };
  const handleSaveAiConfig = () => { localStorage.setItem("taskflow_ai_provider",aiProvider); localStorage.setItem("taskflow_ai_use_custom_key",String(useCustomKey)); localStorage.setItem("taskflow_ai_custom_key",customApiKey.trim()); localStorage.setItem("taskflow_ai_custom_url",customUrl.trim()); localStorage.setItem("taskflow_ai_model",customModel); localStorage.setItem("taskflow_ai_custom_instruction",customInstruction.trim()); setSaveSuccess(true); setTimeout(()=>setSaveSuccess(false),2500); };
  const handleTestAiConnection = async () => { setIsTestingAi(true); setTestResult(null); try { const r=await fetch("/api/test-ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:aiProvider,customApiKey:useCustomKey||aiProvider!=="gemini"?customApiKey.trim():"",customUrl:customUrl.trim(),customModel})}); const d=await r.json(); if(r.ok&&d.success)setTestResult({success:true,message:d.message||"连接测试成功！",response:d.response}); else setTestResult({success:false,message:d.error||d.message||"连接测试失败。请检查密钥和配置。"}); }catch(e:any){setTestResult({success:false,message:e.message||"网络请求错误"});}finally{setIsTestingAi(false);} };
  const calculateStorageSize = async () => { try { const b=new Blob([JSON.stringify({tasks,labels,smartLabels})]).size; setStorageBytes(b); if(navigator.storage?.estimate){const e=await navigator.storage.estimate();setQuotaUsed(`${((e.usage||0)/(e.quota||1)*100).toFixed(4)}%`);} }catch(e){console.error(e);} };
  const formatBytes = (b:number) => { if(!b)return"0 Bytes"; const k=1024,s=["Bytes","KB","MB","GB"],i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(2))+" "+s[i]; };
  const handleExport = () => { try { const bl=new Blob([JSON.stringify({version:1,appName:"TaskFlow AI",exportedAt:new Date().toISOString(),tasks,labels,smartLabels},null,2)],{type:"application/json"}); const u=URL.createObjectURL(bl); const a=document.createElement("a"); a.href=u; a.download=`taskflow_backup_${new Date().toISOString().split("T")[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u); }catch(e){console.error(e);alert("导出失败");} };
  const handleFileChange = (e:React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(!f)return; setImportError(null);setImportSuccess(null);setImportPreview(null); const r=new FileReader(); r.onload=(ev)=>{try{const p=JSON.parse(ev.target?.result as string);const t=Array.isArray(p.tasks)?p.tasks:[];const l=Array.isArray(p.labels)?p.labels:[];const sl=Array.isArray(p.smartLabels)?p.smartLabels:[];if(!t.length&&!l.length&&!sl.length){setImportError("导入的文件中未检测到有效的任务、标签或智能标签数据。");setIsImportModalOpen(true);return;}setImportPreview({tasks:t,labels:l,smartLabels:sl,fileName:f.name,fileSize:formatBytes(f.size)});setIsImportModalOpen(true);}catch{setImportError("无法解析该文件");setIsImportModalOpen(true);}}; r.readAsText(f); };
  const clearStores = async (db:any) => { await new Promise<void>((res,rej)=>{const tr=db.transaction(["tasks","labels","smartLabels"],"readwrite");tr.objectStore("tasks").clear();tr.objectStore("labels").clear();tr.objectStore("smartLabels").clear();tr.oncomplete=()=>res();tr.onerror=()=>rej(tr.error);}); };
  const executeImport = async (mode:"merge"|"overwrite") => { if(!importPreview)return; setIsProcessingImport(true);setImportError(null);setImportSuccess(null); try{const db=await openDB();if(mode==="overwrite")await clearStores(db); await new Promise<void>((res,rej)=>{const tr=db.transaction(["tasks","labels","smartLabels"],"readwrite");importPreview!.tasks.forEach((t:any)=>tr.objectStore("tasks").put(t));importPreview!.labels.forEach((l:any)=>tr.objectStore("labels").put(l));importPreview!.smartLabels.forEach((s:any)=>tr.objectStore("smartLabels").put(s));tr.oncomplete=()=>res();tr.onerror=()=>rej(tr.error);}); await initStore(); setImportSuccess(`成功${mode==="overwrite"?"清空并导入":"合并导入"}了 ${importPreview.tasks.length} 个任务、${importPreview.labels.length} 个标签和 ${importPreview.smartLabels.length} 个智能标签！`); setImportPreview(null);if(fileInputRef.current)fileInputRef.current.value="";}catch(e){console.error(e);setImportError("导入失败");}finally{setIsProcessingImport(false);} };
  const handleResetToSeeds = async () => { setIsProcessingImport(true); try{await restoreDemoData();setImportSuccess("已重置数据库并重新加载初始演示数据（3 个任务 + 4 个标签 + 4 个智能标签）！");setIsImportModalOpen(true);setIsConfirmingReset(false);}catch{setImportError("恢复演示数据失败");setIsImportModalOpen(true);}finally{setIsProcessingImport(false);} };
  const handleClearAll = async () => { setIsProcessingImport(true); try{const db=await openDB();await clearStores(db);await initStore();setImportSuccess("已清空数据库中的所有任务和标签！");setIsImportModalOpen(true);setIsConfirmingClear(false);}catch{setImportError("清空失败");setIsImportModalOpen(true);}finally{setIsProcessingImport(false);} };
  const labelCls = "text-[11px] font-bold text-muted-foreground uppercase tracking-wider block";
  const inputCls = "h-9.5 text-xs bg-card border-border rounded-lg focus-visible:ring-1";
  const selectTriggerCls = "w-full text-xs h-9.5 bg-card border-border rounded-lg";
  const selectContentCls = "bg-card text-xs border border-border rounded-lg";
  const isCustomProvider = aiProvider === "deepseek" || aiProvider === "custom";
  return (
    <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden animate-fade-in bg-muted/20">
      <header className="h-16 border-b border-border/80 flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-2"><Settings className="w-4.5 h-4.5 text-muted-foreground" /><div><h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-1.5">系统设置 (System Settings)</h2><p className="text-[10px] text-muted-foreground font-sans">管理本地存储、数据导入导出、备份以及进行系统清理维护</p></div></div>
        <Button onClick={onBackToBoard} size="sm" variant="outline" className="h-9 px-4 rounded-xl flex items-center gap-1.5 font-medium text-xs border-border hover:bg-muted transition-colors cursor-pointer"><LayoutDashboard className="w-3.5 h-3.5" />返回研发看板</Button>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <OverlayScrollbarsComponent
        options={scrollbarOptions}
        className="flex-1 min-h-0"
        defer
      >
        <div className="p-6 space-y-6 max-w-4xl mx-full w-full">
        {/* Theme */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center text-violet-600 dark:text-violet-400"><Palette className="w-4.5 h-4.5" /></div><div><h3 className="text-sm font-semibold text-foreground">外观</h3><p className="text-[10px] text-muted-foreground">选择你喜欢的主题配色</p></div></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">{themes.map((theme) => { const isActive = currentTheme.id === theme.id; return (
            <button key={theme.id} onClick={() => setTheme(theme.id)} className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${isActive?'border-violet-500 dark:border-violet-400 bg-violet-50/40 dark:bg-violet-950/15 shadow-sm':'border-border bg-muted/20 hover:border-border hover:shadow-sm'}`}>
              {isActive && <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-violet-500 dark:bg-violet-400 flex items-center justify-center"><Check className="w-3 h-3 text-primary-foreground" /></div>}
              <div className="flex items-center gap-1.5 mb-3">{(['background','primary','accent','destructive'] as const).map(k=><span key={k} className="w-6 h-6 rounded-md border border-border/60 shadow-inner" style={{backgroundColor:theme.colors[k]}}/>)}</div>
              <div className="space-y-0.5"><span className={`text-xs font-semibold block ${isActive?'text-violet-700 dark:text-violet-300':'text-foreground'}`}>{theme.name}</span><span className="text-[10px] text-muted-foreground leading-relaxed block">{theme.description}</span></div>
            </button>); })}</div>
        </div>
        {/* Storage */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><HardDrive className="w-4.5 h-4.5" /></div><div><h3 className="text-sm font-semibold text-foreground">本地存储空间占用</h3><p className="text-[10px] text-muted-foreground">所有本地看板任务和标签所占用的空间大小评估</p></div></div><div className="text-right"><span className="text-lg font-mono font-bold text-foreground">{formatBytes(storageBytes)}</span><p className="text-[9px] text-muted-foreground font-sans">占用率估算：{quotaUsed}</p></div></div>
          <div className="space-y-1"><div className="w-full bg-muted h-2.5 rounded-full overflow-hidden"><div className="bg-foreground h-full rounded-full transition-all duration-500" style={{width:`${Math.min(100,Math.max(2,(storageBytes/153600)*100))}%`}}/></div><div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono"><span>0 KB (初始状态)</span><span>150 KB (常规配额极限)</span></div></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">{[{l:'任务总量',v:tasks.length,u:'个任务实体'},{l:'自定义标签',v:labels.length,u:'个分类标签'},{l:'智能筛选规则',v:smartLabels.length,u:'个自动维度'}].map(s=><div key={s.l} className="bg-muted/50 p-3.5 rounded-xl border border-border/80"><span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">{s.l}</span><div className="flex items-baseline gap-1.5 mt-1"><span className="text-xl font-bold font-mono text-foreground">{s.v}</span><span className="text-xs text-muted-foreground">{s.u}</span></div></div>)}</div>
        </div>
        {/* Backup */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><Database className="w-4.5 h-4.5" /></div><div><h3 className="text-sm font-semibold text-foreground">本地数据备份与恢复</h3><p className="text-[10px] text-muted-foreground">将看板配置和任务打包下载为离线文件，或者上传旧的备份进行无缝恢复</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="border border-border/80 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-muted/20"><div className="space-y-1.5"><div className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Download className="w-4 h-4 text-muted-foreground" /><h4>导出我的本地备份 (.json)</h4></div><p className="text-[11px] text-muted-foreground leading-relaxed">系统会将当前的全部任务及标签打包成 `JSON` 结构体并启动安全浏览器下载。</p></div><Button onClick={handleExport} variant="outline" className="w-full text-xs font-semibold h-9.5 border-border hover:bg-muted">下载数据备份</Button></div>
            <div className="border border-border/80 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-muted/20"><div className="space-y-1.5"><div className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Upload className="w-4 h-4 text-muted-foreground" /><h4>导入本地备份文件</h4></div><p className="text-[11px] text-muted-foreground leading-relaxed">选择 `JSON` 备份文件，支持「增量合并」或「完全清空覆盖」两种导入策略。</p></div><input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" /><Button onClick={()=>fileInputRef.current?.click()} variant="outline" className="w-full text-xs font-semibold h-9.5 border-border hover:bg-muted">选择备份文件</Button></div>
          </div>
        </div>
        {/* AI */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Sparkles className="w-4.5 h-4.5" /></div><div><h3 className="text-sm font-semibold text-foreground">AI 智能助理配置 (AI Settings)</h3><p className="text-[10px] text-muted-foreground">支持 Gemini、OpenAI、DeepSeek、Anthropic 及自定义兼容接口</p></div></div>
          {/* AI Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-3.5 border border-border/80 rounded-xl bg-muted/20">
            <div className="space-y-0.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-2">AI 功能</label>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{aiEnabled ? 'AI 智能辅助功能已启用，可在任务编辑中使用 AI 生成描述、智能标签等功能。' : 'AI 智能辅助功能已禁用。启用后即可在任务编辑中使用 AI 相关功能。'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiEnabled}
              onClick={() => handleToggleAi(!aiEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${aiEnabled ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-muted-foreground/25'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-primary-foreground shadow-lg ring-0 transition-transform duration-200 ease-in-out ${aiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {aiEnabled && <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
              <div className="space-y-1.5"><label className={labelCls}>AI 服务商</label><Select value={aiProvider} onValueChange={v=>handleProviderChange(v)}><SelectTrigger className={selectTriggerCls}><SelectValue placeholder="选择 AI 服务商" /></SelectTrigger><SelectContent className={selectContentCls}><SelectItem value="gemini">Google Gemini API</SelectItem><SelectItem value="openai">OpenAI API</SelectItem><SelectItem value="deepseek">DeepSeek (深度求索)</SelectItem><SelectItem value="anthropic">Anthropic Claude</SelectItem><SelectItem value="custom">Custom (自定义)</SelectItem></SelectContent></Select></div>
              {isCustomProvider ? <div className="space-y-1.5 animate-fade-in"><label className={labelCls}>API Base URL</label><Input type="text" placeholder={aiProvider==="deepseek"?"https://api.deepseek.com":"https://api.yourproxy.com/v1"} value={customUrl} onChange={e=>setCustomUrl(e.target.value)} className={inputCls} /></div> : <div className="space-y-1.5"><label className={labelCls}>运行状态</label><div className="h-9.5 rounded-lg border border-border/80 bg-muted/50 px-3 flex items-center justify-between text-xs text-muted-foreground font-medium select-none"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />引擎就绪 ({aiProvider.toUpperCase()})</span><span className="text-[10px] text-muted-foreground">V1.4 / JSON</span></div></div>}
            </div>
            {aiProvider==="gemini" ? <div className="space-y-3"><div className="flex items-center justify-between p-3 border border-border/80 rounded-xl bg-muted/20"><div className="space-y-0.5"><label className="text-xs font-semibold text-foreground flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={useCustomKey} onChange={e=>setUseCustomKey(e.target.checked)} className="rounded border-border text-foreground focus:ring-foreground w-4 h-4 cursor-pointer" />启用专属 Gemini API 密钥</label><p className="text-[10px] text-muted-foreground pl-6">开启后将覆盖底层默认密钥。</p></div></div>{useCustomKey && <div className="space-y-1.5 pl-1 animate-fade-in"><label className={labelCls}>Gemini API Key</label><Input type="password" placeholder="AIzaSy..." value={customApiKey} onChange={e=>setCustomApiKey(e.target.value)} className={inputCls} /></div>}</div> : <div className="space-y-1.5 pl-1 animate-fade-in"><label className={labelCls}>{aiProvider==="openai"?"OpenAI":aiProvider==="deepseek"?"DeepSeek":aiProvider==="anthropic"?"Anthropic":"Custom"} API Key</label><Input type="password" placeholder={`请输入 ${aiProvider.toUpperCase()} 密钥`} value={customApiKey} onChange={e=>setCustomApiKey(e.target.value)} className={inputCls} /></div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
              <div className="space-y-1.5"><label className={labelCls}>语言模型</label>{aiProvider==="custom" ? <Input type="text" placeholder="llama3, qwen-plus" value={customModel} onChange={e=>setCustomModel(e.target.value)} className={inputCls} /> : <Select value={customModel} onValueChange={v=>setCustomModel(v)}><SelectTrigger className={selectTriggerCls}><SelectValue placeholder="选择语言模型" /></SelectTrigger><SelectContent className={selectContentCls}>{aiProvider==="gemini"&&<><SelectItem value="gemini-3.5-flash">gemini-3.5-flash (推荐)</SelectItem><SelectItem value="gemini-2.5-flash">gemini-2.5-flash</SelectItem><SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem><SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem></>}{aiProvider==="openai"&&<><SelectItem value="gpt-4o-mini">gpt-4o-mini (推荐)</SelectItem><SelectItem value="gpt-4o">gpt-4o</SelectItem><SelectItem value="o3-mini">o3-mini</SelectItem></>}{aiProvider==="deepseek"&&<><SelectItem value="deepseek-chat">deepseek-chat</SelectItem><SelectItem value="deepseek-reasoner">deepseek-reasoner</SelectItem></>}{aiProvider==="anthropic"&&<><SelectItem value="claude-3-5-sonnet-latest">claude-3.5-sonnet (推荐)</SelectItem><SelectItem value="claude-3-5-haiku-latest">claude-3.5-haiku</SelectItem><SelectItem value="claude-3-opus-latest">claude-3-opus</SelectItem></>}</SelectContent></Select>}</div>
              {isCustomProvider ? <div className="space-y-1.5"><label className={labelCls}>运行状态</label><div className="h-9.5 rounded-lg border border-border/80 bg-muted/50 px-3 flex items-center justify-between text-xs text-muted-foreground font-medium select-none"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />代理引擎就绪 ({aiProvider.toUpperCase()})</span><span className="text-[10px] text-muted-foreground">V1.4 / JSON</span></div></div> : <div className="space-y-1.5 invisible md:block" />}
            </div>
            <div className="space-y-1.5 pl-1"><label className={labelCls}>系统提示指令 (System Instruction)</label><Textarea placeholder="例如: '请额外给出开发方面的技术细节说明'" value={customInstruction} onChange={e=>setCustomInstruction(e.target.value)} className="min-h-20 text-xs bg-card border-border rounded-lg focus-visible:ring-1 resize-y" /><p className="text-[10px] text-muted-foreground leading-relaxed">附加在 Prompt 头部，定制任务生成偏好。</p></div>
            {testResult && <div className="mt-2 pl-1 animate-fade-in">{testResult.success ? <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 text-xs text-emerald-800 dark:text-emerald-300 space-y-1"><div className="flex items-center gap-1.5 font-bold"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{testResult.message}</div>{testResult.response && <div className="mt-1.5"><p className="text-[10px] text-muted-foreground mb-0.5">模型接口实际回复：</p><p className="font-mono text-[10.5px] text-muted-foreground bg-muted p-2 rounded-lg border border-border/80 break-words">{testResult.response}</p></div>}</div> : <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-950/50 bg-rose-50/30 dark:bg-rose-950/10 text-xs text-rose-800 dark:text-rose-300 space-y-1"><div className="flex items-center gap-1.5 font-bold"><AlertTriangle className="w-4 h-4 text-rose-500" />连接测试失败</div><p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{testResult.message}</p></div>}</div>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="h-8 flex items-center pl-1">{saveSuccess && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in"><Check className="w-4 h-4" />AI 配置已保存！</span>}</div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button onClick={handleTestAiConnection} disabled={isTestingAi} variant="outline" className="text-xs font-semibold h-9 px-4 border-border rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-muted">{isTestingAi?<><Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />测试中...</>:<span>测试联通性</span>}</Button>
                <Button onClick={handleSaveAiConfig} className="text-xs font-semibold h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center gap-1.5 cursor-pointer">保存 AI 配置</Button>
              </div>
            </div>
          </div>}
        </div>
        {/* Danger Zone */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 dark:text-rose-400"><AlertTriangle className="w-4.5 h-4.5" /></div><div><h3 className="text-sm font-semibold text-rose-500 dark:text-rose-400">危险选项 (Danger Zone)</h3><p className="text-[10px] text-muted-foreground">操作执行后将无法复原，请谨慎使用</p></div></div>
          <div className="space-y-3.5 pt-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between border border-rose-100/50 dark:border-rose-950/30 p-4 rounded-xl gap-4 bg-rose-50/5 dark:bg-rose-950/5"><div className="space-y-0.5 flex-1"><h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />恢复出厂默认配置与演示任务</h4><p className="text-[10px] text-muted-foreground leading-relaxed">清除所有记录并重新加载 3 个默认演示任务与 4 个常规分类标签。</p></div>{isConfirmingReset?<div className="flex items-center gap-2 animate-fade-in shrink-0"><Button variant="destructive" size="sm" onClick={handleResetToSeeds} className="font-semibold text-xs h-8.5 px-3.5">确定重置</Button><Button variant="outline" size="sm" onClick={()=>setIsConfirmingReset(false)} className="font-semibold text-xs h-8.5 px-3.5 border-border">取消</Button></div>:<Button variant="destructive" size="sm" onClick={()=>{setIsConfirmingReset(true);setIsConfirmingClear(false);}} className="text-xs font-semibold h-8.5 shrink-0">恢复演示数据</Button>}</div>
            <div className="flex flex-col md:flex-row md:items-center justify-between border border-rose-150/50 dark:border-rose-950/40 p-4 rounded-xl gap-4 bg-rose-50/10 dark:bg-rose-950/10"><div className="space-y-0.5 flex-1"><h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" />彻底清空本地 IndexedDB</h4><p className="text-[10px] text-muted-foreground leading-relaxed">清空所有项目任务、自定义标签及智能筛选机制，彻底抹除本地存储。</p></div>{isConfirmingClear?<div className="flex items-center gap-2 animate-fade-in shrink-0"><Button variant="destructive" size="sm" onClick={handleClearAll} className="font-semibold text-xs h-8.5 px-3.5">确认清空</Button><Button variant="outline" size="sm" onClick={()=>setIsConfirmingClear(false)} className="font-semibold text-xs h-8.5 px-3.5 border-border">取消</Button></div>:<Button variant="destructive" size="sm" onClick={()=>{setIsConfirmingClear(true);setIsConfirmingReset(false);}} className="text-xs font-semibold h-8.5 shrink-0">清空所有数据</Button>}</div>
          </div>
        </div>
        </div>
      </OverlayScrollbarsComponent>
      </div>
      {/* Import Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-md sm:max-w-md bg-card border-border rounded-2xl p-6 text-foreground">
          <DialogHeader className="border-b border-border pb-3"><DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2"><FileJson className="w-4.5 h-4.5 text-muted-foreground" />备份文件导入预览</DialogTitle><DialogDescription className="text-[11px] text-muted-foreground">请预览备份文件属性，并确认导入形式。</DialogDescription></DialogHeader>
          <div className="space-y-4.5 py-2">
            {importError && <div className="bg-rose-50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900/45 p-3 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><p className="leading-relaxed">{importError}</p></div>}
            {importSuccess && <div className="bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-900/45 p-3 rounded-xl flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><p className="leading-relaxed">{importSuccess}</p></div>}
            {importPreview && <div className="space-y-4">
              <div className="bg-muted rounded-xl p-3 border border-border flex flex-col gap-1.5 text-xs font-sans"><div className="flex items-center justify-between"><span className="text-muted-foreground font-medium">文件名:</span><span className="font-semibold text-foreground truncate max-w-[200px]">{importPreview.fileName}</span></div><div className="flex items-center justify-between"><span className="text-muted-foreground font-medium">文件大小:</span><span className="font-semibold text-foreground">{importPreview.fileSize}</span></div></div>
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">{[{l:'任务总数',v:importPreview.tasks.length},{l:'自定义标签',v:importPreview.labels.length},{l:'智能分类',v:importPreview.smartLabels.length}].map(s=><div key={s.l} className="bg-muted/50 p-3 rounded-lg border border-border/80"><p className="text-[10px] text-muted-foreground font-medium">{s.l}</p><p className="font-bold font-mono text-base mt-1 text-foreground">{s.v}</p></div>)}</div>
              <div className="bg-muted border border-border/50 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-muted-foreground leading-relaxed"><Info className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" /><p><strong>增量合并：</strong>只追加新增记录。<br /><strong>覆盖：</strong>先清空全部记录，再恢复备份内容。</p></div>
              <div className="grid grid-cols-2 gap-3 pt-1"><Button onClick={()=>executeImport("merge")} disabled={isProcessingImport} variant="outline" size="sm" className="text-xs h-9 font-semibold border-border">{isProcessingImport&&<Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}合并导入</Button><Button onClick={()=>executeImport("overwrite")} disabled={isProcessingImport} variant="default" size="sm" className="text-xs h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/90">{isProcessingImport&&<Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}覆盖导入</Button></div>
            </div>}
            {!importPreview && <div className="flex justify-end pt-2"><Button onClick={()=>setIsImportModalOpen(false)} className="bg-primary text-primary-foreground text-xs h-8 px-4 hover:bg-primary/90">关闭</Button></div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
