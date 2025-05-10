document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Mobile Menu Toggle
    const mobileMenuIcon = document.querySelector('.mobile-menu i'); // Target the icon inside
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const closeMenuIcon = document.querySelector('.close-menu');
    
    if (mobileMenuIcon && mobileNavOverlay && closeMenuIcon) {
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-overlay a'); // Select all links in the overlay
        
        mobileMenuIcon.addEventListener('click', () => {
            mobileNavOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
        });

        closeMenuIcon.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        });

        // Close menu when a link is clicked (optional but good UX)
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNavOverlay.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
            });
        });

        // Close menu if user clicks outside the links (on the overlay background)
        mobileNavOverlay.addEventListener('click', (event) => {
             // Check if the click is directly on the overlay, not on its children
            if (event.target === mobileNavOverlay) {
                mobileNavOverlay.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
            }
        });
    } else {
        console.log("Mobile menu elements not found. This is normal if using React app structure.");
    }

    // Initialize AOS (Animate On Scroll) if it exists
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800, // Animation duration in milliseconds
            once: true, // Whether animation should happen only once - while scrolling down
            offset: 100, // Offset (in px) from the original trigger point
        });
    } else {
        console.log("AOS library not found. No animation applied.");
    }
}); 