import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
// import './CTA.css'; // If specific styles are needed

function CTA() {
    return (
        <section className="cta">
            <div className="cta-content">
                <h2>Ready to Transform Your Customer Engagement?</h2>
                <p>Join thousands of companies using ChatBotAI to automate support, boost sales, and deliver exceptional customer experiences.</p>
                <button className="btn btn-primary btn-large">
                    Start Your Free 14-Day Trial <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </div>
        </section>
    );
}

export default CTA; 