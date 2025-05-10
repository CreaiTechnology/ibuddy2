import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ContentGenerator from '../components/content/ContentGenerator';
import api from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useFeatureGuard } from '../hooks/useFeatureGuard';

function ContentAgentPage() {
  useFeatureGuard('proA');
  const [suggestedIdeas, setSuggestedIdeas] = useState([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [ideasError, setIdeasError] = useState(null);
  const [selectedIdeaPrompt, setSelectedIdeaPrompt] = useState(''); // Prompt to pass to generator

  const fetchIdeas = async () => {
    setIsLoadingIdeas(true);
    setIdeasError(null);
    setSelectedIdeaPrompt(''); // Clear selected idea when fetching new ones
    try {
      console.log('Fetching content ideas...');
      // Use POST as defined in the backend routes
      const response = await api.post('/api/content/suggest-ideas', {}); 
      console.log('Content ideas response:', response.data);
      // Ensure ideas is always an array, even if API returns single string or null
      const ideasArray = Array.isArray(response.data.suggestions) 
        ? response.data.suggestions 
        : typeof response.data.suggestions === 'string' && response.data.suggestions.trim() !== ''
        ? [response.data.suggestions] // Wrap single string in array
        : []; // Default to empty array
        
      setSuggestedIdeas(ideasArray);

      if (ideasArray.length === 0) {
          toast.info('No content ideas were suggested. Try defining your Brand Profile!');
      }
    } catch (err) {
      console.error('Error fetching content ideas:', err);
      const message = err.response?.data?.message || 'Failed to fetch content ideas.';
      setIdeasError(message);
      toast.error(message);
      setSuggestedIdeas([]); // Clear ideas on error
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  // Fetch ideas on component mount
  useEffect(() => {
    fetchIdeas();
  }, []);

  const handleSelectIdea = (idea) => {
    // Extract the core topic if it's an object, otherwise use the string
    const ideaText = typeof idea === 'object' && idea !== null ? idea.topic : idea;
    const promptText = `Generate content about: ${ideaText}`;
    setSelectedIdeaPrompt(promptText);
    // Optionally scroll to the generator
    // document.getElementById('content-generator-card')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Container fluid className="mt-4">
        {/* Optional: Add a general page title if AgentConfigPage no longer provides one */}
       <h2 className="mb-4">Content Creation Agent</h2> 
      <Row>
        <Col md={12} lg={4} className="mb-4 mb-lg-0">
          <Card>
            <Card.Header as="h5">Content Idea Suggestions</Card.Header>
            <Card.Body>
              <Button 
                variant="outline-primary" 
                onClick={fetchIdeas} 
                disabled={isLoadingIdeas}
                className="mb-3 w-100"
              >
                {isLoadingIdeas ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" />
                    <span className="ms-2">Fetching Ideas...</span>
                  </>
                ) : (
                  'Get New Suggestions'
                )}
              </Button>
              
              {/* Link to Brand Settings */} 
              <div className="d-grid gap-2 mb-3">
                 <Link to="/brand-settings" className="btn btn-outline-secondary btn-sm"> 
                    Configure Brand Profile
                 </Link>
              </div>

              {ideasError && <Alert variant="danger">{ideasError}</Alert>}
              { !isLoadingIdeas && !ideasError && suggestedIdeas.length === 0 && (
                 <Alert variant="light">Click "Get New Suggestions" or configure your <Link to="/brand-settings">Brand Profile</Link> for tailored ideas.</Alert>
              )}
              {suggestedIdeas.length > 0 && (
                <ListGroup variant="flush">
                  {suggestedIdeas.map((idea, index) => {
                    // Handle both string ideas and potential object ideas { topic: '...', description: '...' }
                    const ideaTopic = typeof idea === 'object' && idea !== null ? idea.topic : idea;
                    const ideaDescription = typeof idea === 'object' && idea !== null ? idea.description : 'Click to generate content based on this topic.';
                    
                    // Ensure we have a valid topic string before rendering
                    if (typeof ideaTopic !== 'string' || ideaTopic.trim() === '') {
                        console.warn('Skipping invalid idea item:', idea);
                        return null; 
                    }

                    return (
                      <ListGroup.Item 
                        key={index} 
                        action 
                        onClick={() => handleSelectIdea(idea)} 
                        className="d-flex justify-content-between align-items-start"
                      >
                        <div className="ms-2 me-auto">
                          <div className="fw-bold">{ideaTopic}</div>
                          {ideaDescription}
                        </div>
                        {/* <Badge bg="primary" pill>New</Badge> */}
                      </ListGroup.Item>
                    );
                 })}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={12} lg={8}>
          {/* Pass the selected idea prompt to the generator */}
          <ContentGenerator key={selectedIdeaPrompt} initialPrompt={selectedIdeaPrompt} /> 
          {/* Using key={selectedIdeaPrompt} forces remount when idea changes */} 
        </Col>
      </Row>
    </Container>
  );
}

export default ContentAgentPage; 