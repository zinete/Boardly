import React, { useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { Rule, SmartLabel } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, SlidersHorizontal, Info, HelpCircle } from 'lucide-react';

const COLORS = [
  { name: '蓝色', value: 'sky', bg: 'bg-sky-500' },
  { name: '玫瑰色', value: 'rose', bg: 'bg-rose-500' },
  { name: '橘色', value: 'orange', bg: 'bg-orange-500' },
  { name: '紫色', value: 'violet', bg: 'bg-violet-500' },
  { name: '蓝绿', value: 'teal', bg: 'bg-teal-500' },
  { name: '灰色', value: 'gray', bg: 'bg-slate-500' },
];
interface SmartLabelManagerProps { trigger?: React.ReactNode; }
export function SmartLabelManager({ trigger }: SmartLabelManagerProps = {}) {
  const { smartLabels, labels, addSmartLabel, deleteSmartLabel } = useKanbanStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('sky');
  const [rules, setRules] = useState<Rule[]>([]);
  const [field, setField] = useState<'priority'|'status'|'dueDate'|'label'>('priority');
  const [operator, setOperator] = useState<string>('equals');
  const [value, setValue] = useState<string>('high');
  const handleFieldChange = (f: typeof field) => { setField(f); if(f==='priority'){setOperator('equals');setValue('high');}else if(f==='status'){setOperator('equals');setValue('todo');}else if(f==='dueDate'){setOperator('equals');setValue('today');}else if(f==='label'){setOperator('contains');setValue(labels[0]?.id||'');} };
  const handleAddRule = () => { setRules([...rules, { id: crypto.randomUUID(), field, operator: operator as any, value }]); };
  const handleRemoveRule = (id: string) => { setRules(rules.filter(r => r.id !== id)); };
  const handleCreateSmartLabel = async (e: React.FormEvent) => { e.preventDefault(); if(!name.trim()||!rules.length) return; await addSmartLabel(name.trim(), color, rules); setName(''); setColor('sky'); setRules([]); };
  const getRuleDisplay = (rule: Rule) => {
    const fn = {priority:'优先级',status:'任务状态',dueDate:'截止日期',label:'自定义标签'};
    const on = {equals:'等于',contains:'包含',isBefore:'早于',isAfter:'晚于',isEmpty:'为空',isNotEmpty:'不为空'};
    let vd = rule.value;
    if(rule.field==='priority') vd = ({high:'高',medium:'中',low:'低'} as any)[rule.value]||rule.value;
    else if(rule.field==='status') vd = ({todo:'待办','in-progress':'进行中',done:'已完成'} as any)[rule.value]||rule.value;
    else if(rule.field==='label'){const lo=labels.find(l=>l.id===rule.value);vd=lo?lo.name:'未知标签';}
    else if(rule.field==='dueDate'&&rule.value==='today') vd='今天';
    return (<span className="text-xs font-mono bg-muted text-foreground px-2 py-1 rounded-md border border-border/50"><strong className="text-primary">{fn[rule.field]}</strong>{' '}<span className="text-muted-foreground">{on[rule.operator as keyof typeof on]||rule.operator}</span>{' '}<strong className="text-amber-600">"{vd}"</strong></span>);
  };
  const smartColorMap: Record<string, string> = { sky:'bg-sky-500/10 text-sky-600 border-sky-500/20', rose:'bg-rose-500/10 text-rose-600 border-rose-500/20', orange:'bg-orange-500/10 text-orange-600 border-orange-500/20', violet:'bg-violet-500/10 text-violet-600 border-violet-500/20', teal:'bg-teal-500/10 text-teal-600 border-teal-500/20', gray:'bg-slate-500/10 text-slate-600 border-slate-500/20' };
  const selTrigCls = "h-8.5 text-xs bg-card border-border rounded-lg";
  const selContCls = "bg-card border-border rounded-lg text-xs";
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={trigger || (<Button variant="outline" size="sm" className="gap-1 text-xs"><SlidersHorizontal className="w-3.5 h-3.5" />智能标签管理</Button>)} />
      <DialogContent className="max-w-xl sm:max-w-xl bg-card border-border rounded-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader><DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-primary" />配置智能标签 (Smart Labels)</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">现有智能标签</h4>
            <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/50 max-h-56 overflow-y-auto">
              {smartLabels.map(lbl => (
                <div key={lbl.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border hover:shadow-sm transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded border font-medium ${smartColorMap[lbl.color]||smartColorMap.sky}`}>{lbl.name}</Badge>
                      {lbl.isSystem && <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded">系统预设</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">{lbl.rules.map(rule => <div key={rule.id} className="scale-90 origin-left">{getRuleDisplay(rule)}</div>)}</div>
                  </div>
                  {!lbl.isSystem && <Button size="icon-xs" variant="ghost" onClick={() => deleteSmartLabel(lbl.id)} className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors self-end sm:self-center"><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={handleCreateSmartLabel} className="space-y-4 pt-3 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1">新建智能标签<span className="text-[10px] font-normal text-muted-foreground lowercase">(基于规则自动分类过滤)</span></h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">标签名称</label><Input placeholder="例如: 今日紧急待办" value={name} onChange={e=>setName(e.target.value)} className="h-8.5 text-sm bg-card border-border rounded-lg" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">色彩主题</label>
                <div className="flex gap-2 pt-1.5">{COLORS.map(col => (<button key={col.value} type="button" onClick={() => setColor(col.value)} className={`w-5.5 h-5.5 rounded-full ${col.bg} transition-all relative flex items-center justify-center hover:scale-110 ${color===col.value?'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105':'opacity-85'}`} title={col.name}>{color===col.value && <span className="w-1.5 h-1.5 bg-white rounded-full" />}</button>))}</div>
              </div>
            </div>
            <div className="space-y-2 border border-border p-3.5 rounded-lg bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground block mb-1">条件规则生成器</span>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1"><span className="text-[10px] text-muted-foreground">检测属性</span>
                  <Select value={field} onValueChange={(v:any)=>handleFieldChange(v)}><SelectTrigger className={`w-32 ${selTrigCls}`}><SelectValue placeholder="检测字段" /></SelectTrigger><SelectContent className={selContCls}><SelectItem value="priority">优先级</SelectItem><SelectItem value="status">任务状态</SelectItem><SelectItem value="dueDate">截止日期</SelectItem><SelectItem value="label">标签</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1"><span className="text-[10px] text-muted-foreground">匹配关系</span>
                  <Select value={operator} onValueChange={v=>setOperator(v)}><SelectTrigger className={`w-28 ${selTrigCls}`}><SelectValue placeholder="匹配符号" /></SelectTrigger><SelectContent className={selContCls}>
                    {field!=='dueDate'&&field!=='label'&&<><SelectItem value="equals">等于</SelectItem><SelectItem value="contains">包含其中</SelectItem></>}
                    {field==='dueDate'&&<><SelectItem value="equals">等于</SelectItem><SelectItem value="isBefore">早于</SelectItem><SelectItem value="isAfter">晚于</SelectItem><SelectItem value="isEmpty">无截止期</SelectItem><SelectItem value="isNotEmpty">有截止期</SelectItem></>}
                    {field==='label'&&<><SelectItem value="isEmpty">无标签</SelectItem><SelectItem value="isNotEmpty">有标签</SelectItem><SelectItem value="contains">包含标签</SelectItem></>}
                  </SelectContent></Select>
                </div>
                {operator!=='isEmpty'&&operator!=='isNotEmpty'&&(
                  <div className="space-y-1"><span className="text-[10px] text-muted-foreground">检测值</span>
                    {field==='priority'&&<Select value={value} onValueChange={v=>setValue(v)}><SelectTrigger className={`w-32 ${selTrigCls}`}><SelectValue placeholder="选择优先级" /></SelectTrigger><SelectContent className={`${selContCls}`}><SelectItem value="high">高</SelectItem><SelectItem value="medium">中</SelectItem><SelectItem value="low">低</SelectItem></SelectContent></Select>}
                    {field==='status'&&<Select value={value} onValueChange={v=>setValue(v)}><SelectTrigger className={`w-32 ${selTrigCls}`}><SelectValue placeholder="选择状态" /></SelectTrigger><SelectContent className={selContCls}><SelectItem value="todo">待办</SelectItem><SelectItem value="in-progress">进行中</SelectItem><SelectItem value="done">已完成</SelectItem></SelectContent></Select>}
                    {field==='dueDate'&&<Select value={value} onValueChange={v=>setValue(v)}><SelectTrigger className={`w-32 ${selTrigCls}`}><SelectValue placeholder="截止日期" /></SelectTrigger><SelectContent className={selContCls}><SelectItem value="today">今天</SelectItem></SelectContent></Select>}
                    {field==='label'&&<Select value={value} onValueChange={v=>setValue(v)}><SelectTrigger className={`w-32 ${selTrigCls}`}><SelectValue placeholder="选择标签" /></SelectTrigger><SelectContent className={selContCls}>{labels.map(l=><SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select>}
                  </div>
                )}
                <Button type="button" onClick={handleAddRule} variant="outline" size="sm" className="h-8.5 text-xs rounded-lg"><Plus className="w-4 h-4 mr-0.5" />添加规则</Button>
              </div>
              {rules.length > 0 && (
                <div className="mt-3.5 pt-2 border-t border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-2">已绑定的规则：</span>
                  <div className="flex flex-wrap gap-2.5">{rules.map(rule => (<div key={rule.id} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md border border-border">{getRuleDisplay(rule)}<Button type="button" variant="ghost" size="icon-xs" onClick={() => handleRemoveRule(rule.id)} className="text-muted-foreground hover:text-rose-500 rounded-md"><Trash2 className="w-3 h-3" /></Button></div>))}</div>
                </div>
              )}
            </div>
            <Button type="submit" disabled={!name.trim()||!rules.length} className="w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold"><Plus className="w-4 h-4" />创建智能标签</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
