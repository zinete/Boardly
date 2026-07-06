import React, { useState, useEffect, useRef } from "react";
import { useKanbanStore } from "../lib/store";
import { openDB } from "../lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Database,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileJson,
  X,
  HardDrive,
  LayoutDashboard,
  Info,
  Sparkles,
  Check,
} from "lucide-react";

interface SettingsViewProps {
  onBackToBoard: () => void;
}

export function SettingsView({ onBackToBoard }: SettingsViewProps) {
  const { tasks, labels, smartLabels, initStore } = useKanbanStore();

  // Storage Stats State
  const [storageBytes, setStorageBytes] = useState(0);
  const [quotaUsed, setQuotaUsed] = useState<string>("0%");

  // AI Configuration States
  const [aiProvider, setAiProvider] = useState<string>("gemini");
  const [useCustomKey, setUseCustomKey] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("gemini-3.5-flash");
  const [customInstruction, setCustomInstruction] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Import Dialog State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    tasks: any[];
    labels: any[];
    smartLabels: any[];
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Danger Zone States
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // AI Connection Test States
  const [isTestingAi, setIsTestingAi] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    response?: string;
  } | null>(null);

  // Calculate storage size when database state or component mounts/updates
  useEffect(() => {
    calculateStorageSize();
  }, [tasks, labels, smartLabels]);

  // Load AI configuration on mount
  useEffect(() => {
    const savedProvider =
      localStorage.getItem("taskflow_ai_provider") || "gemini";
    const savedUseCustomKey =
      localStorage.getItem("taskflow_ai_use_custom_key") === "true";
    const savedApiKey = localStorage.getItem("taskflow_ai_custom_key") || "";
    const savedUrl = localStorage.getItem("taskflow_ai_custom_url") || "";
    const savedModel = localStorage.getItem("taskflow_ai_model") || "";
    const savedInstruction =
      localStorage.getItem("taskflow_ai_custom_instruction") || "";

    setAiProvider(savedProvider);
    setUseCustomKey(savedUseCustomKey);
    setCustomApiKey(savedApiKey);
    setCustomUrl(savedUrl);
    setCustomInstruction(savedInstruction);

    if (savedModel) {
      setCustomModel(savedModel);
    } else {
      setCustomModel(
        savedProvider === "gemini"
          ? "gemini-3.5-flash"
          : savedProvider === "openai"
            ? "gpt-4o-mini"
            : savedProvider === "deepseek"
              ? "deepseek-chat"
              : savedProvider === "anthropic"
                ? "claude-3-5-sonnet-latest"
                : "gpt-4o-mini",
      );
    }
  }, []);

  const handleProviderChange = (newProvider: string) => {
    setAiProvider(newProvider);
    if (newProvider === "gemini") {
      setCustomModel("gemini-3.5-flash");
      setCustomUrl("");
    } else if (newProvider === "openai") {
      setCustomModel("gpt-4o-mini");
      setCustomUrl("");
    } else if (newProvider === "deepseek") {
      setCustomModel("deepseek-chat");
      setCustomUrl("https://api.deepseek.com");
    } else if (newProvider === "anthropic") {
      setCustomModel("claude-3-5-sonnet-latest");
      setCustomUrl("");
    } else {
      setCustomModel("gpt-4o-mini");
      setCustomUrl("");
    }
  };

  const handleSaveAiConfig = () => {
    localStorage.setItem("taskflow_ai_provider", aiProvider);
    localStorage.setItem(
      "taskflow_ai_use_custom_key",
      useCustomKey ? "true" : "false",
    );
    localStorage.setItem("taskflow_ai_custom_key", customApiKey.trim());
    localStorage.setItem("taskflow_ai_custom_url", customUrl.trim());
    localStorage.setItem("taskflow_ai_model", customModel);
    localStorage.setItem(
      "taskflow_ai_custom_instruction",
      customInstruction.trim(),
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: aiProvider,
          customApiKey:
            useCustomKey || aiProvider !== "gemini" ? customApiKey.trim() : "",
          customUrl: customUrl.trim(),
          customModel: customModel,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "连接测试成功！",
          response: data.response,
        });
      } else {
        setTestResult({
          success: false,
          message:
            data.error || data.message || "连接测试失败。请检查密钥和配置。",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "网络请求错误，无法连接到测试服务器。",
      });
    } finally {
      setIsTestingAi(false);
    }
  };

  const calculateStorageSize = async () => {
    try {
      // 1. Calculate bytes of our serialized current payload (most meaningful to user)
      const payload = { tasks, labels, smartLabels };
      const serialized = JSON.stringify(payload);
      const bytes = new Blob([serialized]).size;
      setStorageBytes(bytes);

      // 2. Query StorageManager if available for real IndexedDB usage
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        const percentage = ((usage / quota) * 100).toFixed(4);
        setQuotaUsed(`${percentage}%`);
      }
    } catch (e) {
      console.error("Error estimating storage:", e);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 1. Export Data to a local JSON File
  const handleExport = () => {
    try {
      const backupData = {
        version: 1,
        appName: "TaskFlow AI",
        exportedAt: new Date().toISOString(),
        tasks,
        labels,
        smartLabels,
      };

      const serialized = JSON.stringify(backupData, null, 2);
      const blob = new Blob([serialized], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `taskflow_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("导出失败，请重试");
    }
  };

  // 2. Process Chosen Backup JSON File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setImportPreview(null);

    const sizeStr = formatBytes(file.size);
    const nameStr = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Simple validation
        const incomingTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        const incomingLabels = Array.isArray(parsed.labels)
          ? parsed.labels
          : [];
        const incomingSmartLabels = Array.isArray(parsed.smartLabels)
          ? parsed.smartLabels
          : [];

        if (
          incomingTasks.length === 0 &&
          incomingLabels.length === 0 &&
          incomingSmartLabels.length === 0
        ) {
          setImportError(
            "导入的文件中未检测到有效的任务、标签或智能标签数据。",
          );
          setIsImportModalOpen(true);
          return;
        }

        setImportPreview({
          tasks: incomingTasks,
          labels: incomingLabels,
          smartLabels: incomingSmartLabels,
          fileName: nameStr,
          fileSize: sizeStr,
        });
        setIsImportModalOpen(true);
      } catch (err) {
        setImportError("无法解析该文件，请确保它是一个有效的 JSON 备份文件。");
        setIsImportModalOpen(true);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async (mode: "merge" | "overwrite") => {
    if (!importPreview) return;
    setIsProcessingImport(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const db = await openDB();

      if (mode === "overwrite") {
        // Clear existing stores
        await new Promise<void>((resolve, reject) => {
          const trans = db.transaction(
            ["tasks", "labels", "smartLabels"],
            "readwrite",
          );
          trans.objectStore("tasks").clear();
          trans.objectStore("labels").clear();
          trans.objectStore("smartLabels").clear();
          trans.oncomplete = () => resolve();
          trans.onerror = () => reject(trans.error);
        });
      }

      // Write imported records
      await new Promise<void>((resolve, reject) => {
        const trans = db.transaction(
          ["tasks", "labels", "smartLabels"],
          "readwrite",
        );

        const taskStore = trans.objectStore("tasks");
        importPreview.tasks.forEach((t) => taskStore.put(t));

        const labelStore = trans.objectStore("labels");
        importPreview.labels.forEach((l) => labelStore.put(l));

        const smartStore = trans.objectStore("smartLabels");
        importPreview.smartLabels.forEach((s) => smartStore.put(s));

        trans.oncomplete = () => resolve();
        trans.onerror = () => reject(trans.error);
      });

      // Reload store
      await initStore();

      setImportSuccess(
        `成功${mode === "overwrite" ? "清空并导入" : "合并导入"}了 ${importPreview.tasks.length} 个任务、${importPreview.labels.length} 个标签和 ${importPreview.smartLabels.length} 个智能标签！`,
      );
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Failed to import:", err);
      setImportError("导入数据库写入失败，请检查文件格式。");
    } finally {
      setIsProcessingImport(false);
    }
  };

  // 3. Clear/Reset DB back to seeds
  const handleResetToSeeds = async () => {
    setIsProcessingImport(true);
    try {
      const db = await openDB();

      // Clear
      await new Promise<void>((resolve, reject) => {
        const trans = db.transaction(
          ["tasks", "labels", "smartLabels"],
          "readwrite",
        );
        trans.objectStore("tasks").clear();
        trans.objectStore("labels").clear();
        trans.objectStore("smartLabels").clear();
        trans.oncomplete = () => resolve();
        trans.onerror = () => reject(trans.error);
      });

      // Reload store which will automatically seed
      await initStore();
      setImportSuccess("已重置数据库并重新加载初始种子数据！");
      setIsImportModalOpen(true);
      setIsConfirmingReset(false);
    } catch (err) {
      setImportError("恢复出厂设置失败，请刷新页面重试。");
      setIsImportModalOpen(true);
    } finally {
      setIsProcessingImport(false);
    }
  };

  // 4. Wipe completely empty
  const handleClearAll = async () => {
    setIsProcessingImport(true);
    try {
      const db = await openDB();

      await new Promise<void>((resolve, reject) => {
        const trans = db.transaction(
          ["tasks", "labels", "smartLabels"],
          "readwrite",
        );
        trans.objectStore("tasks").clear();
        trans.objectStore("labels").clear();
        trans.objectStore("smartLabels").clear();
        trans.oncomplete = () => resolve();
        trans.onerror = () => reject(trans.error);
      });

      await initStore();
      setImportSuccess("已清空数据库中的所有任务和标签！");
      setIsImportModalOpen(true);
      setIsConfirmingClear(false);
    } catch (err) {
      setImportError("清空数据库失败，请刷新页面重试。");
      setIsImportModalOpen(true);
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:h-screen md:overflow-hidden animate-fade-in bg-zinc-50/20 dark:bg-zinc-950/20">
      {/* Settings Top Header Bar */}
      <header className="h-16 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4.5 h-4.5 text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-1.5">
              系统设置 (System Settings)
            </h2>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans">
              管理本地存储、数据导入导出、备份以及进行系统清理维护
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onBackToBoard}
            size="sm"
            variant="outline"
            className="h-9 px-4 rounded-xl flex items-center gap-1.5 font-medium text-xs border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            返回研发看板
          </Button>
        </div>
      </header>

      {/* Settings Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-full w-full">
        {/* Row 1: Space Usage Stats */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                <HardDrive className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  本地存储空间占用
                </h3>
                <p className="text-[10px] text-zinc-400">
                  所有本地看板任务和标签所占用的空间大小评估
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-50">
                {formatBytes(storageBytes)}
              </span>
              <p className="text-[9px] text-zinc-400 font-sans">
                占用率估算：{quotaUsed}
              </p>
            </div>
          </div>

          {/* Progress Visualizer */}
          <div className="space-y-1">
            <div className="w-full bg-zinc-150 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-zinc-900 dark:bg-zinc-50 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(2, (storageBytes / 153600) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-zinc-450 dark:text-zinc-500 font-mono">
              <span>0 KB (初始状态)</span>
              <span>150 KB (常规配额极限)</span>
            </div>
          </div>

          {/* Record Counters Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                任务总量
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
                  {tasks.length}
                </span>
                <span className="text-xs text-zinc-450">个任务实体</span>
              </div>
            </div>

            <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                自定义标签
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
                  {labels.length}
                </span>
                <span className="text-xs text-zinc-450">个分类标签</span>
              </div>
            </div>

            <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-850">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                智能筛选规则
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
                  {smartLabels.length}
                </span>
                <span className="text-xs text-zinc-450">个自动维度</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Import & Export Backup */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                本地数据备份与恢复
              </h3>
              <p className="text-[10px] text-zinc-400">
                将看板配置和任务打包下载为离线文件，或者上传旧的备份进行无缝恢复
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Export block */}
            <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-zinc-50/20 dark:bg-zinc-950/5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <Download className="w-4 h-4 text-zinc-500" />
                  <h4>导出我的本地备份 (.json)</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  系统会将当前的全部任务（包含关联关系、子任务进度、截止日期等）以及标签分类打包成一个加密度极高且人类可读的
                  `JSON` 结构体，并启动安全浏览器下载。
                </p>
              </div>
              <Button
                onClick={handleExport}
                variant="outline"
                className="w-full text-xs font-semibold h-9.5 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-850 dark:hover:bg-zinc-850"
              >
                下载数据备份
              </Button>
            </div>

            {/* Import block */}
            <div className="border border-zinc-150 dark:border-zinc-850 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-zinc-50/20 dark:bg-zinc-950/5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <Upload className="w-4 h-4 text-zinc-500" />
                  <h4>导入本地备份文件</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  选择并上传您的 `JSON`
                  备份文件，系统支持「增量合并」或「完全清空覆盖」两种导入策略，并提供直观的文件属性解析预览。
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full text-xs font-semibold h-9.5 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-850 dark:hover:bg-zinc-850"
              >
                选择备份文件
              </Button>
            </div>
          </div>
        </div>

        {/* Row 3: AI Configuration */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                AI 智能助理配置 (AI Settings)
              </h3>
              <p className="text-[10px] text-zinc-400">
                支持 Gemini、OpenAI、DeepSeek、Anthropic
                及自定义兼容接口，轻松实现多模型一键切换
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {/* Grid 1: Provider selection and Base URL if needed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  AI 服务商 (AI Provider)
                </label>
                <Select
                  value={aiProvider}
                  onValueChange={(val) => handleProviderChange(val)}
                >
                  <SelectTrigger className="w-full text-xs h-9.5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg">
                    <SelectValue placeholder="选择 AI 服务商" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <SelectItem value="gemini">Google Gemini API</SelectItem>
                    <SelectItem value="openai">OpenAI API</SelectItem>
                    <SelectItem value="deepseek">
                      DeepSeek (深度求索)
                    </SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="custom">
                      Custom (自定义 OpenAI 兼容接口)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditionally show Base URL input for DeepSeek and Custom */}
              {aiProvider === "deepseek" || aiProvider === "custom" ? (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    API 代理/基准端点 (API Base URL)
                  </label>
                  <Input
                    type="text"
                    placeholder={
                      aiProvider === "deepseek"
                        ? "https://api.deepseek.com"
                        : "https://api.yourproxy.com/v1"
                    }
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="h-9.5 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg focus-visible:ring-1"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    AI 分析服务运行状态
                  </label>
                  <div className="h-9.5 rounded-lg border border-zinc-150 dark:border-zinc-850/80 bg-zinc-50/50 dark:bg-zinc-950/20 px-3 flex items-center justify-between text-xs text-zinc-500 font-medium select-none">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      引擎就绪 ({aiProvider.toUpperCase()})
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      V1.4 / JSON
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* API Key inputs */}
            {aiProvider === "gemini" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-zinc-150 dark:border-zinc-850 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/5">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomKey}
                        onChange={(e) => setUseCustomKey(e.target.checked)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                      />
                      启用专属 Gemini API 密钥
                    </label>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500 pl-6">
                      开启此选项将覆盖底层默认的 AI
                      密钥。若不开启，系统会自动读取项目底层的内置密钥进行安全托管。
                    </p>
                  </div>
                </div>

                {useCustomKey && (
                  <div className="space-y-1.5 pl-1 animate-fade-in">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Gemini API 密钥 (API Key)
                    </label>
                    <Input
                      type="password"
                      placeholder="请输入您的 Gemini 专属 API 密钥 (例如 AIzaSy...)"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="h-9.5 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg focus-visible:ring-1"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 pl-1 animate-fade-in">
                <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  {aiProvider === "openai"
                    ? "OpenAI"
                    : aiProvider === "deepseek"
                      ? "DeepSeek"
                      : aiProvider === "anthropic"
                        ? "Anthropic"
                        : "Custom"}{" "}
                  API 密钥 (API Key)
                </label>
                <Input
                  type="password"
                  placeholder={`请输入您的 ${aiProvider.toUpperCase()} 专属密钥。留空则尝试读取服务器环境变量。`}
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="h-9.5 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg focus-visible:ring-1"
                />
              </div>
            )}

            {/* Model Selection and details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  首选 AI 语言模型 (Model)
                </label>
                {aiProvider === "custom" ? (
                  <Input
                    type="text"
                    placeholder="输入自定义模型名称，例如 llama3, qwen-plus"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="h-9.5 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg focus-visible:ring-1"
                  />
                ) : (
                  <Select
                    value={customModel}
                    onValueChange={(val) => setCustomModel(val)}
                  >
                    <SelectTrigger className="w-full text-xs h-9.5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg">
                      <SelectValue placeholder="选择语言模型" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-900 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      {aiProvider === "gemini" && (
                        <>
                          <SelectItem value="gemini-3.5-flash">
                            gemini-3.5-flash (极速/推荐)
                          </SelectItem>
                          <SelectItem value="gemini-2.5-flash">
                            gemini-2.5-flash (经典)
                          </SelectItem>
                          <SelectItem value="gemini-1.5-flash">
                            gemini-1.5-flash (轻量)
                          </SelectItem>
                          <SelectItem value="gemini-1.5-pro">
                            gemini-1.5-pro (重度推理)
                          </SelectItem>
                        </>
                      )}
                      {aiProvider === "openai" && (
                        <>
                          <SelectItem value="gpt-4o-mini">
                            gpt-4o-mini (极速/推荐)
                          </SelectItem>
                          <SelectItem value="gpt-4o">
                            gpt-4o (主力模型)
                          </SelectItem>
                          <SelectItem value="o3-mini">
                            o3-mini (高级推理)
                          </SelectItem>
                        </>
                      )}
                      {aiProvider === "deepseek" && (
                        <>
                          <SelectItem value="deepseek-chat">
                            deepseek-chat (通用主力)
                          </SelectItem>
                          <SelectItem value="deepseek-reasoner">
                            deepseek-reasoner (深度思考/R1)
                          </SelectItem>
                        </>
                      )}
                      {aiProvider === "anthropic" && (
                        <>
                          <SelectItem value="claude-3-5-sonnet-latest">
                            claude-3.5-sonnet (主力推荐)
                          </SelectItem>
                          <SelectItem value="claude-3-5-haiku-latest">
                            claude-3.5-haiku (极速推理)
                          </SelectItem>
                          <SelectItem value="claude-3-opus-latest">
                            claude-3-opus (重度逻辑)
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Status or explanation depending on Base URL state */}
              {aiProvider === "deepseek" || aiProvider === "custom" ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    AI 分析服务运行状态
                  </label>
                  <div className="h-9.5 rounded-lg border border-zinc-150 dark:border-zinc-850/80 bg-zinc-50/50 dark:bg-zinc-950/20 px-3 flex items-center justify-between text-xs text-zinc-500 font-medium select-none">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      代理引擎就绪 ({aiProvider.toUpperCase()})
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      V1.4 / JSON
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 invisible md:block">
                  {/* Spacing alignment */}
                </div>
              )}
            </div>

            {/* Prompt custom Instruction */}
            <div className="space-y-1.5 pl-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                系统助理额外提示指令 (System Instruction Ext.)
              </label>
              <Textarea
                placeholder="例如: '请额外给出开发方面的技术细节说明'，或者 '任务步骤尽量简洁并打上测试导向'"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                className="min-h-20 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg focus-visible:ring-1 resize-y"
              />
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-relaxed">
                此配置指示将附加在 Prompt
                头部。用来定制任务标题生成偏好、标签选取权重或步骤分解颗粒度。
              </p>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div className="mt-2 pl-1 animate-fade-in">
                {testResult.success ? (
                  <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {testResult.message}
                    </div>
                    {testResult.response && (
                      <div className="mt-1.5">
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-0.5">
                          模型接口实际回复：
                        </p>
                        <p className="font-mono text-[10.5px] text-zinc-600 dark:text-zinc-350 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-150/80 dark:border-zinc-850 break-words">
                          {testResult.response}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-950/50 bg-rose-50/30 dark:bg-rose-950/10 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      连接测试失败
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {testResult.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="h-8 flex items-center pl-1">
                {saveSuccess && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
                    <Check className="w-4 h-4" />
                    AI 专属配置已在本地保存！
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  onClick={handleTestAiConnection}
                  disabled={isTestingAi}
                  variant="outline"
                  className="text-xs font-semibold h-9 px-4 border-zinc-200 dark:border-zinc-850 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850"
                >
                  {isTestingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                      正在联通测试...
                    </>
                  ) : (
                    <>
                      <span>测试配置联通性</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSaveAiConfig}
                  className="text-xs font-semibold h-9 px-5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  保存 AI 配置
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Danger Zone */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                危险选项 (Danger Zone)
              </h3>
              <p className="text-[10px] text-zinc-400">
                敏感数据清除或出厂默认配置重置，操作执行后将无法复原，请谨慎使用
              </p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {/* Seed restore */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border border-rose-100/50 dark:border-rose-950/30 p-4 rounded-xl gap-4 bg-rose-50/5 dark:bg-rose-950/5">
              <div className="space-y-0.5 flex-1">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                  恢复出厂默认配置与演示任务
                </h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  这将清除您当前数据库里的所有记录，并重新加载系统自带的 3
                  个默认演示任务与 4 个常规分类标签（工作、紧急、个人、购物）。
                </p>
              </div>

              {isConfirmingReset ? (
                <div className="flex items-center gap-2 animate-fade-in shrink-0">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleResetToSeeds}
                    className="font-semibold text-xs h-8.5 px-3.5"
                  >
                    确定重置
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfirmingReset(false)}
                    className="font-semibold text-xs h-8.5 px-3.5 border-zinc-200"
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setIsConfirmingReset(true);
                    setIsConfirmingClear(false);
                  }}
                  className="text-xs font-semibold h-8.5 shrink-0"
                >
                  恢复演示数据
                </Button>
              )}
            </div>

            {/* Complete wipe */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border border-rose-150/50 dark:border-rose-950/40 p-4 rounded-xl gap-4 bg-rose-50/10 dark:bg-rose-950/10">
              <div className="space-y-0.5 flex-1">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                  彻底清空本地 IndexedDB
                </h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  清空数据库中所有的项目任务、自定义标签、以及智能筛选机制，为您提供一个干净完整的空白看板，该操作将彻底抹除本地存储。
                </p>
              </div>

              {isConfirmingClear ? (
                <div className="flex items-center gap-2 animate-fade-in shrink-0">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearAll}
                    className="font-semibold text-xs h-8.5 px-3.5"
                  >
                    确认彻底清空
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfirmingClear(false)}
                    className="font-semibold text-xs h-8.5 px-3.5 border-zinc-200"
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setIsConfirmingClear(true);
                    setIsConfirmingReset(false);
                  }}
                  className="text-xs font-semibold h-8.5 shrink-0"
                >
                  清空所有数据
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Independent Popup Modal for File Import Details and Operations */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-md sm:max-w-md bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 rounded-2xl p-6 text-zinc-800 dark:text-zinc-100">
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <DialogTitle className="text-base font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <FileJson className="w-4.5 h-4.5 text-zinc-500" />
              离线备份文件导入预览
            </DialogTitle>
            <DialogDescription className="text-[11px] text-zinc-400">
              请预览该备份文件包含的属性详情，并确认导入形式。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4.5 py-2">
            {/* Error or Success notification banner */}
            {importError && (
              <div className="bg-rose-50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900/45 p-3 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{importError}</p>
              </div>
            )}

            {importSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-900/45 p-3 rounded-xl flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{importSuccess}</p>
              </div>
            )}

            {/* Read Data Grid */}
            {importPreview && (
              <div className="space-y-4">
                <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-850 flex flex-col gap-1.5 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-450 font-medium">文件名:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                      {importPreview.fileName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-450 font-medium">文件大小:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {importPreview.fileSize}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
                    <p className="text-[10px] text-zinc-400 font-medium">
                      任务总数
                    </p>
                    <p className="font-bold font-mono text-base mt-1 text-zinc-850 dark:text-zinc-100">
                      {importPreview.tasks.length}
                    </p>
                  </div>
                  <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
                    <p className="text-[10px] text-zinc-400 font-medium">
                      自定义标签
                    </p>
                    <p className="font-bold font-mono text-base mt-1 text-zinc-850 dark:text-zinc-100">
                      {importPreview.labels.length}
                    </p>
                  </div>
                  <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850">
                    <p className="text-[10px] text-zinc-400 font-medium">
                      智能分类
                    </p>
                    <p className="font-bold font-mono text-base mt-1 text-zinc-850 dark:text-zinc-100">
                      {importPreview.smartLabels.length}
                    </p>
                  </div>
                </div>

                {/* Import Strategy Information Alert */}
                <div className="bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200/50 dark:border-zinc-850 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-zinc-500 leading-relaxed">
                  <Info className="w-3.5 h-3.5 shrink-0 text-zinc-400 mt-0.5" />
                  <p>
                    <strong>增量合并：</strong>
                    只追加新增记录或对重复ID的任务进行覆盖，不会影响其他已有任务。
                    <br />
                    <strong>覆盖覆盖：</strong>此操作会首先
                    <strong>清空当前拥有的全部记录</strong>
                    ，随后彻底恢复为该备份文件里的内容。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    onClick={() => executeImport("merge")}
                    disabled={isProcessingImport}
                    variant="outline"
                    size="sm"
                    className="text-xs h-9 font-semibold border-zinc-200 dark:border-zinc-800"
                  >
                    {isProcessingImport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : null}
                    合并导入 (增量合并)
                  </Button>
                  <Button
                    onClick={() => executeImport("overwrite")}
                    disabled={isProcessingImport}
                    variant="default"
                    size="sm"
                    className="text-xs h-9 font-semibold bg-zinc-900 text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-150"
                  >
                    {isProcessingImport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : null}
                    覆盖导入 (完全清空)
                  </Button>
                </div>
              </div>
            )}

            {/* If parsing failed or error displays but preview is gone */}
            {!importPreview && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setIsImportModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs h-8 px-4"
                >
                  关闭
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
