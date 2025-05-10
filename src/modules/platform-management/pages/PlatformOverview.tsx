import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const PlatformOverview: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Platform Overview
        </Typography>
        <Typography variant="body1">
          This is the platform management overview page.
        </Typography>
      </Box>
    </Container>
  );
};

export default PlatformOverview; 