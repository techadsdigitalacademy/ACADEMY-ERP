import React, { useState } from 'react';
import { Card } from './Card';
import { Folder, ChevronLeft, CreditCard, History } from 'lucide-react';
import { Button } from './Button';

interface BatchFinancesViewProps {
  batches: any[];
  students: any[];
  installments: any[];
  onCollectPayment: (student: any) => void;
  onViewPaymentHistory: (student: any) => void;
}

export const BatchFinancesView: React.FC<BatchFinancesViewProps> = ({ 
  batches, 
  students, 
  installments,
  onCollectPayment,
  onViewPaymentHistory
}) => {
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  const getBatchStats = (batchId: string) => {
    const batchStudents = students?.filter(s => s.batch_id === batchId);
    let totalFees = 0;
    let totalPaid = 0;
    
    batchStudents.forEach(s => {
      totalFees += Number(s.total_fees);
      const paid = installments?.filter(i => i.student_id === s.id).reduce((sum, i) => sum + Number(i.amount_paid), 0);
      totalPaid += paid;
    });

    return {
      studentCount: batchStudents.length,
      totalFees,
      totalPaid,
      totalPending: totalFees - totalPaid
    };
  };

  if (selectedBatch) {
    const stats = getBatchStats(selectedBatch.id);
    const batchStudents = students?.filter(s => s.batch_id === selectedBatch.id);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedBatch(null)}
            className="p-2 bg-muted hover:bg-muted rounded-lg text-secondary-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              {selectedBatch.batch_name} - Fee Collection
            </h3>
            <p className="text-sm text-muted-foreground font-mono mt-1">{selectedBatch.batch_code} • {selectedBatch.batch_type || 'Offline'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="glass" className="p-4 border-border">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Total Expected</p>
            <p className="text-2xl font-black text-foreground">₹{stats.totalFees.toLocaleString()}</p>
          </Card>
          <Card variant="glass" className="p-4 border-border">
            <p className="text-xs text-success uppercase font-bold mb-1">Total Collected</p>
            <p className="text-2xl font-black text-success">₹{stats.totalPaid.toLocaleString()}</p>
          </Card>
          <Card variant="glass" className="p-4 border-border">
            <p className="text-xs text-warning uppercase font-bold mb-1">Total Pending</p>
            <p className="text-2xl font-black text-warning">₹{stats.totalPending.toLocaleString()}</p>
          </Card>
        </div>

        <Card variant="glass" className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted-2">
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Sl No</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Reg No</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Name</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Course Fee</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Paid</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase">Balance</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batchStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground italic">No students registered in this batch yet.</td>
                  </tr>
                ) : batchStudents?.map((s, idx) => {
                  const paid = installments?.filter(i => i.student_id === s.id).reduce((sum, i) => sum + Number(i.amount_paid), 0);
                  const balance = Number(s.total_fees) - paid;
                  
                  return (
                    <tr key={s.id} className="hover:bg-muted transition-colors">
                      <td className="p-4 text-sm text-secondary-foreground">{idx + 1}</td>
                      <td className="p-4 text-sm font-mono text-primary">{s.registration_number || '-'}</td>
                      <td className="p-4 text-sm font-bold text-foreground">
                        <button onClick={() => onViewPaymentHistory(s)} className="hover:text-primary transition-colors text-left underline decoration-white/20 underline-offset-4">
                          {s.student_name}
                        </button>
                      </td>
                      <td className="p-4 text-sm text-secondary-foreground">₹{Number(s.total_fees).toLocaleString()}</td>
                      <td className="p-4 text-sm text-success">₹{paid.toLocaleString()}</td>
                      <td className="p-4 text-sm text-warning font-bold">₹{balance.toLocaleString()}</td>
                      <td className="p-4 flex gap-2 justify-end">
                        <Button 
                          variant={balance > 0 ? 'primary' : 'glass'} 
                          size="sm" 
                          onClick={() => balance > 0 ? onCollectPayment(s) : onViewPaymentHistory(s)} 
                          className="text-xs !py-1.5"
                        >
                          {balance > 0 ? (
                            <><CreditCard className="w-3.5 h-3.5 mr-1.5" /> Collect</>
                          ) : (
                            <><History className="w-3.5 h-3.5 mr-1.5" /> History</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // Folder View
  const upcomingBatches = batches?.filter(b => b.status === 'Upcoming');
  const onlineBatches = batches?.filter(b => b.batch_type === 'Online' && b.status === 'Ongoing');
  const offlineBatches = batches?.filter(b => b.batch_type === 'Offline' && b.status === 'Ongoing');

  const renderFolderGrid = (title: string, batchList: any[], colorClass: string) => (
    <div className="space-y-4">
      <h4 className={`font-bold text-lg ${colorClass}`}>{title}</h4>
      {batchList.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No batches available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {batchList.map(batch => {
            const stats = getBatchStats(batch.id);
            return (
              <Card 
                key={batch.id} 
                variant="glass" 
                className="p-5 border-border hover:bg-muted hover:border-border transition-all cursor-pointer group"
                onClick={() => setSelectedBatch(batch)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Folder className={`w-8 h-8 ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-card/80 px-2 py-1 rounded text-xs font-bold text-secondary-foreground">
                      {stats.studentCount} Students
                    </span>
                  </div>
                </div>
                <h5 className="font-bold text-foreground text-base mb-1 truncate">{batch.batch_name}</h5>
                <p className="text-xs font-mono text-muted-foreground mb-2">{batch.batch_code}</p>
                
                {stats.totalPending > 0 ? (
                  <div className="bg-warning-soft text-warning text-xs font-bold px-2 py-1.5 rounded inline-block">
                    ₹{stats.totalPending.toLocaleString()} Pending
                  </div>
                ) : (
                  <div className="bg-success-soft text-success text-xs font-bold px-2 py-1.5 rounded inline-block">
                    Fully Paid
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in">
      <div>
        <h3 className="text-xl font-black text-foreground">Balance Fee Collection</h3>
        <p className="text-muted-foreground text-sm mt-1">Select a batch folder to view student balances and log payments.</p>
      </div>

      <div className="space-y-10">
        {renderFolderGrid('Active Offline Batches', offlineBatches, 'text-primary')}
        {renderFolderGrid('Active Online Batches', onlineBatches, 'text-success')}
        {renderFolderGrid('Upcoming Batches', upcomingBatches, 'text-warning')}
      </div>
    </div>
  );
};
