import React from 'react';
import { ClosingReportModal } from './ClosingReportModal';
import { LogSaleModal } from './LogSaleModal';
import { PunchModal } from './PunchModal';
import { SettingsModal } from './SettingsModal';
import { SelfieLightboxModal } from './SelfieLightboxModal';

interface SalesDashboardModalsProps {
  // Closing Report Modal
  isClosingReportOpen: boolean;
  onCloseClosingReport: () => void;

  // Log Sale Modal
  isModalOpen: boolean;
  onCloseLogSaleModal: () => void;
  isOwner: boolean;
  activeStaff: any;
  addSale: (saleData: any) => Promise<void>;
  onExpenseLogged: () => void;

  // Punch Modal
  isPunchModalOpen: boolean;
  onClosePunchModal: () => void;
  punchType: 'IN' | 'OUT';
  punchIn: (staffId: string, location?: string, photoUrl?: string) => Promise<void>;
  punchOut: (staffId: string, location?: string, photoUrl?: string) => Promise<void>;

  // Settings Modal
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  isAdminMode: boolean;
  staffProfiles: any[];
  selectedResetStaff: string;
  setSelectedResetStaff: (val: string) => void;
  newResetPassword: string;
  setNewResetPassword: (val: string) => void;
  isResettingPassword: boolean;
  handleResetPassword: (e: React.FormEvent) => void;

  // Lightbox Selfie Modal
  enlargedSelfie: string | null;
  onCloseSelfieLightbox: () => void;
}

export const SalesDashboardModals: React.FC<SalesDashboardModalsProps> = ({
  isClosingReportOpen,
  onCloseClosingReport,
  isModalOpen,
  onCloseLogSaleModal,
  isOwner,
  activeStaff,
  addSale,
  onExpenseLogged,
  isPunchModalOpen,
  onClosePunchModal,
  punchType,
  punchIn,
  punchOut,
  isSettingsOpen,
  onCloseSettings,
  isAdminMode,
  staffProfiles,
  selectedResetStaff,
  setSelectedResetStaff,
  newResetPassword,
  setNewResetPassword,
  isResettingPassword,
  handleResetPassword,
  enlargedSelfie,
  onCloseSelfieLightbox
}) => {
  return (
    <>
      <ClosingReportModal
        isOpen={isClosingReportOpen}
        onClose={onCloseClosingReport}
      />

      <LogSaleModal
        isOpen={isModalOpen}
        onClose={onCloseLogSaleModal}
        isOwner={isOwner}
        activeStaff={activeStaff}
        addSale={addSale}
        onExpenseLogged={onExpenseLogged}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        isAdminMode={isAdminMode}
        staffProfiles={staffProfiles}
        selectedResetStaff={selectedResetStaff}
        setSelectedResetStaff={setSelectedResetStaff}
        newResetPassword={newResetPassword}
        setNewResetPassword={setNewResetPassword}
        isResettingPassword={isResettingPassword}
        handleResetPassword={handleResetPassword}
      />

      <PunchModal
        isOpen={isPunchModalOpen}
        onClose={onClosePunchModal}
        punchType={punchType}
        activeStaff={activeStaff}
        punchIn={punchIn}
        punchOut={punchOut}
      />

      <SelfieLightboxModal
        enlargedSelfie={enlargedSelfie}
        onClose={onCloseSelfieLightbox}
      />
    </>
  );
};
