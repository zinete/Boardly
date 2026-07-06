import React, { useEffect, useState } from 'react';
import { useKanbanStore } from './lib/store';
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

export default function App() {
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
    <div className="min-h-screen bg-zinc-50/40 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row antialiased">
      
      {/* 1. Sidebar Column */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-col md:h-screen shrink-0 md:sticky md:top-0">
        
        {/* Brand Header */}
        <div className="p-4.5 flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center text-white dark:text-zinc-950 font-semibold shadow-sm">
              <Sparkles className="w-4 h-4 text-white dark:text-zinc-950" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white leading-none">
                TaskFlow AI
              </h1>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block leading-none">Kanban v1.2</span>
            </div>
          </div>
        </div>

        {/* Scrollable Filters Content */}
        <div className="flex-1 overflow-y-auto p-4.5 space-y-6">
          
          {/* View Switcher Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest block">系统导航</label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-xl border border-zinc-200/40 dark:border-zinc-800/35">
              <button
                onClick={() => setActiveView('board')}
                className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  activeView === 'board'
                    ? 'bg-white text-zinc-950 dark:bg-zinc-850 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>研发看板</span>
              </button>
              <button
                onClick={() => setActiveView('settings')}
                className={`flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                  activeView === 'settings'
                    ? 'bg-white text-zinc-950 dark:bg-zinc-850 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>系统设置</span>
              </button>
            </div>
          </div>
          
          {/* Search Box */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest block">检索任务</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="搜索标题或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8.5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-lg focus-visible:ring-1"
              />
            </div>
          </div>

          {/* Smart Labels Filters List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-widest block flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
                智能过滤
              </span>
              <SmartLabelManager trigger={
                <button className="text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer">
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
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
                        : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-350'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${smartBgMap[smart.color] || 'bg-sky-500'} shrink-0`} />
                      <span className="truncate">{smart.name}</span>
                    </div>
                    {!isActive && (
                      <span className="text-[9px] font-mono text-zinc-400 opacity-60">Smart</span>
                    )}
                  </button>
                );
              })}
              {smartLabels.length === 0 && (
                <p className="text-[11px] text-zinc-400 italic px-2">无智能标签，点击上方配置</p>
              )}
            </div>
          </div>

          {/* Custom Labels List Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-widest block flex items-center gap-1">
                <Tag className="w-3 h-3 text-zinc-400" />
                标签筛选
              </span>
              <LabelManager trigger={
                <button className="text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer">
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
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
                        : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-350'
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
                <p className="text-[11px] text-zinc-400 italic px-2">无自定义标签，点击上方管理</p>
              )}
            </div>
          </div>

          {/* Reset Filters */}
          {(selectedSmartLabelId || selectedLabelId || searchQuery) && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleClearFilters}
              className="w-full text-[11px] h-8 gap-1 text-zinc-500 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              重置所有筛选器
            </Button>
          )}
        </div>

        {/* Sync Status Badge Box at bottom of Sidebar */}
        <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-800 shrink-0">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-3 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate leading-none">本地存储</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider leading-none">IndexedDB 同步</span>
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
          <header className="h-16 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-900/40 shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                研发看板工作流 (Board)
              </h2>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans">本地 IndexedDB 持久化存储与拖拽排序</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleOpenAddTask('todo')}
                size="sm"
                className="h-9 px-4 rounded-xl flex items-center gap-1.5 font-medium text-xs text-white bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                新建任务
              </Button>
            </div>
          </header>

          {/* Kanban Area Wrapper */}
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/20 dark:bg-zinc-900/10 space-y-4">
            
            {/* Active Filter Bar Banner */}
            {getActiveFilterText() && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 animate-fade-in">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-900 dark:bg-zinc-50 rounded-full animate-ping mr-1" />
                  正在查看：<strong>{getActiveFilterText()}</strong>
                </div>
                <button
                  onClick={handleClearFilters}
                  className="text-[11px] underline hover:text-zinc-600 dark:hover:text-zinc-400 font-semibold cursor-pointer"
                >
                  清除筛选器
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-zinc-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
                <p className="text-xs">正在连接本地 IndexedDB...</p>
              </div>
            ) : (
              /* Kanban Column Grid */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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
