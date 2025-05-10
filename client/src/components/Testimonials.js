import React from 'react';
// import './Testimonials.css'; // If specific styles are needed

function Testimonials() {
    // Sample testimonial data
    const testimonialsData = [
        {
            content: 'ChatBotAI has transformed our customer support operations. Response times dropped by 80% and customer satisfaction is at an all-time high.',
            avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
            name: 'Sarah Johnson',
            title: 'Customer Success, TechCorp'
        },
        {
            content: 'The visual builder is incredibly intuitive. We launched our first chatbot in just one day with zero technical knowledge required.',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            name: 'David Chen',
            title: 'Marketing Director, GrowthX'
        },
        {
            content: 'The analytics dashboard provides invaluable insights. We\'ve been able to optimize our chatbot flows and increase conversions by 45%.',
            avatar: 'https://randomuser.me/api/portraits/women/42.jpg',
            name: 'Emily Rodriguez',
            title: 'Data Analyst, E-Commerce Plus'
        }
    ];

    return (
        <section className="testimonials">
            <div className="container">
                <h2>What Our Customers Say</h2>
                <div className="testimonial-grid">
                    {testimonialsData.map((testimonial, index) => (
                        <div className="testimonial-card" key={index}>
                            <div className="testimonial-content">
                                {testimonial.content}
                            </div>
                            <div className="testimonial-author">
                                <div className="author-avatar">
                                    <img src={testimonial.avatar} alt={testimonial.name} />
                                </div>
                                <div className="author-info">
                                    <h4>{testimonial.name}</h4>
                                    <p>{testimonial.title}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Testimonials; 