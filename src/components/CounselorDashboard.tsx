import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { supabase } from '../services/supabase';
import { Users, BookOpen, GraduationCap } from 'lucide-react';

interface CounselorDashboardProps {
  activeStaff: any;
}

export const CounselorDashboard: React.FC<CounselorDashboardProps> = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCounselorData();
  }, []);

  const fetchCounselorData = async () => {
    setIsLoading(true);
    try {
      const { data: bData } = await supabase
        .from('academy_batches')
        .select('*');
        
      if (bData) {
        setBatches(bData);
        
        const { data: sData } = await supabase
          .from('academy_students')
          .select('*')
          .eq('status', 'Active');
          
        if (sData) {
          setStudents(sData);
        }
      }
    } catch (err) {
      console.error('Error fetching counselor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingBatches = batches?.filter(b => b.status === 'Upcoming');
  const activeBatches = batches?.filter(b => b.status === 'Ongoing');
  
  const getStudentCount = (batchId: string) => {
    return students?.filter(s => s.batch_id === batchId).length;
  };

  if (isLoading) {
    return (
      <div className="mt-8 space-y-10 animate-pulse">
        <div className="h-40 bg-muted rounded-lg w-full"></div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      
      {/* Upcoming Batches - Top Priority for Counselor */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Upcoming Batches (Admissions)</h3>
        </div>
        
        {upcomingBatches.length === 0 ? (
          <Card variant="glass" className="p-6 border-border bg-muted-2">
            <p className="text-muted-foreground text-sm text-center italic">No upcoming batches at the moment.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingBatches?.map(batch => {
              const enrolled = getStudentCount(batch.id);
              const target = 20; // Default target
              const progress = Math.min(100, Math.round((enrolled / target) * 100));
              
              return (
                <Card key={batch.id} variant="glass" className="p-5 border-border hover:bg-muted transition-all relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h4 className="font-bold text-foreground text-lg mb-1">{batch.batch_name}</h4>
                      <p className="text-xs font-mono text-primary">{batch.batch_code} • {batch.batch_type || 'Offline'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Enrolled Students</span>
                      <span className="font-bold text-foreground">{enrolled} / {target}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-success' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Batches */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-success" />
          <h3 className="text-lg font-bold text-foreground">Active Batches (Overview)</h3>
        </div>
        
        {activeBatches.length === 0 ? (
          <Card variant="glass" className="p-6 border-border bg-muted-2">
            <p className="text-muted-foreground text-sm text-center italic">No active batches at the moment.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeBatches?.map(batch => (
              <Card key={batch.id} variant="glass" className="p-4 border-l-4 border-l-emerald-500 border-border hover:bg-muted transition-all">
                <h4 className="font-bold text-foreground mb-1 truncate">{batch.batch_name}</h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-success">{batch.batch_code}</span>
                  <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {getStudentCount(batch.id)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
