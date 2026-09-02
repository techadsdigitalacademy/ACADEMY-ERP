import React from 'react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Star, Upload, MessageSquare } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LeadsTabProps {
  activeStaff: any;
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
        <h2 className="text-base md:text-lg font-extrabold text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Lead Management Hub
        </h2>
        <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-lg border border-border font-bold font-mono">
          {leadsList.length} Leads
        </span>
      </div>

      {activeStaff?.designation === 'Digital Marketer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Add & Upload Leads Form */}
          <Card variant="glass" className="lg:col-span-1 p-5 border-border space-y-5 h-fit">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Add New Lead</h3>
              <p className="text-[11px] text-muted-foreground mt-1">Manually enter lead information.</p>
            </div>

            <form onSubmit={handleAddLead} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Lead Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  placeholder="Delhi, India"
                  value={newLeadLocation}
                  onChange={(e) => setNewLeadLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">WhatsApp / Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="919876543210"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Service / Package interested in</label>
                <input
                  type="text"
                  placeholder="Web Design & SEO"
                  value={newLeadPackage}
                  onChange={(e) => setNewLeadPackage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs py-2 rounded-md font-bold uppercase tracking-wider mt-2"
                disabled={isSubmittingLead}
              >
                {isSubmittingLead ? 'Adding...' : 'Add Lead'}
              </Button>
            </form>

            <div className="border-t border-border pt-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Bulk Upload Leads via CSV</h4>
              <label className="flex flex-col items-center justify-center border border-dashed border-border rounded-md p-4 bg-muted-2 hover:bg-muted-2 cursor-pointer transition-all">
                <Upload className="w-5 h-5 text-primary mb-1.5" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Choose CSV File</span>
                <span className="text-[8px] text-muted-foreground mt-1">Format: Name, Location, Phone, Package</span>
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
            <Card variant="glass" className="p-4 border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Distributed Leads</h3>
              <div className="overflow-x-auto rounded-md border border-border bg-muted-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-2.5 px-3">Lead Name</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Service Interest</th>
                      <th className="py-2.5 px-3">Assigned To</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-secondary-foreground font-semibold">
                    {leadsList?.map(lead => (
                      <tr key={lead.id} className="hover:bg-muted-2">
                        <td className="py-2.5 px-3 text-foreground font-bold">{lead.lead_name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{lead.location || '-'}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{lead.whatsapp_number}</td>
                        <td className="py-2.5 px-3 text-primary">{lead.project_name || '-'}</td>
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
                            className="px-2 py-1 rounded-md bg-card border border-border text-[10px] text-foreground focus:outline-none focus:border-primary"
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
                        <td colSpan={6} className="text-center py-8 text-muted-foreground font-semibold">No leads distributed yet.</td>
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
        <Card variant="glass" className="p-5 border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">My Assigned Leads</h3>
          <div className="overflow-x-auto rounded-md border border-border bg-muted-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Lead Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Service Interest</th>
                  <th className="py-3 px-4">Status Dropdown</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-secondary-foreground font-semibold">
                {leadsList?.map(lead => (
                  <tr key={lead.id} className="hover:bg-muted-2">
                    <td className="py-3 px-4 text-foreground font-bold">{lead.lead_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{lead.location || '-'}</td>
                    <td className="py-3 px-4 text-primary">{lead.project_name || '-'}</td>
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
                        className="px-2.5 py-1 rounded-md bg-card border border-border text-[10px] text-foreground focus:outline-none focus:border-primary"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success hover:bg-success text-[10px] font-bold text-white transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
                {leadsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground font-semibold">No leads currently assigned to you.</td>
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
