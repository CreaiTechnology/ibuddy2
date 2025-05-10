import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Stack,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  SettingsOutlined,
  DeleteOutline,
  SyncOutlined,
  MoreVert,
} from '@mui/icons-material';
import { DataSource, ConnectionStatus } from '../../models/types';
import { SyncStatusPanel } from './';

interface DataSourceCardProps {
  dataSource: DataSource;
  onSync?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const DataSourceCard: React.FC<DataSourceCardProps> = ({
  dataSource,
  onSync,
  onDelete,
}) => {
  const { id, name, platform, status, lastSync } = dataSource;

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'success';
      case ConnectionStatus.CONNECTING:
        return 'warning';
      case ConnectionStatus.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="h2">
            {name}
          </Typography>
          <Chip 
            label={platform} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
        </Box>
        
        <SyncStatusPanel 
          status={status} 
          lastSyncTime={lastSync} 
        />
      </CardContent>
      
      <CardActions>
        <Stack direction="row" spacing={1} width="100%" justifyContent="space-between">
          <Button 
            component={Link} 
            to={`/platform-management/data-sources/${id}`} 
            size="small" 
            color="primary"
          >
            View Details
          </Button>
          
          <Box>
            {onSync && (
              <Tooltip title="Sync Now">
                <IconButton 
                  size="small" 
                  onClick={() => onSync(id)}
                  disabled={status === ConnectionStatus.CONNECTING}
                >
                  <SyncOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {onDelete && (
              <Tooltip title="Delete">
                <IconButton 
                  size="small" 
                  onClick={() => onDelete(id)}
                  color="error"
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Stack>
      </CardActions>
    </Card>
  );
};

export default DataSourceCard; 