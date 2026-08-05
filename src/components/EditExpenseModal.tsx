import React, { useState } from 'react';
import { X, Edit2 } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../services/supabase';

interface EditExpenseModalProps {
  expense: any;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  onClose,
  onSaveSuccess
}) => {
  const [category, setCategory] = useState(expense?.category || 'Marketing & Ads');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : '');
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date || new Date().toISOString().substring(0, 10));
  const [isSaving, setIsSaving] = useState(false);

  const CATEGORIES = [
    'Marketing & Ads',
    'Office & Operations',
    'Software & Cloud',
    'Client Hospitality',
    'Equipment & Hardware',
    'Salary',
    'Rent',
    'Internet & Recharge',
    'Food & Drinks',
    'EMI',
    'Repair & Maintenance',
    'Stationery',
    'Electricity',
    'Transport',
    'Other Expense'
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !expenseDate) return;
    setIsSaving(true);
    try {
      const updatedData = {
        category,
        description: description.trim(),
        amount: Number(amount),
        expense_date: expenseDate
      };

      // 1. Update Supabase
      if (expense.id && !expense.id.startsWith('seed-exp-')) {
        const { error } = await supabase
          .from('expenses')
          .update(updatedData)
          .eq('id', expense.id);

        if (error) console.warn('Supabase expense update info:', error.message);
      }

      // 2. Update LocalStorage
      try {
        const stored = localStorage.getItem('company_expenses_local_store');
        if (stored) {
          const list = JSON.parse(stored);
          const updatedList = list.map((item: any) => {
            if (item.id === expense.id) {
              return { ...item, ...updatedData };
            }
            return item;
          });
          localStorage.setItem('company_expenses_local_store', JSON.stringify(updatedList));
        }
      } catch (lErr) {
        console.warn('LocalStorage expense update info:', lErr);
      }

      // 3. Dispatch change event
      window.dispatchEvent(new CustomEvent('company_expenses_changed'));
      alert('Expense updated successfully!');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      alert('Failed to update expense: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <Card variant="glass" className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight">Edit Expense Entry</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Update transaction details</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-semibold"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              required
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Expense Date *
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Description / Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Enter expense details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="text-xs py-2 px-5 font-bold uppercase tracking-wider"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
