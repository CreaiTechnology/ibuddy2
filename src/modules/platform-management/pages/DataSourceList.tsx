import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const DataSourceList: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Data Sources
        </Typography>
        <Typography variant="body1">
          This is the data sources listing page.
        </Typography>
      </Box>
    </Container>
  );
};

export default DataSourceList; 