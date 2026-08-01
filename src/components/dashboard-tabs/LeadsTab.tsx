import React from 'react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Star, Upload, MessageSquare } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LeadsTabProps {
  activeStaff: any;
  isAdminMode: boolean;
  leadsList: any[];
  salesStaff: any[];
  newLeadName: string;
  setNewLeadName: (val: string) => void;
  newLeadLocation: string;
  setNewLeadLocation: (val: string) => void;
  newLeadPhone: string;
  setNewLeadPhone: (val: string) => void;
  newLeadPackage: string;
  setNewLeadPackage: (val: string) => void;
  isSubmittingLead: boolean;
  handleAddLead: (e: React.FormEvent) => Promise<void>;
  handleCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fetchLeads: () => Promise<void>;
}

export const LeadsTab: React.FC<LeadsTabProps> = ({
  activeStaff,
  isAdminMode,
  leadsList,
  salesStaff,
  newLeadName,
  setNewLeadName,
  newLeadLocation,
  setNewLeadLocation,
  newLeadPhone,
  setNewLeadPhone,
  newLeadPackage,
  setNewLeadPackage,
  isSubmittingLead,
  handleAddLead,
  handleCsvUpload,
  fetchLeads
}) => {
  return (
    <section className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-indigo-400" />
          Lead Management Hub
        </h2>
        <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold font-mono">
          {leadsList.length} Leads
        </span>
      </div>

      {activeStaff?.designation === 'Digital Marketer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Add & Upload Leads Form */}
          <Card variant="glass" className="lg:col-span-1 p-5 border-white/5 space-y-5 h-fit">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add New Lead</h3>
              <p className="text-[11px] text-slate-400 mt-1">Manually enter lead information.</p>
            </div>

            <form onSubmit={handleAddLead} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lead Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  placeholder="Delhi, India"
                  value={newLeadLocation}
                  onChange={(e) => setNewLeadLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp / Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="919876543210"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Service / Package interested in</label>
                <input
                  type="text"
                  placeholder="Web Design & SEO"
                  value={newLeadPackage}
                  onChange={(e) => setNewLeadPackage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs py-2 rounded-xl font-bold uppercase tracking-wider mt-2"
                disabled={isSubmittingLead}
              >
                {isSubmittingLead ? 'Adding...' : 'Add Lead'}
              </Button>
            </form>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Bulk Upload Leads via CSV</h4>
              <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-4 bg-slate-950/40 hover:bg-slate-900/20 cursor-pointer transition-all">
                <Upload className="w-5 h-5 text-indigo-400 mb-1.5" />
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Choose CSV File</span>
                <span className="text-[8px] text-slate-500 mt-1">Format: Name, Location, Phone, Package</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
              </label>
            </div>
          </Card>

          {/* Right: Lead Distribution Table */}
          <div className="lg:col-span-2 space-y-4">
            <Card variant="glass" className="p-4 border-white/5">
              <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-3">Distributed Leads</h3>
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Lead Name</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Service Interest</th>
                      <th className="py-2.5 px-3">Assigned To</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                    {leadsList?.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-900/10">
                        <td className="py-2.5 px-3 text-white font-bold">{lead.lead_name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{lead.location || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-400">{lead.whatsapp_number}</td>
                        <td className="py-2.5 px-3 text-indigo-400">{lead.project_name || '-'}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={lead.assigned_to || ''}
                            onChange={async (e) => {
                              const val = e.target.value || null;
                              try {
                                const { error } = await supabase
                                  .from('leads')
                                  .update({ assigned_to: val })
                                  .eq('id', lead.id);
                                if (error) throw error;
                                alert('Lead assigned successfully!');
                                fetchLeads();
                              } catch (err: any) {
                                alert('Failed to assign lead: ' + err.message);
                              }
                            }}
                            className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Unassigned</option>
                            {salesStaff?.map(s => (
                              <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={
                            lead.status === 'Closed' ? 'success' :
                            lead.status === 'Positive' ? 'success' :
                            lead.status === 'Follow-up' ? 'warning' :
                            lead.status === 'No Response' ? 'error' : 'info'
                          }>
                            {lead.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {leadsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-600 font-semibold">No leads distributed yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeStaff?.designation === 'Sales Executive' && (
        <Card variant="glass" className="p-5 border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Assigned Leads</h3>
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Lead Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Service Interest</th>
                  <th className="py-3 px-4">Status Dropdown</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                {leadsList?.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-900/10">
                    <td className="py-3 px-4 text-white font-bold">{lead.lead_name}</td>
                    <td className="py-3 px-4 text-slate-400">{lead.location || '-'}</td>
                    <td className="py-3 px-4 text-indigo-400">{lead.project_name || '-'}</td>
                    <td className="py-3 px-4">
                      <select
                        value={lead.status || 'New'}
                        onChange={async (e) => {
                          const val = e.target.value;
                          try {
                            const { error } = await supabase
                              .from('leads')
                              .update({ status: val })
                              .eq('id', lead.id);
                            if (error) throw error;
                            alert('Lead status updated successfully!');
                            fetchLeads();
                          } catch (err: any) {
                            alert('Failed to update status: ' + err.message);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="New">New</option>
                        <option value="Positive">Positive</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Closed">Closed</option>
                        <option value="No Response">No Response</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <a
                        href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white transition-all shadow-md shadow-emerald-950/20"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
                {leadsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-600 font-semibold">No leads currently assigned to you.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
};
