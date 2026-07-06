import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { useKanbanStore, taskMatchesSmartLabel } from '../lib/store';
import { Plus, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  onOpenDetails: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanColumn({ status, title, onOpenDetails, onAddTask }: KanbanColumnProps) {
  const { tasks, smartLabels, selectedSmartLabelId, selectedLabelId, searchQuery, moveTask } = useKanbanStore();
  const [isOver, setIsOver] = useState(false);

  // Filter tasks belonging to this column based on active filters
  const filteredTasks = tasks.filter((task) => {
    // 1. Filter by column status
    if (task.status !== status) return false;

    // 2. Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch = task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 3. Filter by selected Smart Label
    if (selectedSmartLabelId) {
      const activeSmart = smartLabels.find((s) => s.id === selectedSmartLabelId);
      if (activeSmart) {
        return taskMatchesSmartLabel(task, activeSmart);
      }
    }

    // 4. Filter by selected custom label
    if (selectedLabelId) {
      return task.labels.includes(selectedLabelId);
    }

    return true;
  });

  // Keep tasks sorted by their 'order' field
  const sortedTasks = filteredTasks.sort((a, b) => a.order - b.order);

  // Header status icons
  const getHeaderIcon = () => {
    switch (status) {
      case 'todo':
        return <Circle className="w-5 h-5 text-slate-400 shrink-0" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />;
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  // Calculate index where the item is dropped based on Y coordinate
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Find insertion index
    const columnContainer = e.currentTarget as HTMLElement;
    const cards = Array.from(columnContainer.querySelectorAll('[id^="task-card-"]'));
    
    let targetOrder = sortedTasks.length; // Default to append at the end

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const rect = card.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;

      if (e.clientY < cardCenterY) {
        // Drop is above the center of this card
        targetOrder = i;
        break;
      }
    }

    // Call store action
    await moveTask(taskId, status, targetOrder);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full rounded-2xl p-4 border transition-colors duration-200 w-full min-w-[280px] bg-zinc-50/50 dark:bg-zinc-900/40 ${
        isOver
          ? 'border-zinc-900/40 bg-zinc-100/50 dark:bg-zinc-800/50 shadow-inner'
          : 'border-zinc-200/60 dark:border-zinc-800/60'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1.5 pt-1">
        <div className="flex items-center gap-2">
          {getHeaderIcon()}
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm tracking-wide">
            {title}
          </h3>
          <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500">
            {sortedTasks.length}
          </span>
        </div>
        
        {status === 'todo' && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => onAddTask(status)}
            className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            id="add-task-btn"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto min-h-[300px] scrollbar-thin scrollbar-thumb-zinc-200 pr-1 select-none">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task, idx) => (
            <TaskCard
              key={task.id}
              task={task}
              index={idx}
              onOpenDetails={onOpenDetails}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/40 dark:bg-zinc-900/10 mt-1">
            <p className="text-xs text-zinc-400">无任务</p>
            <p className="text-[10px] text-zinc-400 mt-1">拖拽或新建任务到此列</p>
          </div>
        )}
      </div>

      {/* Quick bottom add task button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAddTask(status)}
        className="w-full mt-3 justify-start text-xs font-normal text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200/40 border-dashed hover:border-solid hover:shadow-sm"
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        新建任务...
      </Button>
    </div>
  );
}
