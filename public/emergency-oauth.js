// Emergency OAuth Fallback
// Add this to your browser console if OAuth buttons don't work

window.emergencyOAuth = function(provider) {
    console.log('🚨 Emergency OAuth for:', provider);
    
    const baseUrl = 'https://supersmartx.com';
    const callbackUrl = encodeURIComponent('https://supersmartx.com/dashboard');
    
    const urls = {
        google: `${baseUrl}/api/auth/signin/google?callbackUrl=${callbackUrl}`,
        github: `${baseUrl}/api/auth/signin/github?callbackUrl=${callbackUrl}`
    };
    
    if (urls[provider]) {
        console.log('🔄 Redirecting to:', urls[provider]);
        window.location.href = urls[provider];
    } else {
        console.error('❌ Unknown provider:', provider);
    }
};

console.log('🛠️ Emergency OAuth loaded. Use: emergencyOAuth("google") or emergencyOAuth("github")');

// Test if NextAuth is available
if (typeof window !== 'undefined') {
    console.log('🔍 Testing NextAuth availability...');
    
    // Check if NextAuth React is loaded
    setTimeout(() => {
        if (window.React && window.React.createElement) {
            console.log('✅ React detected');
        } else {
            console.log('❌ React not detected');
        }
        
        // Check NextAuth
        if (window.nextauth) {
            console.log('✅ NextAuth global detected');
        } else {
            console.log('❌ NextAuth global not detected');
        }
    }, 1000);
}