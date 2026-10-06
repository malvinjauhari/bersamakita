import React from 'react';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';
import { PublicReportsView } from './PublicReportsView';
import { DistributionReport, PartnerAllocation } from '../../types';

interface TransparansiReportsPageProps {
  reports: DistributionReport[];
  allocations?: PartnerAllocation[];
}

export const TransparansiReportsPage: React.FC<TransparansiReportsPageProps> = ({
  reports,
  allocations = [],
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#B2D850] selection:text-[#1B3322]">
      <WideNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <PublicReportsView reports={reports} allocations={allocations} />
      </main>

      <WideFooter />
    </div>
  );
};
