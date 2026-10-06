import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Disaster, Donation } from '../../types';
import { TransactionDonatePage } from './TransactionDonatePage';
import { TransactionCheckoutPage } from './TransactionCheckoutPage';
import { TransactionStatusPage } from './TransactionStatusPage';

interface TransactionUniversalDispatcherProps {
  disasters: Disaster[];
  donations: Donation[];
  onDataChanged: () => Promise<void>;
}

export const TransactionUniversalDispatcher: React.FC<TransactionUniversalDispatcherProps> = ({
  disasters,
  donations,
  onDataChanged,
}) => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/dashboard" replace />;
  }

  // 1. If it's a donation ID (starts with "don-" or matches existing donation)
  const isDonationId = id.startsWith('don-') || donations.some((d) => d.id === id);
  if (isDonationId) {
    const matchedDonation = donations.find((d) => d.id === id);
    if (matchedDonation && ['paid', 'completed', 'cancelled', 'failed'].includes(matchedDonation.status)) {
      return <TransactionStatusPage />;
    }
    return <TransactionCheckoutPage onDataChanged={onDataChanged} />;
  }

  // 2. Otherwise treat it as a disaster ID for donation creation
  return <TransactionDonatePage disasters={disasters} onDataChanged={onDataChanged} />;
};
