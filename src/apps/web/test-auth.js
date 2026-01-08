
async function testAuth() {
    const loginUrl = 'http://localhost:3000/auth/login';
    const meUrl = 'http://localhost:3000/users/me';

    // 1. Login
    console.log('Logging in...');
    try {
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'dev@anna.local', password: 'SuperSecure123!' })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('Login success, got token length:', token.length);

        // 2. Test with Cookie only
        console.log('\nTesting /users/me with Cookie...');
        const cookieRes = await fetch(meUrl, {
            headers: { 'Cookie': `accessToken=${token}` }
        });
        console.log('Cookie Status:', cookieRes.status);

        // 3. Test with Authorization Header
        console.log('\nTesting /users/me with Authorization Header...');
        const authHeaderRes = await fetch(meUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Auth Header Status:', authHeaderRes.status);

        // 4. Test with both
        console.log('\nTesting /users/me with Both...');
        const bothRes = await fetch(meUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cookie': `accessToken=${token}`
            }
        });
        console.log('Both Status:', bothRes.status);
    } catch (error) {
        console.error('Error running test:', error);
    }
}

testAuth();
