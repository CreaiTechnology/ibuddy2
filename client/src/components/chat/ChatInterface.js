import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axiosInstance'; // Use axios instance
import './ChatInterface.css';

function ChatInterface() {
    const [messages, setMessages] = useState([
        // Initial message from AI (optional)
        { sender: 'ai', text: 'Hello! How can I help you today?' }
    ]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null); // Ref to scroll to bottom

    // Function to scroll to the bottom of the messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    // Scroll to bottom whenever messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (event) => {
        setCurrentMessage(event.target.value);
    };

    const handleSendMessage = async (event) => {
        // Allow sending via Enter key or button click
        if (event.type === 'keypress' && event.key !== 'Enter') {
            return;
        }
        // Prevent form submission if using Enter key in a form
        if (event.type === 'submit') {
             event.preventDefault();
        }
        
        const trimmedMessage = currentMessage.trim();
        if (!trimmedMessage || isLoading) {
            return; // Don't send empty messages or while loading
        }

        // Add user message to state
        const newUserMessage = { sender: 'user', text: trimmedMessage };
        setMessages(prevMessages => [...prevMessages, newUserMessage]);
        setCurrentMessage(''); // Clear input field
        setIsLoading(true);

        try {
            console.log('Sending message to backend:', trimmedMessage);
            // Call the backend chat API
            const response = await api.post('/chat', { message: trimmedMessage });
            const aiReply = response.data.reply;

            if (aiReply) {
                // Add AI response to state
                const newAiMessage = { sender: 'ai', text: aiReply };
                setMessages(prevMessages => [...prevMessages, newAiMessage]);
            } else {
                // Handle case where reply might be empty
                 setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: 'Sorry, I could not process that.' }]);
            }

        } catch (error) {
            console.error('Error sending message or receiving reply:', error);
            // Display an error message in the chat
            const errorMessage = error.response?.data?.message || 'Error communicating with the AI.';
            setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: `Sorry, an error occurred: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-interface-container">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {/* Basic text rendering, can enhance with Markdown later */}
                        {msg.text}
                    </div>
                ))}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} /> 
            </div>
            <div className="chat-input-area">
                <input
                    type="text"
                    placeholder="Type your message..."
                    value={currentMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleSendMessage} // Send on Enter key press
                    disabled={isLoading}
                />
                <button onClick={handleSendMessage} disabled={isLoading || !currentMessage.trim()}>
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
}

export default ChatInterface; 