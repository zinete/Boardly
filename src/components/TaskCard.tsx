import React from 'react';
import { Task, Label } from '../types';
import { useKanbanStore } from '../lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, Link2, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface TaskCardProps {
  key?: string;
  task: Task;
  index: number;
  onOpenDetails: (taskId: string) => void;
}

export function TaskCard({ task, index, onOpenDetails }: TaskCardProps) {
  const { labels, tasks } = useKanbanStore();

  const taskLabels = labels.filter((lbl) => task.labels.includes(lbl.id));

  // Determine priority styles
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/35 text-[10px] font-bold rounded uppercase tracking-wider py-0 px-1.5 h-4.5">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/35 text-[10px] font-bold rounded uppercase tracking-wider py-0 px-1.5 h-4.5">Med</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-bold rounded uppercase tracking-wider py-0 px-1.5 h-4.5">Low</Badge>;
    }
  };

  // Check if due date is overdue
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'done';

  const getDueDateDisplay = () => {
    if (!task.dueDate) return null;
    return (
      <div className={`flex items-center gap-1 text-[11px] mt-1 font-sans ${isOverdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}`}>
        <Calendar className="w-3.5 h-3.5 opacity-80" />
        <span>{task.dueDate}</span>
        {isOverdue && <span className="text-[10px] bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-1 rounded border border-rose-100/50 dark:border-rose-900/30">已逾期</span>}
      </div>
    );
  };

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual state
    e.currentTarget.classList.add('opacity-40');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-40');
  };

  const labelColorMap: Record<string, string> = {
    blue: 'bg-blue-50/60 text-blue-600 hover:bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    emerald: 'bg-emerald-50/60 text-emerald-600 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
    green: 'bg-green-50/60 text-green-600 hover:bg-green-50 dark:bg-green-950/20 dark:text-green-400 border-green-100 dark:border-green-900/30',
    amber: 'bg-amber-50/60 text-amber-600 hover:bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    red: 'bg-red-50/60 text-red-600 hover:bg-red-50 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/30',
    rose: 'bg-rose-50/60 text-rose-600 hover:bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    purple: 'bg-purple-50/60 text-purple-600 hover:bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
    indigo: 'bg-indigo-50/60 text-indigo-600 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
    pink: 'bg-pink-50/60 text-pink-600 hover:bg-pink-50 dark:bg-pink-950/20 dark:text-pink-400 border-pink-100 dark:border-pink-900/30',
    gray: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/60 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60',
  };

  return (
    <motion.div
      layoutId={`card-${task.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="mb-3"
    >
      <Card
        id={`task-card-${task.id}`}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => onOpenDetails(task.id)}
        className="cursor-grab hover:shadow-md active:cursor-grabbing border border-border transition-all duration-150 select-none bg-card group rounded-xl"
      >
        {task.images && task.images.length > 0 && (
          <div className="w-full h-28 overflow-hidden border-b border-border">
            <img
              src={task.images[0]}
              alt="Task cover"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-[14px] font-medium text-foreground line-clamp-2 leading-relaxed transition-colors">
              {task.title}
            </h4>
            <span className="shrink-0">{getPriorityBadge(task.priority)}</span>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-sans">
              {task.description}
            </p>
          )}

          {/* Labels & Tags row */}
          {taskLabels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {taskLabels.map((lbl) => (
                <Badge
                  key={lbl.id}
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 rounded border font-medium ${labelColorMap[lbl.color] || labelColorMap.gray}`}
                >
                  {lbl.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer Meta Row */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
            {getDueDateDisplay() || <div />}
            
            <div className="flex items-center gap-2 text-muted-foreground">
              {task.linkedTaskIds && task.linkedTaskIds.length > 0 && (
                <div className="flex items-center gap-0.5 text-[10px] bg-muted text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors border border-border">
                  <Link2 className="w-3 h-3 text-muted-foreground" />
                  <span className="font-mono">{task.linkedTaskIds.length}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
