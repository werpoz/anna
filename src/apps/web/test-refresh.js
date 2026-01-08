
async function testRefresh() {
    const loginUrl = 'http://localhost:3000/auth/login';
    const refreshUrl = 'http://localhost:3000/auth/refresh';

    console.log('1. Logging in...');
    const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dev@anna.local', password: 'SuperSecure123!' })
    });

    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    const loginCookies = loginRes.headers.get('set-cookie');
    console.log('Login Success. Cookies received:', loginCookies);

    console.log('\n2. Attempting Refresh with credentials: include (simulated by passing login cookies)...');
    const refreshRes = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
            'Cookie': loginCookies || ''
        }
    });

    console.log('Refresh Status:', refreshRes.status);
    const refreshData = await refreshRes.json();
    console.log('Refresh Data:', refreshData);
    console.log('Refresh Cookies:', refreshRes.headers.get('set-cookie'));
}

testRefresh();
