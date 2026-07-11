import React, { useEffect, useState, useMemo } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';
import { useKanbanStore, getAiEnabled, setAiEnabled } from './lib/store';
import { useTheme } from './lib/ThemeContext';
import { KanbanColumn } from './components/KanbanColumn';
import { LabelManager } from './components/LabelManager';
import { SmartLabelManager } from './components/SmartLabelManager';
import { TaskDetailModal } from './components/TaskDetailModal';
import { NewTaskModal } from './components/NewTaskModal';
import { SettingsView } from './components/SettingsView';
import { TaskStatus } from './types';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Tag,
  RotateCcw,
  Plus,
  Loader2,
  Database,
  ArrowRightLeft,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ShinyText from './components/ShinyText';

export default function App() {
  const { currentTheme } = useTheme();
  const scrollbarOptions = useMemo(() => ({
    scrollbars: {
      autoHide: 'scroll' as const,
      theme: currentTheme.isDark ? 'os-theme-light' : 'os-theme-dark',
    },
  }), [currentTheme.isDark]);

  const {
    tasks,
    labels,
    smartLabels,
    selectedSmartLabelId,
    selectedLabelId,
    searchQuery,
    isLoading,
    initStore,
    setSelectedSmartLabelId,
    setSelectedLabelId,
    setSearchQuery,
  } = useKanbanStore();

  // Modals state
  const [aiEnabled, setAiEnabledState] = useState(getAiEnabled);
  useEffect(() => {
    const sync = () => setAiEnabledState(getAiEnabled());
    sync();
    const id = setInterval(sync, 500);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => { clearInterval(id); window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);
  const handleToggleAi = () => {
    const next = !aiEnabled;
    setAiEnabledState(next);
    setAiEnabled(next);
  };
  const [activeView, setActiveView] = useState<'board' | 'settings'>('board');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskDefaultStatus, setNewTaskDefaultStatus] = useState<TaskStatus>('todo');

  useEffect(() => {
    initStore();
  }, [initStore]);

  const handleOpenAddTask = (status: TaskStatus) => {
    setNewTaskDefaultStatus(status);
    setIsNewTaskOpen(true);
  };

  const handleClearFilters = () => {
    setSelectedSmartLabelId(null);
    setSelectedLabelId(null);
    setSearchQuery('');
  };

  // Navigate directly to linked task inside details modal
  const handleNavigateToTask = (id: string) => {
    setEditingTaskId(id);
  };

  // Find active filter text for banner display
  const getActiveFilterText = () => {
    if (selectedSmartLabelId) {
      const s = smartLabels.find((sl) => sl.id === selectedSmartLabelId);
      return s ? `智能标签: ${s.name}` : '智能筛选';
    }
    if (selectedLabelId) {
      const l = labels.find((lbl) => lbl.id === selectedLabelId);
      return l ? `自定义标签: ${l.name}` : '标签筛选';
    }
    if (searchQuery) {
      return `搜索关键字: "${searchQuery}"`;
    }
    return null;
  };

  const labelBgMap: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    gray: 'bg-slate-500',
  };

  const smartBgMap: Record<string, string> = {
    sky: 'bg-sky-500',
    rose: 'bg-rose-500',
    orange: 'bg-orange-500',
    violet: 'bg-violet-500',
    teal: 'bg-teal-500',
    gray: 'bg-slate-500',
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col md:flex-row antialiased">
      
      {/* 1. Sidebar Column */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-sidebar-border bg-sidebar-background flex flex-col md:h-screen shrink-0 md:sticky md:top-0">
        
        {/* Brand Header */}
        <div className="p-4.5 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center text-background font-semibold shadow-sm">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <div>
              <ShinyText text="TaskFlow AI" />
              <span className="text-[10px] text-muted-foreground font-mono mt-1 block leading-none">Kanban v1.2</span>
            </div>
          </div>
        </div>

        {/* Scrollable Filters Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <OverlayScrollbarsComponent
          options={scrollbarOptions}
          className="flex-1 min-h-0"
          defer
        >
          <div className="p-4.5 space-y-6">
          {/* View Switcher Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">系统导航</label>
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl border border-border">
              <button
                onClick={() => setActiveView('board')}
                className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  activeView === 'board'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>任务看板</span>
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  activeView === 'settings'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>系统设置</span>
              </button>
            </div>
          </div>
          
          {/* Search Box */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">检索任务</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="搜索标题或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8.5 bg-card border-border rounded-lg focus-visible:ring-1 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Smart Labels Filters List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
                智能过滤
              </span>
              <SmartLabelManager trigger={
                <button className="text-muted-foreground hover:text-foreground text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer">
                  <Plus className="w-3 h-3" /> 配置
                </button>
              } />
            </div>
            
            <div className="space-y-1">
              {smartLabels.map((smart) => {
                const isActive = selectedSmartLabelId === smart.id;
                return (
                  <button
                    key={smart.id}
                    onClick={() => setSelectedSmartLabelId(isActive ? null : smart.id)}
                    className={`w-full flex items-center justify-between text-left text-xs px-2.5 py-2 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-foreground text-background font-semibold shadow-sm'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${smartBgMap[smart.color] || 'bg-sky-500'} shrink-0`} />
                      <span className="truncate">{smart.name}</span>
                    </div>
                    {!isActive && (
                      <span className="text-[9px] font-mono text-muted-foreground opacity-60">Smart</span>
                    )}
                  </button>
                );
              })}
              {smartLabels.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic px-2">无智能标签，点击上方配置</p>
              )}
            </div>
          </div>

          {/* Custom Labels List Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block flex items-center gap-1">
                <Tag className="w-3 h-3 text-muted-foreground" />
                标签筛选
              </span>
              <LabelManager trigger={
                <button className="text-muted-foreground hover:text-foreground text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer">
                  <Plus className="w-3 h-3" /> 管理
                </button>
              } />
            </div>
            
            <div className="space-y-1">
              {labels.map((lbl) => {
                const isActive = selectedLabelId === lbl.id;
                return (
                  <button
                    key={lbl.id}
                    onClick={() => setSelectedLabelId(isActive ? null : lbl.id)}
                    className={`w-full flex items-center justify-between text-left text-xs px-2.5 py-2 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-foreground text-background font-semibold shadow-sm'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${labelBgMap[lbl.color] || 'bg-zinc-500'} shrink-0`} />
                      <span className="truncate">{lbl.name}</span>
                    </div>
                  </button>
                );
              })}
              {labels.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic px-2">无自定义标签，点击上方管理</p>
              )}
            </div>
          </div>

          {/* Reset Filters */}
          {(selectedSmartLabelId || selectedLabelId || searchQuery) && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleClearFilters}
              className="w-full text-[11px] h-8 gap-1 text-muted-foreground border-border hover:bg-muted rounded-lg font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              重置所有筛选器
            </Button>
          )}
          </div>
        </OverlayScrollbarsComponent>
        </div>

        {/* Sync Status Badge Box at bottom of Sidebar */}
        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="bg-card border border-border p-3 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate leading-none">本地存储</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">IndexedDB 同步</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Column */}
      {activeView === 'settings' ? (
        <SettingsView onBackToBoard={() => setActiveView('board')} />
      ) : (
        <main className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden">
          
          {/* Top Header Navigation Bar */}
          <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                任务看板工作流 (Board)
              </h2>
              <p className="text-[10px] text-muted-foreground font-sans">本地 IndexedDB 持久化存储与拖拽排序</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleOpenAddTask('todo')}
                size="sm"
                className="h-9 px-4 rounded-xl flex items-center gap-1.5 font-medium text-xs bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                新建任务
              </Button>
            </div>
          </header>

          {/* AI Status Bar */}
          {aiEnabled && (
            <div className="flex items-center justify-between px-6 py-2 bg-indigo-50/60 dark:bg-indigo-950/15 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="text-xs text-foreground font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AI 功能已启用
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">— AI 智能辅助可在任务编辑中使用</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView('settings')}
                  className="text-[10px] text-indigo-500 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  AI 设置
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiEnabled}
                  onClick={handleToggleAi}
                  className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-indigo-500 dark:bg-indigo-400"
                >
                  <span className="pointer-events-none inline-block h-4 w-4 rounded-full bg-primary-foreground shadow-lg ring-0 transition-transform duration-200 ease-in-out translate-x-4" />
                </button>
              </div>
            </div>
          )}

          {/* Kanban Area - fills remaining height */}
          <div className="flex-1 min-h-0 bg-background p-6 flex flex-col">
            {/* Active Filter Bar Banner */}
            {getActiveFilterText() && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted border border-border text-xs text-foreground mb-4 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-ping mr-1" />
                  正在查看：<strong>{getActiveFilterText()}</strong>
                </div>
                <button
                  onClick={handleClearFilters}
                  className="text-[11px] underline hover:text-muted-foreground font-semibold cursor-pointer"
                >
                  清除筛选器
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-xs">正在连接本地 IndexedDB...</p>
              </div>
            ) : (
              /* Kanban Column Grid - horizontal scroll */
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <OverlayScrollbarsComponent
                options={scrollbarOptions}
                className="flex-1 min-h-0"
                defer
              >
              <div className="flex flex-nowrap gap-5 h-full items-stretch pb-2">
                <KanbanColumn
                  status="todo"
                  title="待办事项 (To Do)"
                  onOpenDetails={setEditingTaskId}
                  onAddTask={handleOpenAddTask}
                />
                <KanbanColumn
                  status="in-progress"
                  title="进行中 (In Progress)"
                  onOpenDetails={setEditingTaskId}
                  onAddTask={handleOpenAddTask}
                />
                <KanbanColumn
                  status="done"
                  title="已完成 (Done)"
                  onOpenDetails={setEditingTaskId}
                  onAddTask={handleOpenAddTask}
                />
              </div>
              </OverlayScrollbarsComponent>
              </div>
            )}
          </div>
        </main>
      )}

      {/* 3. Modal Layer */}
      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        defaultStatus={newTaskDefaultStatus}
      />

      <TaskDetailModal
        taskId={editingTaskId}
        onClose={() => setEditingTaskId(null)}
        onNavigateToTask={handleNavigateToTask}
      />
    </div>
  );
}
