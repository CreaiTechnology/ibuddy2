import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Card, Spinner, Alert, Row, Col } from 'react-bootstrap';
import api from '../../api/axiosInstance'; // Assuming axios instance is configured
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function BrandProfileSettings() {
  const [profile, setProfile] = useState({
    profile_name: 'Default Profile',
    brand_keywords: [],
    target_audience: '',
    brand_tone: [],
    brand_mission: '',
    negative_keywords: [],
    communication_style: '',
    industry: '',
    preferred_length: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Wrap fetchProfile in useCallback
  const fetchProfile = useCallback(async () => { 
      setIsLoading(true);
      setError(null);
      try {
        console.log('Fetching brand profile...');
        // Add a cache-busting query parameter
        const cacheBuster = `_=${Date.now()}`; 
        const response = await api.get(`/api/brand-profile?${cacheBuster}`); // Append to URL
        console.log('Brand profile response:', response.data);
        if (response.data && response.data.profile) {
          // Initialize form state with fetched data, handling potential nulls
          setProfile({
            profile_name: response.data.profile.profile_name || 'Default Profile',
            brand_keywords: response.data.profile.brand_keywords || [],
            target_audience: response.data.profile.target_audience || '',
            brand_tone: response.data.profile.brand_tone || [],
            brand_mission: response.data.profile.brand_mission || '',
            negative_keywords: response.data.profile.negative_keywords || [],
            communication_style: response.data.profile.communication_style || '',
            industry: response.data.profile.industry || '',
            preferred_length: response.data.profile.preferred_length || ''
          });
        } else {
           console.log('No existing brand profile found, using defaults.');
           // Keep default initial state if no profile exists
           // Ensure defaults are set if profile becomes null after being set
           setProfile({ 
              profile_name: 'Default Profile', brand_keywords: [], target_audience: '', 
              brand_tone: [], brand_mission: '', negative_keywords: [], 
              communication_style: '', industry: '', preferred_length: '' 
           });
        }
      } catch (err) {
        console.error('Error fetching brand profile:', err);
        setError('Failed to load brand profile. Please try again later.');
        toast.error('Failed to load brand profile.');
        // Also reset profile to defaults on error
         setProfile({ 
            profile_name: 'Default Profile', brand_keywords: [], target_audience: '', 
            brand_tone: [], brand_mission: '', negative_keywords: [], 
            communication_style: '', industry: '', preferred_length: '' 
         });
      } finally {
        setIsLoading(false);
      }
  }, []); // Keep dependencies empty as it doesn't rely on props or state outside its scope

  // Fetch existing profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // Add fetchProfile as dependency

  // Handle input changes for simple fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes for array fields (using comma-separated strings in textarea)
  const handleArrayChange = (e) => {
    const { name, value } = e.target;
    // Split by comma, trim whitespace, remove empty strings
    const keywordsArray = value.split(',').map(k => k.trim()).filter(k => k !== '');
    setProfile(prev => ({ ...prev, [name]: keywordsArray }));
  };

  // Handle save
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      // Ensure data sent to API uses the correct field names expected by the backend
      const apiData = {
          profile_name: profile.profile_name, // Use profile_name instead of brand_name
          brand_keywords: profile.brand_keywords,
          target_audience: profile.target_audience,
          brand_tone: profile.brand_tone,
          brand_mission: profile.brand_mission,
          negative_keywords: profile.negative_keywords,
          communication_style: profile.communication_style,
          industry: profile.industry,
          preferred_length: profile.preferred_length,
          // Do not send user_id or updated_at from client, backend handles this
      };
      
      console.log('Saving brand profile with data:', apiData); // Log the data being sent
      
      // Send the correctly mapped apiData
      const response = await api.put('/api/brand-profile', apiData); 
      console.log('Save response:', response.data);
      toast.success(response.data.message || 'Brand profile saved successfully!');
      
      // Re-fetch profile data after successful save instead of relying on PUT response
      await fetchProfile(); 

    } catch (err) {
      console.error('Error saving brand profile:', err);
      const message = err.response?.data?.message || 'Failed to save brand profile.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Profile...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <Card.Header as="h5">Brand Voice & Profile Settings</Card.Header>
      <Card.Body>
        {error && !isSaving && <Alert variant="danger">{error}</Alert>} 
        <Form onSubmit={handleSave}>
          <Row>
            <Col md={6}>
              {/* Profile Name - Consider if editable - UNCOMMENTING THIS */}
              <Form.Group className="mb-3" controlId="profileName">
                <Form.Label>Profile Name</Form.Label>
                <Form.Control 
                  type="text" 
                  name="profile_name" 
                  value={profile.profile_name || ''} // Use empty string if null/undefined
                  onChange={handleChange} 
                  disabled={isSaving} // Added disabled state
                  placeholder="Enter a name for this profile (e.g., Main Brand)" // Added placeholder
                />
              </Form.Group> 
              
              <Form.Group className="mb-3" controlId="brandKeywords">
                <Form.Label>Brand Keywords</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="brand_keywords"
                  placeholder="Enter keywords separated by commas (e.g., sustainable, innovative, eco-friendly)"
                  value={profile.brand_keywords?.join(', ') || ''} // Join array for display
                  onChange={handleArrayChange}
                  disabled={isSaving}
                />
                <Form.Text>Keywords describing your brand, products, or services.</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="targetAudience">
                <Form.Label>Target Audience</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="target_audience"
                  placeholder="Describe your ideal customer (e.g., young professionals, parents, tech enthusiasts)"
                  value={profile.target_audience || ''}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </Form.Group>
              
               <Form.Group className="mb-3" controlId="brandTone">
                <Form.Label>Brand Tone</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="brand_tone"
                  placeholder="Enter desired tones separated by commas (e.g., professional, friendly, witty, formal)"
                  value={profile.brand_tone?.join(', ') || ''} // Join array for display
                  onChange={handleArrayChange}
                  disabled={isSaving}
                />
                 <Form.Text>How your brand should sound.</Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3" controlId="brandMission">
                <Form.Label>Brand Mission/Values</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="brand_mission"
                  placeholder="Describe your brand's core purpose or values"
                  value={profile.brand_mission || ''}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </Form.Group>
              
              <Form.Group className="mb-3" controlId="negativeKeywords">
                <Form.Label>Words to Avoid</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="negative_keywords"
                  placeholder="Enter words or phrases to avoid, separated by commas"
                  value={profile.negative_keywords?.join(', ') || ''} // Join array for display
                  onChange={handleArrayChange}
                  disabled={isSaving}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="communicationStyle">
                <Form.Label>Communication Style</Form.Label>
                <Form.Control 
                    type="text" 
                    name="communication_style" 
                    placeholder="e.g., direct, storytelling, educational, humorous"
                    value={profile.communication_style || ''}
                    onChange={handleChange} 
                    disabled={isSaving}
                />
              </Form.Group>
              
               <Form.Group className="mb-3" controlId="industry">
                <Form.Label>Industry</Form.Label>
                <Form.Control 
                    type="text" 
                    name="industry" 
                    placeholder="e.g., E-commerce, SaaS, Healthcare, Education"
                    value={profile.industry || ''}
                    onChange={handleChange} 
                    disabled={isSaving}
                />
              </Form.Group>
              
               {/* Preferred Length - Maybe a dropdown later */}
               {/* <Form.Group className="mb-3" controlId="preferredLength">
                <Form.Label>Preferred Content Length</Form.Label>
                <Form.Select name="preferred_length" value={profile.preferred_length || ''} onChange={handleChange} disabled={isSaving}>
                    <option value="">Any</option>
                    <option value="short">Short (e.g., Tweet, SMS)</option>
                    <option value="medium">Medium (e.g., Social post, short email)</option>
                    <option value="long">Long (e.g., Blog post, detailed email)</option>
                </Form.Select>
              </Form.Group> */} 
              
            </Col>
          </Row>

          <Button 
            variant="success" 
            type="submit" 
            disabled={isSaving}
            className="mt-3"
          >
            {isSaving ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-2">Saving...</span>
              </>
            ) : (
              'Save Brand Profile'
            )}
          </Button>
            {/* Show non-blocking saving error here */}
            {error && isSaving && <Alert variant="danger" className="mt-3">{error}</Alert>} 

        </Form>
      </Card.Body>
      <ToastContainer position="bottom-right" />
    </Card>
  );
}

export default BrandProfileSettings; 