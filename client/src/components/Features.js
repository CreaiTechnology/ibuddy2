import React from 'react';
// import './Features.css'; // If specific styles are needed later

function Features() {
    // Data for feature cards - can be moved to props or state later
    const featuresData = [
        {
            icon: 'fas fa-robot',
            title: 'Visual Builder',
            description: 'Design chat flows with our intuitive drag-and-drop interface. No coding required, build complex conversational flows in minutes.'
        },
        {
            icon: 'fas fa-bolt',
            title: 'Smart Automation',
            description: 'Set up auto-replies, custom triggers and scheduled messages for 24/7 customer engagement and support.'
        },
        {
            icon: 'fas fa-chart-line',
            title: 'Advanced Analytics',
            description: 'Get detailed chat analytics, user behavior reports and conversion metrics to optimize your chatbot performance.'
        },
        {
            icon: 'fas fa-plug',
            title: 'Easy Integration',
            description: 'Seamlessly integrate with your website, mobile app, and popular platforms like Facebook, WhatsApp, and Slack.'
        },
        {
            icon: 'fas fa-brain',
            title: 'AI-Powered',
            description: 'Leverage state-of-the-art natural language processing to understand user intent and provide intelligent responses.'
        },
        {
            icon: 'fas fa-shield-alt',
            title: 'Secure & Reliable',
            description: 'Enterprise-grade security with data encryption, regular backups, and 99.9% uptime guarantee for your peace of mind.'
        }
    ];

    return (
        <section className="features">
            <div className="container">
                <h2>Powerful Features</h2>
                <div className="features-grid">
                    {featuresData.map((feature, index) => (
                        <div className="feature-card" key={index}>
                            <div className="feature-icon">
                                <i className={feature.icon}></i>
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Features; 