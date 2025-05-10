import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  Divider,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PlatformSelector } from '../components/data-source';
import { PlatformType, DataSourceType } from '../models/types';

const steps = ['Select Platform', 'Configure', 'Review'];

const DataSourceWizard: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [selectedType, setSelectedType] = useState<DataSourceType | null>(null);

  const handlePlatformSelect = (platform: PlatformType, type: DataSourceType) => {
    setSelectedPlatform(platform);
    setSelectedType(type);
    handleNext();
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleCancel = () => {
    navigate('/platform-management/data-sources');
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <PlatformSelector onSelect={handlePlatformSelect} />;
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure {selectedPlatform} Integration
            </Typography>
            <Typography variant="body1">
              Configuration form will go here for {selectedType} type.
            </Typography>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Details
            </Typography>
            <Typography variant="body1">
              Review form will go here with summary of configuration.
            </Typography>
          </Box>
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Button 
            startIcon={<ArrowBack />}
            onClick={handleCancel}
            sx={{ mr: 2 }}
          >
            Back to List
          </Button>
          <Typography variant="h5" component="h1">
            Add New Data Source
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 4, mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Divider sx={{ mt: 4, mb: 2 }} />

        <Box display="flex" justifyContent="space-between">
          <Button
            variant="outlined"
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          <Box>
            <Button 
              variant="outlined"
              onClick={handleCancel}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button 
                variant="contained"
                color="primary"
                onClick={handleNext}
                disabled={activeStep === 0 && (!selectedPlatform || !selectedType)}
              >
                Next
              </Button>
            ) : (
              <Button 
                variant="contained"
                color="primary"
                onClick={() => {
                  // Handle form submission here
                  alert('Data source would be created here');
                  navigate('/platform-management/data-sources');
                }}
              >
                Create
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default DataSourceWizard; 