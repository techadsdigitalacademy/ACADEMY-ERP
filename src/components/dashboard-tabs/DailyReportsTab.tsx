import React from 'react';
import { Badge } from '../Badge';
import { Edit2 } from 'lucide-react';

interface DailyReportsTabProps {
  monthReports: any[];
}

export const DailyReportsTab: React.FC<DailyReportsTabProps> = ({ monthReports }) => {
  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-extrabold text-foreground flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-primary" />
          Graphic & Digital Marketing Work Registers
        </h2>
        <span className="text-xs bg-card text-muted-foreground px-2.5 py-1 rounded-lg border border-border font-bold">
          {monthReports.length} Logs
        </span>
      </div>

      {/* Daily Reports logs table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-muted-2">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Task Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-secondary-foreground font-semibold">
            {monthReports?.map((report: any) => (
              <tr key={report.id} className="hover:bg-muted-2">
                <td className="py-3 px-4 text-muted-foreground">{report.report_date}</td>
                <td className="py-3 px-4 text-foreground font-extrabold">{report.staff_name}</td>
                <td className="py-3 px-4 font-bold text-primary">
                  <Badge variant="info">{report.work_type}</Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground max-w-md" title={report.description}>{report.description}</td>
              </tr>
            ))}
            {monthReports.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground font-semibold">No daily reports logged for this month.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
