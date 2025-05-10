import React from 'react';
import { useFeatureGuard } from '../hooks/useFeatureGuard';
import BookingConfig from '../components/config/BookingConfig';

export default function OnsiteBookingSettingsPage() {
  useFeatureGuard('free');
  document.title = 'On-site Booking Settings';
  return (
    <div style={{ padding: '2rem' }}>
      <BookingConfig agentType="onsite" />
    </div>
  );
} 