import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useFeatureGuard } from '../hooks/useFeatureGuard';

function BrandSettingsPage() {
  useFeatureGuard('free');
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    brandName: '',
    brandDescription: '',
    targetAudience: '',
    toneAndVoice: '', // e.g., "Friendly, Professional, Humorous"
    keywords: '', // Comma-separated keywords
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profileExists, setProfileExists] = useState(false);

  // Fetch existing profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      // Default to false, only set true on success with data
      setProfileExists(false); 
      try {
        console.log('Fetching brand profile...');
        const response = await api.get('/api/brand-profile');
        // *** DEBUG LOG ***
        console.log('[DEBUG] GET /api/brand-profile response:', response);

        if (response.data && response.data.profile) {
          console.log('Brand profile found:', response.data.profile);
          setProfile({
             brandName: response.data.profile.profile_name || '',
             brandDescription: response.data.profile.brand_description || '',
             targetAudience: response.data.profile.target_audience || '',
             // Fetch backend's brand_tone (array) and join to string for toneAndVoice state
             toneAndVoice: (response.data.profile.brand_tone || []).join(', '), 
             // Fetch backend's brand_keywords (array) and join to string for keywords state
             keywords: (response.data.profile.brand_keywords || []).join(', '), 
          });
          // Only set true if profile is successfully loaded
          setProfileExists(true); 
          // *** DEBUG LOG ***
          console.log('[DEBUG] Profile found, setting profileExists = true');
        } else {
           // Profile is null or undefined, treat as non-existent
           console.log('No existing brand profile data returned (profile is null/undefined).');
           // setProfileExists is already false by default
           // *** DEBUG LOG ***
           console.log('[DEBUG] Profile not found or null, profileExists remains false');
        }
      } catch (err) {
         // Any error during fetch means we treat profile as non-existent for the form
         console.error('Error fetching brand profile:', err);
         // setProfileExists is already false by default
         
         // Handle specific UI feedback for errors
         if (err.response && err.response.status === 404) {
             console.log('No existing brand profile found (API returned 404).');
             // Don't set a general error message for 404, it's expected if no profile exists
         } else {
             const message = err.response?.data?.message || 'Failed to load brand profile details.';
             setError(message); // Set error for display
             toast.error(message);
         }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Prepare data for API, mapping state names to backend expected names
    const apiData = {
      // Backend expects snake_case, map from camelCase state
      profile_name: profile.brandName, // Changed from brand_name for consistency
      brand_description: profile.brandDescription,
      target_audience: profile.targetAudience,
      // Map toneAndVoice state to brand_tone backend field
      brand_tone: profile.toneAndVoice ? profile.toneAndVoice.split(',').map(t => t.trim()).filter(t => t !== '') : [], // Assuming backend wants array for tone
      // Map keywords state to brand_keywords backend field
      brand_keywords: profile.keywords ? profile.keywords.split(',').map(k => k.trim()).filter(k => k !== '') : [],
      
      // Add other fields expected by backend, if they exist in the state (currently they don't)
      // If these were added to state and form, they would look like this:
      // brand_mission: profile.brandMission,
      // negative_keywords: profile.negativeKeywords ? profile.negativeKeywords.split(',').map(k => k.trim()).filter(k => k !== '') : [],
      // communication_style: profile.communicationStyle,
      // industry: profile.industry,
      // preferred_length: profile.preferredLength
    };

    // Remove keys with undefined values before sending? Or let backend handle nulls.
    // Example: Object.keys(apiData).forEach(key => apiData[key] === undefined && delete apiData[key]);

    try {
      console.log('Saving brand profile with mapped data:', apiData); // Log the final data being sent
      let response;
      // *** DEBUG LOG ***
      console.log('[DEBUG] handleSubmit: profileExists state is:', profileExists);
      if (profileExists) {
        console.log('Updating existing profile (PUT)');
        response = await api.put('/api/brand-profile', apiData);
      } else {
        console.log('Creating new profile (POST)');
        response = await api.post('/api/brand-profile', apiData);
      }
      console.log('Save response:', response.data);
      toast.success(response.data.message || 'Brand profile saved successfully!');
      setProfileExists(true); // Assume it now exists after successful save
      // Optionally refetch data or update state more precisely if needed
    } catch (err) {
      console.error('Error saving brand profile:', err);
      const message = err.response?.data?.message || 'Failed to save brand profile.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header as="h5">Brand Profile Settings</Card.Header>
        <Card.Body>
          <Card.Text>
            Define your brand's identity here. This information helps the AI generate content that aligns with your style and goals.
          </Card.Text>
          {isLoading ? (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : error && !isSaving ? (
            // Show loading error only if not currently trying to save (save error shown below)
            <Alert variant="danger">Error loading profile: {error}</Alert>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="brandName">
                <Form.Label>Brand Name</Form.Label>
                <Form.Control
                  type="text"
                  name="brandName"
                  placeholder="Your Company or Product Name"
                  value={profile.brandName}
                  onChange={handleChange}
                  disabled={isSaving}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="brandDescription">
                <Form.Label>Brand Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="brandDescription"
                  placeholder="What does your brand do? What makes it unique?"
                  value={profile.brandDescription}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="targetAudience">
                <Form.Label>Target Audience</Form.Label>
                <Form.Control
                  type="text"
                  name="targetAudience"
                  placeholder="e.g., Small business owners, Developers, Young professionals"
                  value={profile.targetAudience}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="toneAndVoice">
                <Form.Label>Tone and Voice</Form.Label>
                <Form.Control
                  type="text"
                  name="toneAndVoice"
                  placeholder="e.g., Friendly, Professional, Witty, Authoritative, Casual"
                  value={profile.toneAndVoice}
                  onChange={handleChange}
                  disabled={isSaving}
                />
                 <Form.Text className="text-muted">
                    Describe the desired personality of your brand's communication.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="keywords">
                <Form.Label>Keywords</Form.Label>
                <Form.Control
                  type="text"
                  name="keywords"
                  placeholder="e.g., AI, content marketing, social media, productivity"
                  value={profile.keywords}
                  onChange={handleChange}
                  disabled={isSaving}
                />
                <Form.Text className="text-muted">
                  Comma-separated keywords relevant to your brand or topics.
                </Form.Text>
              </Form.Group>

              {/* Show saving error here */} 
              {error && isSaving && <Alert variant="danger">{error}</Alert>}
              
              {/* Group buttons together */}
              <div className="d-flex gap-2 mt-3"> 
                <Button variant="primary" type="submit" disabled={isSaving || isLoading}>
                  {isSaving ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Saving...</span>
                    </>
                  ) : (profileExists ? 'Update Profile' : 'Save Profile')}
                </Button>
                
                {/* Add Back button */}
                <Button variant="outline-secondary" onClick={() => navigate(-1)} disabled={isSaving || isLoading}>
                    Back
                </Button>

              </div>
            </Form>
          )}
        </Card.Body>

      </Card>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick />
    </Container>
  );
}

export default BrandSettingsPage; 