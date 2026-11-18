import React, { useState } from 'react';
import { Card } from '../../Card';
import { Button } from '../../Button';
import { Target, Users, GraduationCap, X, Check, Save } from 'lucide-react';
import type { AcademyPerformanceTargets } from '../../../services/academyMetricsService';
import { saveAcademyPerformanceTargets } from '../../../services/academyMetricsService';

interface TargetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTargets: AcademyPerformanceTargets;
  counselorList: any[];
  tutorList: any[];
  onTargetsSaved: (updated: AcademyPerformanceTargets) => void;
}

export const TargetConfigModal: React.FC<TargetConfigModalProps> = ({
  isOpen,
  onClose,
  currentTargets,
  counselorList,
  tutorList,
  onTargetsSaved
}) => {
  const [globalCounselorTarget, setGlobalCounselorTarget] = useState<number>(
    currentTargets.counselor_admissions_target || 10
  );
  const [globalTutorTarget, setGlobalTutorTarget] = useState<number>(
    currentTargets.tutor_attendance_target || 90
  );

  const [customCounselorTargets, setCustomCounselorTargets] = useState<Record<string, number>>(
    { ...(currentTargets.custom_counselor_targets || {}) }
  );

  const [customTutorTargets, setCustomTutorTargets] = useState<Record<string, number>>(
    { ...(currentTargets.custom_tutor_targets || {}) }
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: AcademyPerformanceTargets = {
      counselor_admissions_target: Number(globalCounselorTarget) || 10,
      tutor_attendance_target: Number(globalTutorTarget) || 90,
      custom_counselor_targets: customCounselorTargets,
      custom_tutor_targets: customTutorTargets
    };

    saveAcademyPerformanceTargets(updated);
    onTargetsSaved(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <Card variant="glass" className="w-full max-w-2xl p-6 border-border shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-soft text-primary border border-primary/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Configure Academy Monthly Benchmarks</h3>
              <p className="text-xs text-muted-foreground">Set global and per-staff monthly targets for Counselors & Tutors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Global Defaults */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary-soft/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Default Counselor Target
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">Admissions / mo</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={globalCounselorTarget}
                  onChange={e => setGlobalCounselorTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm font-bold bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">students</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Applies to all counselors unless customized below.</p>
            </div>

            <div className="p-4 rounded-xl border-emerald-500/20 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  Default Tutor Benchmark
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">Class Attendance %</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={globalTutorTarget}
                  onChange={e => setGlobalTutorTarget(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 text-sm font-bold bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">% min</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Target minimum attendance rate for batch sessions.</p>
            </div>
          </div>

          {/* Individual Counselor Overrides */}
          {counselorList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Custom Counselor Monthly Targets
                </h4>
                <span className="text-[10px] text-muted-foreground font-mono">({counselorList.length} Counselors)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {counselorList.map(c => {
                  const currentVal = customCounselorTargets[c.id] !== undefined
                    ? customCounselorTargets[c.id]
                    : globalCounselorTarget;

                  return (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-3"
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {c.full_name || c.username}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Counselor</span>
                      </div>
                      <div className="flex items-center gap-1.5 w-24">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={currentVal}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            setCustomCounselorTargets(prev => ({
                              ...prev,
                              [c.id]: val
                            }));
                          }}
                          className="w-16 px-2 py-1 text-xs font-bold bg-background border border-border rounded text-center text-foreground focus:outline-none focus:border-primary"
                        />
                        <span className="text-[10px] text-muted-foreground font-mono">goals</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual Tutor Overrides */}
          {tutorList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  Custom Tutor Attendance Targets
                </h4>
                <span className="text-[10px] text-muted-foreground font-mono">({tutorList.length} Faculty / Tutors)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tutorList.map(t => {
                  const currentVal = customTutorTargets[t.id] !== undefined
                    ? customTutorTargets[t.id]
                    : globalTutorTarget;

                  return (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl border border-border bg-card/60 flex items-center justify-between gap-3"
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {t.full_name || t.username}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Tutor</span>
                      </div>
                      <div className="flex items-center gap-1.5 w-24">
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={currentVal}
                          onChange={e => {
                            const val = Math.min(100, Math.max(1, parseInt(e.target.value) || 0));
                            setCustomTutorTargets(prev => ({
                              ...prev,
                              [t.id]: val
                            }));
                          }}
                          className="w-16 px-2 py-1 text-xs font-bold bg-background border border-border rounded text-center text-foreground focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-muted-foreground font-mono">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={onClose}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={savedSuccess}
            className="text-xs flex items-center gap-2 bg-primary text-primary-foreground font-bold shadow-md"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Targets</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
