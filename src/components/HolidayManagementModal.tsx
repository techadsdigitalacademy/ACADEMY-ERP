import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { X, Calendar, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { CompanyHoliday } from '../utils/holidayStorage';
import { addCompanyHoliday, deleteCompanyHoliday } from '../utils/holidayStorage';

interface HolidayManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: CompanyHoliday[];
  onHolidaysUpdated: (updated: CompanyHoliday[]) => void;
  adminName?: string;
}

export const HolidayManagementModal: React.FC<HolidayManagementModalProps> = ({
  isOpen,
  onClose,
  holidays,
  onHolidaysUpdated,
  adminName = 'Admin'
}) => {
  const [holidayDate, setHolidayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [holidayName, setHolidayName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const updated = await addCompanyHoliday(holidayDate, holidayName.trim(), adminName);
      onHolidaysUpdated(updated);
      setHolidayName('');
      setStatusMessage(`Successfully marked ${holidayDate} as "${holidayName.trim()}" for all staff!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to save holiday: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, dateStr: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the holiday "${name}" on ${dateStr}?`)) return;
    try {
      const updated = await deleteCompanyHoliday(id);
      onHolidaysUpdated(updated);
    } catch (err: any) {
      alert('Failed to delete holiday: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card variant="glass" className="w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col border-border shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-soft text-primary border border-primary/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground">Office Holiday Management</h3>
              <p className="text-xs text-muted-foreground">Mark company-wide holidays that reflect for all staff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {statusMessage && (
            <div className="p-3 rounded-lg bg-success-soft text-success border border-success/30 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Form to Add New Holiday */}
          <form onSubmit={handleAddHoliday} className="p-4 rounded-xl bg-card border border-border space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              Mark New Office Holiday
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  Holiday Date
                </label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                  Holiday Name / Reason
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Holiday, Public Holiday"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full py-2 text-xs font-extrabold cursor-pointer"
            >
              {isSubmitting ? 'Saving Holiday...' : 'Mark as Office Holiday'}
            </Button>
          </form>

          {/* List of Registered Holidays */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Registered Holidays ({holidays.length})
              </h4>
              <span className="text-[10px] text-muted-foreground font-semibold">
                Applies to all counselors & staff
              </span>
            </div>

            {holidays.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/40">
                <Calendar className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-xs font-bold text-muted-foreground">No custom holidays registered yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Use the form above to declare office holidays</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {holidays.map((h) => {
                  const dObj = new Date(h.holiday_date);
                  const dayName = !isNaN(dObj.getTime())
                    ? dObj.toLocaleDateString('en-US', { weekday: 'short' })
                    : '';

                  return (
                    <div
                      key={h.id || h.holiday_date}
                      className="p-3 rounded-lg bg-card border border-border flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="indigo" className="text-[10px] font-extrabold uppercase px-2 py-0.5">
                          {dayName || 'Day'}
                        </Badge>
                        <div>
                          <p className="text-xs font-extrabold text-foreground">{h.holiday_name}</p>
                          <p className="text-[10px] font-semibold text-muted-foreground">{h.holiday_date}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(h.id, h.holiday_date, h.holiday_name)}
                        className="p-1.5 rounded-lg text-danger hover:bg-danger-soft transition-colors cursor-pointer"
                        title="Delete Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted-2 flex justify-end">
          <Button variant="secondary" onClick={onClose} className="text-xs font-bold">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};

