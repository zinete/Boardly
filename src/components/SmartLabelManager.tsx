import React, { useState } from 'react';
import { useKanbanStore } from '../lib/store';
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

interface SmartLabelManagerProps {
  trigger?: React.ReactNode;
}

export function SmartLabelManager({ trigger }: SmartLabelManagerProps = {}) {
  const { smartLabels, labels, addSmartLabel, deleteSmartLabel } = useKanbanStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('sky');
  
  // Rule builder state
  const [rules, setRules] = useState<Rule[]>([]);
  const [field, setField] = useState<'priority' | 'status' | 'dueDate' | 'label'>('priority');
  const [operator, setOperator] = useState<string>('equals');
  const [value, setValue] = useState<string>('high');

  // Triggered when field changes to auto-select default operators & values
  const handleFieldChange = (newField: 'priority' | 'status' | 'dueDate' | 'label') => {
    setField(newField);
    if (newField === 'priority') {
      setOperator('equals');
      setValue('high');
    } else if (newField === 'status') {
      setOperator('equals');
      setValue('todo');
    } else if (newField === 'dueDate') {
      setOperator('equals');
      setValue('today');
    } else if (newField === 'label') {
      setOperator('contains');
      setValue(labels[0]?.id || '');
    }
  };

  const handleAddRule = () => {
    const newRule: Rule = {
      id: crypto.randomUUID(),
      field,
      operator: operator as any,
      value,
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleCreateSmartLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rules.length === 0) return;

    await addSmartLabel(name.trim(), color, rules);
    
    // reset form
    setName('');
    setColor('sky');
    setRules([]);
  };

  const getRuleDisplay = (rule: Rule) => {
    const fieldNames = {
      priority: '优先级',
      status: '任务状态',
      dueDate: '截止日期',
      label: '自定义标签',
    };

    const operatorNames = {
      equals: '等于',
      contains: '包含',
      isBefore: '早于',
      isAfter: '晚于',
      isEmpty: '为空',
      isNotEmpty: '不为空',
    };

    let valDisplay = rule.value;
    if (rule.field === 'priority') {
      const pMap: Record<string, string> = { high: '高', medium: '中', low: '低' };
      valDisplay = pMap[rule.value] || rule.value;
    } else if (rule.field === 'status') {
      const sMap: Record<string, string> = { todo: '待办', 'in-progress': '进行中', done: '已完成' };
      valDisplay = sMap[rule.value] || rule.value;
    } else if (rule.field === 'label') {
      const labelObj = labels.find((l) => l.id === rule.value);
      valDisplay = labelObj ? labelObj.name : '未知标签';
    } else if (rule.field === 'dueDate' && rule.value === 'today') {
      valDisplay = '今天';
    }

    return (
      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200/50 dark:border-slate-800">
        <strong className="text-primary">{fieldNames[rule.field]}</strong>{' '}
        <span className="text-slate-400">{operatorNames[rule.operator as keyof typeof operatorNames] || rule.operator}</span>{' '}
        <strong className="text-amber-600 dark:text-amber-400">"{valDisplay}"</strong>
      </span>
    );
  };

  const smartColorMap: Record<string, string> = {
    sky: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    teal: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    gray: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          trigger || (
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              智能标签管理
            </Button>
          )
        }
      />

      <DialogContent className="max-w-xl sm:max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            配置智能标签 (Smart Labels)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* List existing smart labels */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">现有智能标签</h4>
            <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/30 max-h-56 overflow-y-auto">
              {smartLabels.map((lbl) => (
                <div key={lbl.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:shadow-sm transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded border font-medium ${smartColorMap[lbl.color] || smartColorMap.sky}`}>
                        {lbl.name}
                      </Badge>
                      {lbl.isSystem && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">系统预设</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {lbl.rules.map((rule) => (
                        <div key={rule.id} className="scale-90 origin-left">
                          {getRuleDisplay(rule)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {!lbl.isSystem && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => deleteSmartLabel(lbl.id)}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors self-end sm:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create Smart Label Form */}
          <form onSubmit={handleCreateSmartLabel} className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1">
              新建智能标签
              <span className="text-[10px] font-normal text-slate-400 lowercase">(基于规则自动对任务进行分类过滤)</span>
            </h4>

            {/* Smart Label Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">标签名称</label>
                <Input
                  placeholder="例如: 今日紧急待办, 未指派高优先级"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8.5 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">色彩主题</label>
                <div className="flex gap-2 pt-1.5">
                  {COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setColor(col.value)}
                      className={`w-5.5 h-5.5 rounded-full ${col.bg} transition-all relative flex items-center justify-center hover:scale-110 ${
                        color === col.value
                          ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 scale-105'
                          : 'opacity-85'
                      }`}
                      title={col.name}
                    >
                      {color === col.value && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rules Builder UI */}
            <div className="space-y-2 border border-slate-150 dark:border-slate-800 p-3.5 rounded-lg bg-slate-50/30">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">条件规则生成器</span>
              
              <div className="flex flex-wrap gap-2 items-end">
                {/* Field Selection */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">检测属性</span>
                  <Select
                    value={field}
                    onValueChange={(val: any) => handleFieldChange(val)}
                  >
                    <SelectTrigger className="w-32 h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                      <SelectValue placeholder="检测字段" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                      <SelectItem value="priority">优先级</SelectItem>
                      <SelectItem value="status">任务状态</SelectItem>
                      <SelectItem value="dueDate">截止日期</SelectItem>
                      <SelectItem value="label">标签</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator Selection */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400">匹配关系</span>
                  <Select
                    value={operator}
                    onValueChange={(val) => setOperator(val)}
                  >
                    <SelectTrigger className="w-28 h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                      <SelectValue placeholder="匹配符号" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                      {field !== 'dueDate' && field !== 'label' && (
                        <>
                          <SelectItem value="equals">等于</SelectItem>
                          <SelectItem value="contains">包含其中</SelectItem>
                        </>
                      )}
                      {field === 'dueDate' && (
                        <>
                          <SelectItem value="equals">等于</SelectItem>
                          <SelectItem value="isBefore">早于</SelectItem>
                          <SelectItem value="isAfter">晚于</SelectItem>
                          <SelectItem value="isEmpty">无截止期</SelectItem>
                          <SelectItem value="isNotEmpty">有截止期</SelectItem>
                        </>
                      )}
                      {field === 'label' && (
                        <>
                          <SelectItem value="isEmpty">无标签</SelectItem>
                          <SelectItem value="isNotEmpty">有标签</SelectItem>
                          <SelectItem value="contains">包含标签</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value Input depending on Field */}
                {operator !== 'isEmpty' && operator !== 'isNotEmpty' && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">检测值</span>
                    {field === 'priority' && (
                      <Select value={value} onValueChange={(val) => setValue(val)}>
                        <SelectTrigger className="w-32 h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                          <SelectValue placeholder="选择优先级" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 text-xs border-slate-200 dark:border-slate-800">
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {field === 'status' && (
                      <Select value={value} onValueChange={(val) => setValue(val)}>
                        <SelectTrigger className="w-32 h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                          <SelectValue placeholder="选择状态" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 text-xs border-slate-200 dark:border-slate-800">
                          <SelectItem value="todo">待办 (todo)</SelectItem>
                          <SelectItem value="in-progress">进行中 (in-progress)</SelectItem>
                          <SelectItem value="done">已完成 (done)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {field === 'dueDate' && (
                      <Select value={value} onValueChange={(val) => setValue(val)}>
                        <SelectTrigger className="w-32 h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                          <SelectValue placeholder="截止日期选项" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 text-xs border-slate-200 dark:border-slate-800">
                          <SelectItem value="today">今天</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {field === 'label' && (
                      <Select value={value} onValueChange={(val) => setValue(val)}>
                        <SelectTrigger className="w-32 h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                          <SelectValue placeholder="选择标签" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 text-xs border-slate-200 dark:border-slate-800">
                          {labels.map((lbl) => (
                            <SelectItem key={lbl.id} value={lbl.id}>
                              {lbl.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleAddRule}
                  variant="outline"
                  size="sm"
                  className="h-8.5 text-xs rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-0.5" />
                  添加规则
                </Button>
              </div>

              {/* Active Rules List for current builder */}
              {rules.length > 0 && (
                <div className="mt-3.5 pt-2 border-t border-slate-200/55 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">已绑定的规则：</span>
                  <div className="flex flex-wrap gap-2.5">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-150 dark:border-slate-850">
                        {getRuleDisplay(rule)}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemoveRule(rule.id)}
                          className="text-slate-400 hover:text-rose-500 rounded-md"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!name.trim() || rules.length === 0}
              className="w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              创建智能标签
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
