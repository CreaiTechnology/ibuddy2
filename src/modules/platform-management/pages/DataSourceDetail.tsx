import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';

const DataSourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Data Source Details
        </Typography>
        <Typography variant="body1">
          Viewing details for data source ID: {id}
        </Typography>
      </Box>
    </Container>
  );
};

export default DataSourceDetail; 