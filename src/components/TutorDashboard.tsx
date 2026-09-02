import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { supabase } from '../services/supabase';
import { Users, CalendarDays, BookOpen, Clock } from 'lucide-react';
import { TutorNoticeBoard } from './TutorNoticeBoard';

interface TutorDashboardProps {
  activeStaff: any;
}

export const TutorDashboard: React.FC<TutorDashboardProps> = ({ activeStaff }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeStaff?.id) {
      fetchTutorData();
    }
  }, [activeStaff?.id]);

  const fetchTutorData = async () => {
    setIsLoading(true);
    try {
      const { data: bData } = await supabase
        .from('academy_batches')
        .select('*')
        .eq('tutor_id', activeStaff.id);
        
      if (bData) {
        setBatches(bData);
        
        const batchIds = bData.map(b => b.id);
        if (batchIds.length > 0) {
          const { data: sData } = await supabase
            .from('academy_students')
            .select('*')
            .in('batch_id', batchIds)
            .eq('status', 'Active');
            
          if (sData) {
            setStudents(sData);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching tutor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeBatches = batches?.filter(b => b.status === 'Ongoing') || [];
  const upcomingBatches = batches?.filter(b => b.status === 'Upcoming') || [];
  
  const getStudentCount = (batchId: string) => {
    return students?.filter(s => s.batch_id === batchId).length || 0;
  };

  if (isLoading) {
    return (
      <div className="mt-8 space-y-10 animate-pulse">
        <div className="h-40 bg-muted rounded-lg w-full"></div>
        <div className="h-40 bg-muted rounded-lg w-full"></div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Left Column: Batches */}
      <div className="xl:col-span-2 space-y-10">
        
        {/* Active Batches */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-success" />
            <h3 className="text-lg font-bold text-foreground">Active Batches</h3>
          </div>
          
          {activeBatches.length === 0 ? (
            <Card variant="glass" className="p-6 border-border bg-muted-2">
              <p className="text-muted-foreground text-sm text-center italic">No active batches assigned.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBatches?.map(batch => (
                <Card key={batch.id} variant="glass" className="p-5 border-l-4 border-l-emerald-500 border-border hover:bg-muted transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-success-soft rounded-bl-full -mr-4 -mt-4"></div>
                  <h4 className="font-bold text-foreground text-lg mb-1">{batch.batch_name}</h4>
                  <p className="text-xs font-mono text-success mb-4">{batch.batch_code}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted-2 rounded-lg p-3 flex flex-col justify-center items-center">
                      <Users className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground uppercase font-bold text-[9px] tracking-wider mb-1">Students</span>
                      <span className="text-lg font-black text-foreground">{getStudentCount(batch.id)}</span>
                    </div>
                    <div className="bg-muted-2 rounded-lg p-3 flex flex-col justify-center items-center">
                      <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground uppercase font-bold text-[9px] tracking-wider mb-1">Type</span>
                      <span className="text-sm font-bold text-success mt-1">{batch.batch_type}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Batches */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-warning" />
            <h3 className="text-lg font-bold text-foreground">Upcoming Batches</h3>
          </div>
          
          {upcomingBatches.length === 0 ? (
            <Card variant="glass" className="p-6 border-border bg-muted-2">
              <p className="text-muted-foreground text-sm text-center italic">No upcoming batches assigned.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingBatches?.map(batch => (
                <Card key={batch.id} variant="glass" className="p-5 border-l-4 border-l-amber-500 border-border hover:bg-muted transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-warning-soft rounded-bl-full -mr-4 -mt-4"></div>
                  <h4 className="font-bold text-foreground text-lg mb-1">{batch.batch_name}</h4>
                  <p className="text-xs font-mono text-warning mb-4">{batch.batch_code}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted-2 rounded-lg p-3 flex flex-col justify-center items-center">
                      <Users className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground uppercase font-bold text-[9px] tracking-wider mb-1">Enrolled</span>
                      <span className="text-lg font-black text-foreground">{getStudentCount(batch.id)}</span>
                    </div>
                    <div className="bg-muted-2 rounded-lg p-3 flex flex-col justify-center items-center">
                      <Clock className="w-4 h-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground uppercase font-bold text-[9px] tracking-wider mb-1">Type</span>
                      <span className="text-sm font-bold text-warning mt-1">{batch.batch_type}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Notice Board */}
      <div className="xl:col-span-1">
        <TutorNoticeBoard />
      </div>
    </div>
  );
};
