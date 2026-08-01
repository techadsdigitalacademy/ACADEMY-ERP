import React from 'react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Edit2 } from 'lucide-react';

interface DailyReportsTabProps {
  monthReports: any[];
}

export const DailyReportsTab: React.FC<DailyReportsTabProps> = ({ monthReports }) => {
  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-indigo-400" />
          Graphic & Digital Marketing Work Registers
        </h2>
        <span className="text-xs bg-slate-805 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
          {monthReports.length} Logs
        </span>
      </div>

      {/* Daily Reports logs table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Task Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
            {monthReports?.map((report: any) => (
              <tr key={report.id} className="hover:bg-slate-900/10">
                <td className="py-3 px-4 text-slate-500">{report.report_date}</td>
                <td className="py-3 px-4 text-white font-extrabold">{report.staff_name}</td>
                <td className="py-3 px-4 font-bold text-indigo-400">
                  <Badge variant="info">{report.work_type}</Badge>
                </td>
                <td className="py-3 px-4 text-slate-400 max-w-md" title={report.description}>{report.description}</td>
              </tr>
            ))}
            {monthReports.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-600 font-semibold">No daily reports logged for this month.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
