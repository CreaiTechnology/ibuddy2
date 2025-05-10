import React from 'react';
import { useFeatureGuard } from '../hooks/useFeatureGuard';
import BookingConfig from '../components/config/BookingConfig';

export default function WalkinBookingSettingsPage() {
  useFeatureGuard('free');
  document.title = 'Walk-in Booking Settings';
  return (
    <div style={{ padding: '2rem' }}>
      <BookingConfig agentType="walkin" />
    </div>
  );
} 