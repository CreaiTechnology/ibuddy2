import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Divider,
} from '@mui/material';
import { PlatformType, DataSourceType } from '../../models/types';

interface PlatformSelectorProps {
  onSelect: (platform: PlatformType, type: DataSourceType) => void;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ onSelect }) => {
  const [selectedType, setSelectedType] = useState<DataSourceType | null>(null);

  const handleTypeSelection = (type: DataSourceType) => {
    setSelectedType(type);
  };

  const renderDataSourceTypes = () => {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 300px' }}>
          <Card
            onClick={() => handleTypeSelection(DataSourceType.SOCIAL_MEDIA)}
            sx={{
              width: '100%',
              cursor: 'pointer',
              bgcolor: selectedType === DataSourceType.SOCIAL_MEDIA ? 'action.selected' : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3,
              },
            }}
          >
            <CardActionArea>
              <CardContent>
                <Typography variant="h6">Social Media</Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect to social media platforms and fetch posts, comments, and analytics.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 300px' }}>
          <Card
            onClick={() => handleTypeSelection(DataSourceType.LOCAL_FILE)}
            sx={{
              width: '100%',
              cursor: 'pointer',
              bgcolor: selectedType === DataSourceType.LOCAL_FILE ? 'action.selected' : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3,
              },
            }}
          >
            <CardActionArea>
              <CardContent>
                <Typography variant="h6">Local File</Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload and process local files like CSV, JSON, or Excel spreadsheets.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      </Box>
    );
  };

  const renderPlatformOptions = () => {
    if (!selectedType) return null;

    // Just create static options for the example
    const platforms = selectedType === DataSourceType.SOCIAL_MEDIA
      ? [
          { type: PlatformType.TWITTER, name: 'Twitter', color: '#1DA1F2', description: 'Connect to Twitter to sync tweets, mentions, and analytics.' },
          { type: PlatformType.FACEBOOK, name: 'Facebook', color: '#1877F2', description: 'Connect to Facebook to sync posts, comments, and pages.' },
        ]
      : [
          { type: PlatformType.LOCAL_CSV, name: 'CSV File', color: '#217346', description: 'Upload and process CSV files.' },
          { type: PlatformType.LOCAL_JSON, name: 'JSON File', color: '#F5DE19', description: 'Upload and process JSON files.' },
        ];

    return (
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Select Platform
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {platforms.map((platform) => (
            <Box sx={{ flex: '1 1 250px' }} key={platform.type}>
              <Card
                onClick={() => onSelect(platform.type, selectedType)}
                sx={{
                  width: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardActionArea>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Avatar 
                        sx={{ 
                          bgcolor: platform.color || 'primary.main',
                          width: 40,
                          height: 40,
                          mr: 1
                        }}
                      >
                        {platform.name.charAt(0)}
                      </Avatar>
                      <Typography variant="h6">{platform.name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {platform.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Data Source Type
      </Typography>
      {renderDataSourceTypes()}
      
      {selectedType && (
        <>
          <Divider sx={{ my: 3 }} />
          {renderPlatformOptions()}
        </>
      )}
    </Box>
  );
};

export default PlatformSelector; 