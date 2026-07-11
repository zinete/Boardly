import React, { useState, useEffect, useRef } from 'react';
import { useKanbanStore, useHasAiKey } from '../store/useKanbanStore';
import { Task, TaskPriority, TaskStatus } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Tag,
  Link2,
  Trash2,
  Brain,
  CheckCircle2,
  Plus,
  Loader2,
  Sparkles,
  Link,
  ChevronRight,
  ListTodo,
  Bold,
  Italic,
  Heading3,
  List,
  Image,
  Upload,
  Eye,
  Edit3,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { renderMarkdownToHtml, insertMarkdown } from '../lib/richText';

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
  onNavigateToTask: (id: string) => void;
}

export function TaskDetailModal({ taskId, onClose, onNavigateToTask }: TaskDetailModalProps) {
  const { tasks, labels, updateTask, deleteTask } = useKanbanStore();
  const hasAiKey = useHasAiKey();

  const task = tasks.find((t) => t.id === taskId);

  // Local active task to retain values during exit slide animation
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Local state for editing fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('low');
  const [dueDate, setDueDate] = useState('');
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [linkCandidateId, setLinkCandidateId] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Rich Text Editor states
  const [descriptionTab, setDescriptionTab] = useState<'edit' | 'preview'>('edit');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    priority: TaskPriority;
    suggestedLabelIds: string[];
    explanation: string;
    subtasks: string[];
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Sync state with current task when it changes
  useEffect(() => {
    if (task) {
      setActiveTask(task);
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate || '');
      setTaskLabels(task.labels);
      setImages(task.images || []);
      setImageUrlInput('');
      setShowUrlInput(false);
      setDescriptionTab('edit');
      setAiResult(null);
      setAiError(null);
      setIsConfirmingDelete(false);
    }
  }, [task, taskId]);

  const isOpen = taskId !== null;

  // Handle updates & save
  const handleSave = async () => {
    if (!activeTask) return;
    await updateTask(activeTask.id, {
      title: title.trim() || '无标题任务',
      description,
      status,
      priority,
      dueDate: dueDate || undefined,
      labels: taskLabels,
      images,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!activeTask) return;
    await deleteTask(activeTask.id);
    onClose();
  };

  // Toggle label assignment
  const handleToggleLabel = (labelId: string) => {
    if (taskLabels.includes(labelId)) {
      setTaskLabels(taskLabels.filter((id) => id !== labelId));
    } else {
      setTaskLabels([...taskLabels, labelId]);
    }
  };

  // Rich Text & Images helper functions
  const applyFormat = (type: 'bold' | 'italic' | 'h3' | 'bullet' | 'todo' | 'link' | 'image_url', val?: string) => {
    if (textareaRef.current) {
      insertMarkdown(textareaRef.current, type, val);
      setDescription(textareaRef.current.value);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setImages((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Bidirectional linking
  const handleLinkTask = async () => {
    if (!activeTask || !linkCandidateId) return;

    // Check if link already exists
    if (activeTask.linkedTaskIds.includes(linkCandidateId)) return;

    const targetTask = tasks.find((t) => t.id === linkCandidateId);
    if (!targetTask) return;

    // Update current task linked IDs
    const currentLinks = [...activeTask.linkedTaskIds, linkCandidateId];
    await updateTask(activeTask.id, { linkedTaskIds: currentLinks });

    // Update target task linked IDs (bidirectional)
    const targetLinks = [...targetTask.linkedTaskIds, activeTask.id];
    await updateTask(targetTask.id, { linkedTaskIds: targetLinks });

    setLinkCandidateId('');
  };

  const handleUnlinkTask = async (targetId: string) => {
    if (!activeTask) return;
    const targetTask = tasks.find((t) => t.id === targetId);

    // Update current task
    const currentLinks = activeTask.linkedTaskIds.filter((id) => id !== targetId);
    await updateTask(activeTask.id, { linkedTaskIds: currentLinks });

    // Update target task (bidirectional)
    if (targetTask) {
      const targetLinks = targetTask.linkedTaskIds.filter((id) => id !== activeTask.id);
      await updateTask(targetTask.id, { linkedTaskIds: targetLinks });
    }
  };

  // Run AI Analysis
  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      // Retrieve custom AI configurations
      const provider = localStorage.getItem('taskflow_ai_provider') || 'gemini';
      const useCustomKey = localStorage.getItem('taskflow_ai_use_custom_key') === 'true';
      const customApiKey = (provider === 'gemini' ? (useCustomKey ? localStorage.getItem('taskflow_ai_custom_key') || '' : '') : (localStorage.getItem('taskflow_ai_custom_key') || ''));
      const customUrl = localStorage.getItem('taskflow_ai_custom_url') || '';
      const customModel = localStorage.getItem('taskflow_ai_model') || (provider === 'gemini' ? 'gemini-3.5-flash' : provider === 'openai' ? 'gpt-4o-mini' : provider === 'deepseek' ? 'deepseek-chat' : provider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');
      const customInstruction = localStorage.getItem('taskflow_ai_custom_instruction') || '';

      const response = await fetch('/api/smart-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          availableLabels: labels.map((l) => ({ id: l.id, name: l.name })),
          provider,
          customApiKey: customApiKey || undefined,
          customUrl: customUrl || undefined,
          customModel: customModel,
          customInstruction: customInstruction,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      setAiResult(data);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'AI 智能解析失败，请检查密钥配置。');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestions = async () => {
    if (!aiResult) return;

    setPriority(aiResult.priority);
    
    // Add suggested labels to current selection
    const mergedLabels = Array.from(new Set([...taskLabels, ...aiResult.suggestedLabelIds]));
    setTaskLabels(mergedLabels);

    // Append suggested subtasks to description as markdown checklist if user wishes
    if (aiResult.subtasks && aiResult.subtasks.length > 0) {
      const subtaskMarkdown = `\n\n### 📋 AI 拆解子任务清单：\n` + aiResult.subtasks.map((st) => `- [ ] ${st}`).join('\n');
      setDescription((prev) => prev + subtaskMarkdown);
    }

    setAiResult(null);
  };

  // Get current linked tasks details
  const linkedTasks = activeTask ? tasks.filter((t) => activeTask.linkedTaskIds.includes(t.id)) : [];

  // Eligible tasks to link with (must not be self, and must not be already linked)
  const availableToLink = activeTask
    ? tasks.filter((t) => t.id !== activeTask.id && !activeTask.linkedTaskIds.includes(t.id))
    : [];

  const labelColorMap: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent dark:border-transparent',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent dark:border-transparent',
    green: 'bg-green-500/15 text-green-600 dark:text-green-400 border-transparent dark:border-transparent',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent dark:border-transparent',
    red: 'bg-red-500/15 text-red-600 dark:text-red-400 border-transparent dark:border-transparent',
    rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-transparent dark:border-transparent',
    purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-transparent dark:border-transparent',
    indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-transparent dark:border-transparent',
    pink: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-transparent dark:border-transparent',
    gray: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-transparent dark:border-transparent',
  };

  const labelIndicatorColorMap: Record<string, string> = {
    blue: 'bg-blue-500 border-blue-500',
    emerald: 'bg-emerald-500 border-emerald-500',
    green: 'bg-green-500 border-green-500',
    amber: 'bg-amber-500 border-amber-500',
    red: 'bg-red-500 border-red-500',
    rose: 'bg-rose-500 border-rose-500',
    purple: 'bg-purple-500 border-purple-500',
    indigo: 'bg-indigo-500 border-indigo-500',
    pink: 'bg-pink-500 border-pink-500',
    gray: 'bg-slate-500 border-slate-500',
  };

  return (
    <AnimatePresence>
      {isOpen && activeTask && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 backdrop-blur-xs"
          />

          {/* Right Sliding Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl h-full bg-card shadow-2xl border-l border-border dark:border-border/60 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 px-6 border-b border-border dark:border-border/60 flex items-center justify-between bg-popover/95 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">任务详情与编辑</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                    <span>ID: {activeTask.id.substring(0, 12)}...</span>
                    <span>•</span>
                    <span>创建于: {new Date(activeTask.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Double Column Trello-like Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Editing Column (Left 2 cols) */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Title editing */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">任务名称</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="无标题任务"
                      className="text-sm font-semibold tracking-tight h-10 border-input focus-visible:ring-1 rounded-lg"
                    />
                  </div>

                  {/* Description editing */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">详细描述</label>
                        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg select-none">
                          <button
                            type="button"
                            onClick={() => setDescriptionTab('edit')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all ${
                              descriptionTab === 'edit'
                                ? 'bg-card text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => setDescriptionTab('preview')}
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all ${
                              descriptionTab === 'preview'
                                ? 'bg-card text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Eye className="w-2.5 h-2.5" />
                            预览
                          </button>
                        </div>
                      </div>
                      
                      {/* AI Assistant Button */}
                      {hasAiKey && (
                      <Button
                        onClick={runAiAnalysis}
                        disabled={aiLoading}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 gap-1 rounded-md"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                            正在智能分析...
                          </>
                        ) : (
                          <>
                            <Brain className="w-3.5 h-3.5 text-indigo-500" />
                            Gemini AI 智能分析
                          </>
                        )}
                      </Button>
                      )}
                    </div>

                    {descriptionTab === 'edit' ? (
                      <div className="border border-border dark:border-border/60 rounded-lg overflow-hidden bg-card flex flex-col focus-within:ring-1 focus-within:ring-primary">
                        {/* Formatting Toolbar */}
                        <div className="h-8 px-2 bg-muted border-b border-border dark:border-border/60 flex items-center gap-1 overflow-x-auto shrink-0 select-none">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => applyFormat('bold')}
                            className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-foreground"
                            title="粗体"
                          >
                            <Bold className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => applyFormat('italic')}
                            className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-foreground"
                            title="斜体"
                          >
                            <Italic className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => applyFormat('h3')}
                            className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-foreground"
                            title="三级标题"
                          >
                            <Heading3 className="w-3 h-3" />
                          </Button>
                          <div className="w-px h-3.5 bg-border mx-1 shrink-0" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => applyFormat('todo')}
                            className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-foreground"
                            title="待办复选框"
                          >
                            <ListTodo className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => applyFormat('bullet')}
                            className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-foreground"
                            title="无序列表"
                          >
                            <List className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              const url = prompt('请输入链接地址:', 'https://');
                              if (url) applyFormat('link', url);
                            }}
                            className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-foreground"
                            title="插入链接"
                          >
                            <Link className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              const url = prompt('请输入图片URL链接 (支持图床载入):', 'https://');
                              if (url) applyFormat('image_url', url);
                            }}
                            className="h-5.5 w-5.5 rounded text-muted-foreground hover:text-foreground"
                            title="插入图片链接"
                          >
                            <Image className="w-3 h-3" />
                          </Button>
                        </div>

                        <Textarea
                          ref={textareaRef}
                          placeholder="添加该任务的具体内容与备注 (支持 Markdown 编辑)..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="min-h-36 text-sm font-sans bg-transparent border-0 rounded-none focus-visible:ring-0 resize-y leading-relaxed p-3 focus:outline-hidden"
                        />
                      </div>
                    ) : (
                      <div className="border border-border dark:border-border/60 rounded-lg p-4 bg-muted min-h-[175px] max-h-72 overflow-y-auto leading-relaxed text-sm text-foreground">
                        {description.trim() ? (
                          <div
                            className="markdown-body prose dark:prose-invert prose-sm space-y-1"
                            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(description) }}
                          />
                        ) : (
                          <span className="text-muted-foreground italic">暂无内容预览...</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Images Attachment Manager */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Image className="w-3.5 h-3.5" />
                        图片附件 ({images.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                      >
                        {showUrlInput ? '取消' : '+ 引入图床图片'}
                      </button>
                    </div>

                    {/* External URL Image Input */}
                    {showUrlInput && (
                      <div className="flex gap-1.5 p-2 bg-muted rounded-lg border border-border dark:border-border/60 animate-fade-in">
                        <Input
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="输入图片 URL 直链 (如 https://example.com/cover.png)..."
                          className="h-8 text-xs bg-card border-input flex-1 focus-visible:ring-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddImageUrl}
                          className="h-8 text-[11px] px-3 bg-foreground text-background hover:bg-foreground/90"
                        >
                          载入图片
                        </Button>
                      </div>
                    )}

                    {/* Grid layout for files & current images */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {/* Add Local File Card */}
                      <label className="h-16 border border-dashed border-border hover:border-muted-foreground hover:bg-muted rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground mt-1 font-medium">本地上传</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Image Thumbnails */}
                      {images.map((img, i) => (
                        <div
                          key={i}
                          className="group relative h-16 rounded-lg overflow-hidden border border-border dark:border-border/60 bg-muted animate-fade-in"
                        >
                          <img
                            src={img}
                            alt="Attachment"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(i)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Suggestion Box */}
                  {hasAiKey && aiResult && (
                    <div className="border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl p-4 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-medium text-xs uppercase tracking-wider">
                          <Sparkles className="w-4 h-4" />
                          AI 建议与内容分解
                        </div>
                        <Button
                          size="sm"
                          onClick={applyAiSuggestions}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 px-3 rounded-md"
                        >
                          应用 AI 建议
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground italic">
                        "{aiResult.explanation}"
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">建议优先级</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">{aiResult.priority}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">关联推荐标签</span>
                          <div className="flex flex-wrap gap-1">
                            {aiResult.suggestedLabelIds.map((lid) => {
                              const lbl = labels.find((l) => l.id === lid);
                              return lbl ? (
                                <Badge key={lid} variant="outline" className={`text-[10px] py-0 border ${labelColorMap[lbl.color]}`}>
                                  {lbl.name}
                                </Badge>
                              ) : null;
                            })}
                            {aiResult.suggestedLabelIds.length === 0 && <span className="text-muted-foreground italic">无</span>}
                          </div>
                        </div>
                      </div>

                      {aiResult.subtasks && aiResult.subtasks.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-indigo-100/50 dark:border-indigo-900/20">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                            建议执行步骤：
                          </span>
                          <ul className="list-disc pl-4.5 space-y-1 text-xs text-foreground">
                            {aiResult.subtasks.map((st, i) => (
                              <li key={i}>{st}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {hasAiKey && aiError && (
                    <div className="p-3 border border-red-200 bg-red-50/30 text-red-600 text-xs rounded-lg">
                      {aiError}
                    </div>
                  )}

                  {/* Linked Tasks (关联任务) Section */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5" />
                      关联任务 ({linkedTasks.length})
                    </label>

                    {/* Add New Link Form */}
                    <div className="flex gap-2">
                      <Select value={linkCandidateId} onValueChange={setLinkCandidateId}>
                        <SelectTrigger className="w-full text-xs h-8.5 bg-card rounded-lg">
                          <SelectValue placeholder="选择其他任务进行关联..." />
                        </SelectTrigger>
                        <SelectContent className="text-xs rounded-lg max-h-48 overflow-y-auto">
                          {availableToLink.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              [{t.status === 'done' ? '已完成' : t.status === 'in-progress' ? '进行中' : '待办'}] {t.title}
                            </SelectItem>
                          ))}
                          {availableToLink.length === 0 && (
                            <div className="text-xs text-muted-foreground py-1 px-2">没有可关联的其他任务</div>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleLinkTask}
                        disabled={!linkCandidateId}
                        variant="outline"
                        size="sm"
                        className="h-8.5 shrink-0 text-xs rounded-lg gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        建立关联
                      </Button>
                    </div>

                    {/* Linked Tasks List */}
                    {linkedTasks.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border border-border dark:border-border/60 p-2.5 rounded-lg bg-muted max-h-44 overflow-y-auto">
                        {linkedTasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-2 rounded border bg-card border-border dark:border-border/60 hover:border-muted-foreground hover:shadow-sm transition-all"
                          >
                            <button
                              onClick={() => onNavigateToTask(t.id)}
                              className="text-left text-xs font-medium text-foreground hover:text-primary hover:underline line-clamp-1 flex-1 pr-1 flex items-center gap-1"
                            >
                              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>{t.title}</span>
                            </button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleUnlinkTask(t.id)}
                              className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                              title="解除关联"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">暂无任何关联任务。</p>
                    )}
                  </div>
                </div>

                {/* Metadata & Operations Sidebar (Right 1 col) */}
                <div className="border-t lg:border-t-0 lg:border-l border-border dark:border-border/60 pt-5 lg:pt-0 lg:pl-6 space-y-4">
                  
                  {/* Status Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">任务状态</label>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger className="w-full text-xs h-8.5 bg-card rounded-lg">
                        <SelectValue placeholder="任务状态" />
                      </SelectTrigger>
                      <SelectContent className="text-xs rounded-lg">
                        <SelectItem value="todo">待办 (Todo)</SelectItem>
                        <SelectItem value="in-progress">进行中 (In Progress)</SelectItem>
                        <SelectItem value="done">已完成 (Done)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">优先级</label>
                    <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                      <SelectTrigger className="w-full text-xs h-8.5 bg-card rounded-lg">
                        <SelectValue placeholder="优先级" />
                      </SelectTrigger>
                      <SelectContent className="text-xs rounded-lg">
                        <SelectItem value="high">🔴 高优先级</SelectItem>
                        <SelectItem value="medium">🟡 中优先级</SelectItem>
                        <SelectItem value="low">🟢 低优先级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">截止日期</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="pl-8 text-xs h-8.5 bg-muted border-input rounded-lg font-mono text-foreground placeholder:text-muted-foreground dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Labels checklist */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">所属标签</label>
                    <div className="rounded-lg divide-y divide-border max-h-48 overflow-y-auto overflow-x-hidden">
                      {labels.length > 0 ? (
                        labels.map((lbl) => {
                          const isChecked = taskLabels.includes(lbl.id);
                          return (
                            <button
                              key={lbl.id}
                              type="button"
                              onClick={() => handleToggleLabel(lbl.id)}
                              className={`w-full flex items-center justify-between text-left text-xs py-2 px-1.5 transition-colors ${
                                isChecked
                                  ? 'font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Badge variant="outline" className={`text-[11px] py-0 border ${labelColorMap[lbl.color] || labelColorMap.gray}`}>
                                {lbl.name}
                              </Badge>
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                isChecked
                                  ? `${labelIndicatorColorMap[lbl.color] || labelIndicatorColorMap.gray} border-current text-white`
                                  : 'border-muted-foreground'
                              }`}>
                                {isChecked && <Check className="w-2.5 h-2.5" />}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic p-1 block">暂无标签，可使用顶部标签管理创建</span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="pt-4 border-t border-border dark:border-border/60 space-y-2">
                    <Button
                      onClick={handleSave}
                      className="w-full h-8.5 text-xs rounded-lg font-semibold bg-foreground text-background hover:bg-foreground/90"
                    >
                      保存修改
                    </Button>
                    
                    {isConfirmingDelete ? (
                      <div className="space-y-1.5 animate-fade-in">
                        <p className="text-[10px] text-rose-500 font-semibold text-center uppercase tracking-wider">确定要删除该任务吗？此操作不可撤销</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="h-8.5 text-xs rounded-lg font-medium"
                          >
                            确认删除
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsConfirmingDelete(false)}
                            className="h-8.5 text-xs rounded-lg font-medium border-border"
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => setIsConfirmingDelete(true)}
                        className="w-full h-8.5 text-xs rounded-lg font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        删除该任务
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
