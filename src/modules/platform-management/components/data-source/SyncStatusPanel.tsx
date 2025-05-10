import React from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { Sync, SyncProblem, CheckCircle } from '@mui/icons-material';
import { ConnectionStatus } from '../../models/types';

export interface SyncStatusPanelProps {
  status: ConnectionStatus;
  lastSyncTime?: Date;
  nextScheduledSync?: Date;
}

const SyncStatusPanel: React.FC<SyncStatusPanelProps> = ({
  status,
  lastSyncTime,
  nextScheduledSync,
}) => {
  const formatDateTime = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const getStatusIcon = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return <CheckCircle color="success" />;
      case ConnectionStatus.CONNECTING:
        return <CircularProgress size={20} />;
      case ConnectionStatus.ERROR:
        return <SyncProblem color="error" />;
      default:
        return <Sync color="disabled" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'Connected';
      case ConnectionStatus.CONNECTING:
        return 'Syncing...';
      case ConnectionStatus.ERROR:
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={1}>
        <Box mr={1}>{getStatusIcon()}</Box>
        <Chip 
          label={getStatusText()} 
          size="small" 
          color={
            status === ConnectionStatus.CONNECTED 
              ? 'success' 
              : status === ConnectionStatus.CONNECTING 
                ? 'warning' 
                : status === ConnectionStatus.ERROR 
                  ? 'error' 
                  : 'default'
          }
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        Last sync: {formatDateTime(lastSyncTime)}
      </Typography>
      
      {nextScheduledSync && (
        <Typography variant="body2" color="text.secondary">
          Next sync: {formatDateTime(nextScheduledSync)}
        </Typography>
      )}
    </Box>
  );
};

export default SyncStatusPanel; 