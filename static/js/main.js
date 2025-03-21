document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Form validation for waitlist signup
    const waitlistForm = document.getElementById('waitlist-form');
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', function(event) {
            if (!waitlistForm.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            waitlistForm.classList.add('was-validated');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Navbar behavior on scroll
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('navbar-scrolled', 'shadow-sm');
            } else {
                navbar.classList.remove('navbar-scrolled', 'shadow-sm');
            }
        });
    }

    // Fade in elements on scroll
    const fadeElements = document.querySelectorAll('.fade-in-element');
    if (fadeElements.length > 0) {
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeInObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        fadeElements.forEach(element => {
            fadeInObserver.observe(element);
        });
    }

    // Handle flash messages auto-dismiss
    const flashMessages = document.querySelectorAll('.alert:not(.alert-permanent)');
    flashMessages.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});

// Create loading overlay
function showLoading(message = 'Processing your request...') {
    // Check if it's a mobile device
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Create overlay if it doesn't exist
    if (!document.querySelector('.loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loading-overlay';
        
        const content = document.createElement('div');
        content.className = 'loading-content p-4 text-center rounded';
        
        // Add mobile-specific class
        if (isMobile) {
            content.classList.add('loading-content-mobile');
        }
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-light spinner mb-3';
        spinner.setAttribute('role', 'status');
        
        const spinnerText = document.createElement('span');
        spinnerText.className = 'visually-hidden';
        spinnerText.textContent = 'Loading...';
        spinner.appendChild(spinnerText);
        
        const messageElement = document.createElement('p');
        messageElement.className = 'loading-message m-0';
        if (isMobile) {
            messageElement.classList.add('small');
        }
        messageElement.textContent = message;
        
        // Progress indicator (animated dots)
        const progressIndicator = document.createElement('div');
        progressIndicator.className = 'progress-indicator mt-2';
        progressIndicator.innerHTML = '<span class="dot dot1">.</span><span class="dot dot2">.</span><span class="dot dot3">.</span>';
        
        // Add timer for long operations
        const timer = document.createElement('div');
        timer.className = 'small text-light mt-2 d-none';
        timer.id = 'processing-timer';
        timer.textContent = 'Processing time: 0s';
        
        content.appendChild(spinner);
        content.appendChild(messageElement);
        content.appendChild(progressIndicator);
        content.appendChild(timer);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Prevent scrolling while overlay is active
        document.body.style.overflow = 'hidden';
        
        // Add swipe resistance for mobile
        if (isMobile) {
            overlay.addEventListener('touchmove', function(e) {
                e.preventDefault();
            }, { passive: false });
        }
        
        // Start timer after 3 seconds to indicate long-running operation
        setTimeout(() => {
            const timerEl = document.getElementById('processing-timer');
            if (timerEl) {
                timerEl.classList.remove('d-none');
                let seconds = 0;
                const timerInterval = setInterval(() => {
                    seconds++;
                    const timerElement = document.getElementById('processing-timer');
                    if (timerElement) {
                        timerElement.textContent = `Processing time: ${seconds}s`;
                    } else {
                        clearInterval(timerInterval);
                    }
                }, 1000);
            }
        }, 3000);
    } else {
        // Update message if overlay exists
        document.querySelector('.loading-message').textContent = message;
        document.querySelector('.loading-overlay').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        // Add a fade-out effect
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.opacity = '1';
            document.body.style.overflow = '';
            
            // Reset timer if it exists
            const timer = document.getElementById('processing-timer');
            if (timer) {
                timer.classList.add('d-none');
                timer.textContent = 'Processing time: 0s';
            }
        }, 300);
    }
}

// Handle touch-specific behavior
document.addEventListener('DOMContentLoaded', function() {
    // Enable mobile-friendly larger touch targets
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device');
        
        // Make dropdowns easier to use on mobile
        const dropdownMenus = document.querySelectorAll('.dropdown-menu');
        dropdownMenus.forEach(menu => {
            menu.classList.add('dropdown-menu-touch');
        });
        
        // Add active state to buttons on touch
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', function() {
                this.classList.add('btn-touch-active');
            });
            btn.addEventListener('touchend', function() {
                this.classList.remove('btn-touch-active');
            });
        });
    }
});
