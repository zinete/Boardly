import React, { useState } from 'react';
import { useKanbanStore } from '../lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Tag } from 'lucide-react';

const COLORS = [
  { name: '蓝色', value: 'blue', bg: 'bg-blue-500' },
  { name: '翠绿', value: 'emerald', bg: 'bg-emerald-500' },
  { name: '草绿', value: 'green', bg: 'bg-green-500' },
  { name: '琥珀', value: 'amber', bg: 'bg-amber-500' },
  { name: '红色', value: 'red', bg: 'bg-red-500' },
  { name: '玫瑰', value: 'rose', bg: 'bg-rose-500' },
  { name: '紫色', value: 'purple', bg: 'bg-purple-500' },
  { name: '靛蓝', value: 'indigo', bg: 'bg-indigo-500' },
  { name: '粉色', value: 'pink', bg: 'bg-pink-500' },
  { name: '灰色', value: 'gray', bg: 'bg-slate-500' },
];

interface LabelManagerProps { trigger?: React.ReactNode; }

export function LabelManager({ trigger }: LabelManagerProps = {}) {
  const { labels, addLabel, deleteLabel } = useKanbanStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const handleAddLabel = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; await addLabel(name.trim(), selectedColor); setName(''); };
  const labelColorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20', emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    green: 'bg-green-500/10 text-green-600 border-green-500/20', amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20', rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20', indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    pink: 'bg-pink-500/10 text-pink-600 border-pink-500/20', gray: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={trigger || (<Button variant="outline" size="sm" className="gap-1 text-xs"><Tag className="w-3.5 h-3.5" />标签管理</Button>)} />
      <DialogContent className="max-w-md sm:max-w-md bg-card border-border rounded-xl">
        <DialogHeader><DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />标签管理</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">当前自定义标签</h4>
            <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-muted/50">
              {labels.length > 0 ? labels.map((lbl) => (
                <div key={lbl.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 transition-colors">
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded border ${labelColorMap[lbl.color] || labelColorMap.gray}`}>{lbl.name}</Badge>
                  <Button size="icon-xs" variant="ghost" onClick={() => deleteLabel(lbl.id)} className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )) : <p className="text-xs text-muted-foreground text-center py-4">无标签，请在下方创建</p>}
            </div>
          </div>
          <form onSubmit={handleAddLabel} className="space-y-3.5 pt-3 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">新建标签</h4>
            <div className="space-y-2"><label className="text-xs font-medium text-muted-foreground">标签名称</label><Input placeholder="例如: 核心功能, 待测试, 财务" value={name} onChange={(e) => setName(e.target.value)} className="h-8.5 text-sm bg-card border-border rounded-lg" /></div>
            <div className="space-y-2"><label className="text-xs font-medium text-muted-foreground">选择色彩</label>
              <div className="flex flex-wrap gap-2 pt-1">{COLORS.map((col) => (
                <button key={col.value} type="button" onClick={() => setSelectedColor(col.value)} className={`w-6 h-6 rounded-full ${col.bg} transition-all relative flex items-center justify-center hover:scale-110 active:scale-95 ${selectedColor === col.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105' : 'opacity-85'}`} title={col.name}>
                  {selectedColor === col.value && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                </button>
              ))}</div>
            </div>
            <Button type="submit" disabled={!name.trim()} className="w-full mt-3 h-8.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium"><Plus className="w-4 h-4" />创建标签</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
