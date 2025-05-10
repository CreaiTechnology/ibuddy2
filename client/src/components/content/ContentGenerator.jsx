import React, { useState, useEffect } from 'react';
import {
    Form, Button, Card, Spinner, Alert, Stack, ListGroup, FormCheck 
} from 'react-bootstrap';
import api from '../../api/axiosInstance'; 
import { toast } from 'react-toastify';

function ContentGenerator({ initialPrompt = '' }) {
  const [topic, setTopic] = useState(initialPrompt);
  // Removed state for platform, tone, length, customInstructions
  // const [platform, setPlatform] = useState('');
  // const [tone, setTone] = useState('');
  // const [length, setLength] = useState('');
  // const [customInstructions, setCustomInstructions] = useState('');
  
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [selectedPlatformsForPosting, setSelectedPlatformsForPosting] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postingError, setPostingError] = useState(null);
  const [postingResults, setPostingResults] = useState([]);
  const [fetchingPlatforms, setFetchingPlatforms] = useState(true);

  // Fetch connected platform statuses
  useEffect(() => {
    const fetchPlatforms = async () => {
      setFetchingPlatforms(true);
      try {
        const response = await api.get('/api/platforms/status');
        const { _isMockData, ...platforms } = response.data || {};
        setConnectedPlatforms(platforms || {});
      } catch (err) {
        console.error('Error fetching platform statuses:', err);
        toast.error('Could not load connected platforms.');
      } finally {
        setFetchingPlatforms(false);
      }
    };
    fetchPlatforms();
  }, []);

  // Update topic if initialPrompt changes
  useEffect(() => {
    if (initialPrompt && initialPrompt !== topic) {
        // Extract the core topic from the suggestion format
        const match = initialPrompt.match(/Generate content about: (.*)/i);
        setTopic(match ? match[1] : initialPrompt); 
        // Reset generated content and posting status
        setGeneratedText('');
        setPostingError(null);
        setPostingResults([]);
        setSelectedPlatformsForPosting([]);
    }
  }, [initialPrompt, topic]); // Depend on initialPrompt and topic

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setGenerationError('Please enter a topic or main idea.');
      toast.error('Please enter a topic or main idea.');
      return;
    }
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedText('');
    setPostingError(null);
    setPostingResults([]);
    setSelectedPlatformsForPosting([]);

    try {
      console.log('Sending content generation request:', { topic }); // Only send topic now
      // Update API call to only send topic
      const response = await api.post('/api/content/generate', { 
          topic 
      });
      console.log('Received response from backend:', response);
      
      if (response.data && response.data.generatedContent) {
        setGeneratedText(response.data.generatedContent);
        toast.success('Content generated successfully!');
      } else {
        setGenerationError('Received an unexpected response format from the server.');
        console.warn('Unexpected backend response format:', response.data);
        toast.error('Content generation failed: Unexpected response.');
      }
      
    } catch (err) {
      console.error('Error generating content:', err);
      let errorMessage = 'Failed to generate content.';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlatformSelect = (e) => {
    const { value, checked } = e.target;
    setSelectedPlatformsForPosting(prev => 
      checked ? [...prev, value] : prev.filter(p => p !== value)
    );
  };

  const handlePost = async () => {
    if (!generatedText || selectedPlatformsForPosting.length === 0) {
      setPostingError('Please generate content and select at least one platform to post.');
      toast.error('Please generate content and select at least one platform.');
      return;
    }

    setIsPosting(true);
    setPostingError(null);
    setPostingResults([]);

    try {
      console.log(`Posting content to: ${selectedPlatformsForPosting.join(', ')}`);
      const response = await api.post('/api/content/post', {
        message: generatedText,
        platforms: selectedPlatformsForPosting
      });
      console.log('Posting response:', response.data);
      
      setPostingResults(response.data.results || []);
      if (response.status === 207 || response.data.message?.includes('error')) {
          toast.warn(response.data.message || 'Posting completed with some errors.');
          setPostingError('Some platforms failed to post. Check results below.');
      } else {
          toast.success(response.data.message || 'Content posted successfully!');
      }

    } catch (err) {
        console.error('Error posting content:', err);
        const message = err.response?.data?.message || 'Failed to post content.';
        setPostingError(message);
        toast.error(message);
        if(err.response?.data?.results) {
            setPostingResults(err.response.data.results);
        }
    } finally {
        setIsPosting(false);
    }
  };

  // Filter platforms available for posting
  const platformsForPosting = Object.entries(connectedPlatforms)
    .filter(([key, isConnected]) => isConnected)
    .map(([key]) => key);

  return (
    <Card className="mt-4" id="content-generator-card">
      <Card.Header as="h5">AI Content Generator</Card.Header>
      <Card.Body>
        <Form>
          {/* Topic/Main Idea */}
          <Form.Group className="mb-3" controlId="contentTopic">
            <Form.Label>Topic / Main Idea {initialPrompt ? "(Based on Suggestion)" : ""}</Form.Label>
            <Form.Control
              as="textarea"
              rows={4} // Increased rows slightly
              placeholder="Enter the main topic, keywords, or idea for the AI content generation..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating || isPosting}
              required
            />
             <Form.Text className="text-muted">
              The AI will use this topic along with your saved Brand Configuration settings (tone, target platforms, etc.).
            </Form.Text>
          </Form.Group>
          
          {/* REMOVED Optional Parameters Sections */}

          {/* Generate Button */}
          <Button 
            variant="primary" 
            onClick={handleGenerate} 
            disabled={isGenerating || isPosting || !topic.trim()}
            className="mb-3 me-2"
          >
            {isGenerating ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-2">Generating...</span>
              </>
            ) : (
              'Generate Content'
            )}
          </Button>
        </Form>

        {/* Generation Error Display */}
        {generationError && <Alert variant="danger" className="mt-3">{generationError}</Alert>}

        {/* Generated Content & Posting Section */}
        {generatedText && (
          <Card className="mt-3 bg-light">
            <Card.Body>
              <Card.Title>Generated Content:</Card.Title>
              <Form.Control
                 as="textarea"
                 rows={10} // Adjust rows as needed
                 value={generatedText}
                 onChange={(e) => setGeneratedText(e.target.value)} // Allow editing
                 style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
               />
              <Form.Text className="text-muted">
                You can edit the generated content before posting.
             </Form.Text>
              
              <hr />
              <h5 className="mt-3">Post to Platforms</h5>
              {fetchingPlatforms ? (
                  <Spinner animation="border" size="sm" />
              ) : platformsForPosting.length > 0 ? (
                <Form.Group className="mb-3">
                  <Form.Label>Select platforms:</Form.Label>
                   <Stack direction="horizontal" gap={3} className="flex-wrap">
                    {platformsForPosting.map((platformKey) => (
                      <FormCheck 
                        key={platformKey}
                        type="checkbox"
                        id={`post-platform-${platformKey}`}
                        label={platformKey.charAt(0).toUpperCase() + platformKey.slice(1)}
                        value={platformKey}
                        checked={selectedPlatformsForPosting.includes(platformKey)}
                        onChange={handlePlatformSelect}
                        disabled={isPosting || isGenerating}
                      />
                    ))}
                   </Stack>
                </Form.Group>
              ) : (
                 <Alert variant="info">No connected platforms available for posting. Connect platforms in Platform API Management.</Alert>
              )}
              
              {/* Post Button */}
              <Button 
                 variant="success" 
                 onClick={handlePost} 
                 disabled={isPosting || isGenerating || selectedPlatformsForPosting.length === 0 || platformsForPosting.length === 0}
              >
                 {isPosting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" />
                    <span className="ms-2">Posting...</span>
                  </>
                 ) : (
                    `Post to ${selectedPlatformsForPosting.length} Platform(s)`
                 )}
               </Button>

               {/* Posting Error/Results */}
               {postingError && <Alert variant="danger" className="mt-3">{postingError}</Alert>} 
               {postingResults.length > 0 && (
                    <div className="mt-3">
                        <h6>Posting Results:</h6>
                        <ListGroup variant="flush">
                            {postingResults.map((result, index) => (
                                <ListGroup.Item key={index} variant={result.success ? 'success' : 'danger'}>
                                    <strong>{result.platform.charAt(0).toUpperCase() + result.platform.slice(1)}:</strong> 
                                    {result.success ? `Success (Post ID: ${result.postId || 'N/A'})` : `Failed - ${result.error}`}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
               )}
               
            </Card.Body>
          </Card>
        )}

      </Card.Body>
    </Card>
  );
}

export default ContentGenerator; 