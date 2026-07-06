import React, { useState, useEffect, useRef } from 'react';
import { useKanbanStore } from '../lib/store';
import { TaskPriority, TaskStatus } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  Tag,
  AlertCircle,
  Sparkles,
  Loader2,
  Check,
  X,
  Bold,
  Italic,
  Heading3,
  ListTodo,
  List,
  Link,
  Image,
  Upload,
  Eye,
  Edit3,
  Trash2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { renderMarkdownToHtml, insertMarkdown } from '../lib/richText';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus: TaskStatus;
}

export function NewTaskModal({ isOpen, onClose, defaultStatus }: NewTaskModalProps) {
  const { labels, addTask } = useKanbanStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('low');
  const [dueDate, setDueDate] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  
  // Images (local base64 or URL hosting)
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Tab state for description: edit vs preview
  const [descriptionTab, setDescriptionTab] = useState<'edit' | 'preview'>('edit');

  // AI draft states
  const [draftText, setDraftText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('low');
      setDueDate('');
      setSelectedLabelIds([]);
      setDraftText('');
      setAiError(null);
      setImages([]);
      setImageUrlInput('');
      setShowUrlInput(false);
      setDescriptionTab('edit');
    }
  }, [isOpen, defaultStatus]);

  const handleToggleLabel = (id: string) => {
    if (selectedLabelIds.includes(id)) {
      setSelectedLabelIds(selectedLabelIds.filter((lid) => lid !== id));
    } else {
      setSelectedLabelIds([...selectedLabelIds, id]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addTask({
      title: title.trim(),
      description,
      status,
      priority,
      dueDate: dueDate || undefined,
      labels: selectedLabelIds,
      images,
    });

    onClose();
  };

  // Formatting actions
  const applyFormat = (type: 'bold' | 'italic' | 'h3' | 'bullet' | 'todo' | 'link' | 'image_url', val?: string) => {
    if (textareaRef.current) {
      insertMarkdown(textareaRef.current, type, val);
      setDescription(textareaRef.current.value);
    }
  };

  // Convert uploaded files to Base64
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
    // reset input
    e.target.value = '';
  };

  // Add an external URL image
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Conversational parsing with Gemini
  const handleAiParseDraft = async () => {
    if (!draftText.trim()) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const todayString = new Date().toISOString().split('T')[0];

      // Retrieve custom AI configurations
      const provider = localStorage.getItem('taskflow_ai_provider') || 'gemini';
      const useCustomKey = localStorage.getItem('taskflow_ai_use_custom_key') === 'true';
      const customApiKey = (provider === 'gemini' ? (useCustomKey ? localStorage.getItem('taskflow_ai_custom_key') || '' : '') : (localStorage.getItem('taskflow_ai_custom_key') || ''));
      const customUrl = localStorage.getItem('taskflow_ai_custom_url') || '';
      const customModel = localStorage.getItem('taskflow_ai_model') || (provider === 'gemini' ? 'gemini-3.5-flash' : provider === 'openai' ? 'gpt-4o-mini' : provider === 'deepseek' ? 'deepseek-chat' : provider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');
      const customInstruction = localStorage.getItem('taskflow_ai_custom_instruction') || '';

      const response = await fetch('/api/parse-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: draftText,
          availableLabels: labels.map((l) => ({ id: l.id, name: l.name })),
          currentDate: todayString,
          provider,
          customApiKey: customApiKey || undefined,
          customUrl: customUrl || undefined,
          customModel: customModel,
          customInstruction: customInstruction,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '解析失败');
      }

      // Fill form values with AI suggestions
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.priority) setPriority(data.priority);
      if (data.dueDate) setDueDate(data.dueDate);
      if (data.suggestedLabelIds) setSelectedLabelIds(data.suggestedLabelIds);

    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'AI 解析失败，请检查服务设置或 API Key。');
    } finally {
      setAiLoading(false);
    }
  };

  const labelColorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    pink: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    gray: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md md:max-w-lg lg:max-w-xl h-full bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-16 px-6 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">新建任务</h3>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500">创建并配置研发看板工作流任务</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* AI Quick Draft Assist Banner */}
              <div className="border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  AI 智能快捷起草
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  口语化描述（如: "下周一前完成数据库重构，标为高优，打上技术标签"），AI 将自动解析标题、描述和元数据。
                </p>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="在这里输入您的一句话任务描述..."
                    className="text-xs h-8.5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-lg flex-1 focus-visible:ring-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAiParseDraft()}
                  />
                  <Button
                    onClick={handleAiParseDraft}
                    disabled={aiLoading || !draftText.trim()}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shrink-0 h-8.5 text-xs rounded-lg gap-1 font-medium"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        解析中...
                      </>
                    ) : (
                      '填充'
                    )}
                  </Button>
                </div>
                {aiError && (
                  <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-0.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {aiError}
                  </p>
                )}
              </div>

              {/* Regular Creation Form */}
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">任务标题</label>
                  <Input
                    placeholder="例如: 编写高并发性能测试用例..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-10 text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg focus-visible:ring-1"
                  />
                </div>

                {/* Description with Formatting & Preview Tab */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">任务描述 (富文本)</label>
                    
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDescriptionTab('edit')}
                        className={`px-2 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all ${
                          descriptionTab === 'edit'
                            ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-250 shadow-xs'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescriptionTab('preview')}
                        className={`px-2 py-1 text-[10px] font-medium rounded-md flex items-center gap-1 transition-all ${
                          descriptionTab === 'preview'
                            ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-250 shadow-xs'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        预览
                      </button>
                    </div>
                  </div>

                  {descriptionTab === 'edit' ? (
                    <div className="border border-zinc-200 dark:border-zinc-850 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 flex flex-col focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-300">
                      {/* Formatting Toolbar */}
                      <div className="h-8.5 px-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-150 dark:border-zinc-850 flex items-center gap-1 overflow-x-auto shrink-0 select-none">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => applyFormat('bold')}
                          className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100"
                          title="粗体"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => applyFormat('italic')}
                          className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100"
                          title="斜体"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => applyFormat('h3')}
                          className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100"
                          title="三级标题"
                        >
                          <Heading3 className="w-3.5 h-3.5" />
                        </Button>
                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => applyFormat('todo')}
                          className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100"
                          title="待办复选框"
                        >
                          <ListTodo className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => applyFormat('bullet')}
                          className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100"
                          title="无序列表"
                        >
                          <List className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            const url = prompt('请输入链接地址:', 'https://');
                            if (url) applyFormat('link', url);
                          }}
                          className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100"
                          title="插入链接"
                        >
                          <Link className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            const url = prompt('请输入图片URL链接 (支持图床载入):', 'https://');
                            if (url) applyFormat('image_url', url);
                          }}
                          className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-100"
                          title="插入图片链接"
                        >
                          <Image className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <Textarea
                        ref={textareaRef}
                        placeholder="支持 Markdown 格式编排说明 (例如：**粗体**、- [ ] 任务列表、### 标题 等)..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-32 text-xs bg-transparent border-0 rounded-none focus-visible:ring-0 resize-y leading-relaxed p-3 focus:outline-hidden"
                      />
                    </div>
                  ) : (
                    <div className="border border-zinc-200 dark:border-zinc-850 rounded-lg p-4 bg-zinc-50/50 dark:bg-zinc-950/40 min-h-[145px] max-h-72 overflow-y-auto leading-relaxed text-xs">
                      {description.trim() ? (
                        <div
                          className="markdown-body prose dark:prose-invert prose-xs space-y-1 text-zinc-800 dark:text-zinc-200"
                          dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(description) }}
                        />
                      ) : (
                        <span className="text-zinc-400 italic">暂无内容预览...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Images Attachment Manager */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                      <Image className="w-3.5 h-3.5" />
                      图片附件 (上传至本地 / 支持图床)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      {showUrlInput ? '取消' : '+ 引入图床图片'}
                    </button>
                  </div>

                  {/* External URL Image Input */}
                  {showUrlInput && (
                    <div className="flex gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-850 animate-fade-in">
                      <Input
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="输入图片 URL 直链 (例如 https://example.com/cover.png)..."
                        className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex-1 focus-visible:ring-1"
                      />
                      <Button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="h-8 text-[11px] px-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        载入
                      </Button>
                    </div>
                  )}

                  {/* Grid layout for files & current images */}
                  <div className="grid grid-cols-4 gap-2">
                    {/* Add Local File Button Card */}
                    <label className="h-16 border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-950/40 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="w-4 h-4 text-zinc-400" />
                      <span className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-1 font-medium">本地上传</span>
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
                        className="group relative h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-850 bg-zinc-50 animate-fade-in"
                      >
                        <img
                          src={img}
                          alt="Thumbnail"
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
                  {images.length > 0 && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 italic">
                      💡 提示: 首张图片将被自动选为该任务的封面。
                    </p>
                  )}
                </div>

                {/* Status, Priority, DueDate */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">任务状态</label>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg">
                        <SelectValue placeholder="选择列" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg">
                        <SelectItem value="todo">待办 (todo)</SelectItem>
                        <SelectItem value="in-progress">进行中 (in-progress)</SelectItem>
                        <SelectItem value="done">已完成 (done)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">任务优先级</label>
                    <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                      <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg">
                        <SelectValue placeholder="优先级" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg">
                        <SelectItem value="high">🔴 高优先级</SelectItem>
                        <SelectItem value="medium">🟡 中优先级</SelectItem>
                        <SelectItem value="low">🟢 低优先级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">截止日期</label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="pl-8 text-xs h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 rounded-lg font-mono focus-visible:ring-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Label Manager checkboxes */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">关联标签</label>
                  <div className="border border-zinc-150 dark:border-zinc-850 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {labels.map((lbl) => {
                      const isSelected = selectedLabelIds.includes(lbl.id);
                      return (
                        <button
                          key={lbl.id}
                          type="button"
                          onClick={() => handleToggleLabel(lbl.id)}
                          className={`flex items-center gap-1 text-[11px] py-1 px-2.5 rounded-full border transition-all ${
                            isSelected
                              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-medium scale-102 shadow-xs'
                              : `${labelColorMap[lbl.color] || labelColorMap.gray} opacity-70 hover:opacity-100`
                          }`}
                        >
                          {lbl.name}
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                    {labels.length === 0 && (
                      <span className="text-xs text-zinc-400 italic">暂无可用标签，可在上方自定义创建。</span>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer buttons */}
            <div className="h-16 px-6 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 text-xs rounded-lg font-medium border-zinc-200 dark:border-zinc-800"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!title.trim()}
                className="h-9 text-xs rounded-lg font-semibold px-4 text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                保存并新建
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
