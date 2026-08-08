const fetch = globalThis.fetch;
(async () => {
  const csrfRes = await fetch('http://localhost:3001/api/auth/csrf');
  const body = await csrfRes.json();
  console.log('csrf body', body);
  const cookie = csrfRes.headers.get('set-cookie');
  console.log('cookie', cookie);
  const params = new URLSearchParams();
  params.set('csrfToken', body.csrfToken);
  params.set('callbackUrl', 'http://localhost:3001/dashboard');
  params.set('json', 'true');
  params.set('email', 'botvintedscrapping@gmail.com');
  params.set('password', '260309Timeo)');
  const res = await fetch('http://localhost:3001/api/auth/callback/credentials', {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie || '',
    },
    redirect: 'manual',
  });
  console.log('status', res.status);
  console.log('headers', JSON.stringify([...res.headers.entries()]));
  const text = await res.text();
  console.log(text);
})();
