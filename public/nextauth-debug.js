// NextAuth Debug Configuration
// Add this to your browser console to enable NextAuth debugging

// Enable NextAuth client-side debugging
localStorage.setItem('nextauth.debug', 'true');

// Test function to check NextAuth status
window.testNextAuth = async function() {
    console.log('🧪 Testing NextAuth.js...');
    
    try {
        // Check if NextAuth is loaded
        if (typeof window !== 'undefined' && window.nextauth) {
            console.log('✅ NextAuth detected');
        } else {
            console.log('❌ NextAuth not detected in window');
        }
        
        // Test getProviders (if available)
        if (typeof window !== 'undefined' && window.nextauth && window.nextauth.getProviders) {
            const providers = await window.nextauth.getProviders();
            console.log('✅ Available providers:', providers);
        }
        
        // Test current session
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        console.log('✅ Current session:', session);
        
        // Test providers endpoint
        const providersRes = await fetch('/api/auth/providers');
        const providersData = await providersRes.json();
        console.log('✅ Providers from API:', providersData);
        
    } catch (error) {
        console.error('❌ NextAuth test failed:', error);
    }
};

// Monitor NextAuth events
if (typeof window !== 'undefined') {
    console.log('🔍 NextAuth debug monitoring active');
    
    // Monitor signIn calls
    const originalSignIn = window.nextauth?.signIn;
    if (originalSignIn) {
        window.nextauth.signIn = function(...args) {
            console.log('🚀 signIn called with:', args);
            return originalSignIn.apply(this, args);
        };
    }
    
    // Add click event monitoring
    document.addEventListener('click', function(e) {
        if (e.target.closest('button')) {
            const button = e.target.closest('button');
            const buttonText = button.textContent || button.innerText;
            if (buttonText.includes('Google') || buttonText.includes('GitHub')) {
                console.log('🖱️ OAuth button clicked:', buttonText);
                console.log('Button element:', button);
                console.log('Event target:', e.target);
            }
        }
    }, true);
}

console.log('✅ NextAuth debug tools loaded. Run testNextAuth() to test.');