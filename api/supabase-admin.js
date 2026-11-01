export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ixirytvbygcwfmdctgoz.supabase.co';
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    return res.status(500).json({
      error: 'Missing VITE_SUPABASE_SERVICE_KEY in Vercel environment variables. Please add it to your Vercel Project Settings.'
    });
  }

  // Determine the target Supabase path and query string
  let targetPath = '';
  const urlObj = new URL(req.url, 'http://localhost');

  if (urlObj.searchParams.has('endpoint')) {
    targetPath = urlObj.searchParams.get('endpoint');
    urlObj.searchParams.delete('endpoint');
    const remainingQs = urlObj.searchParams.toString();
    if (remainingQs) {
      targetPath += (targetPath.includes('?') ? '&' : '?') + remainingQs;
    }
  } else if (req.url.startsWith('/supabase-admin/')) {
    targetPath = req.url.replace(/^\/supabase-admin\//, '');
  } else {
    targetPath = req.url.replace(/^\/api\/supabase-admin\/?/, '');
  }

  // Ensure clean target URL without double slashes
  const cleanBase = supabaseUrl.replace(/\/+$/, '');
  const cleanTarget = targetPath.replace(/^\/+/, '');
  const fullUrl = `${cleanBase}/${cleanTarget}`;

  try {
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'User-Agent': 'TechAds-Vercel-Proxy/1.0'
    };

    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }
    if (req.headers['prefer']) {
      headers['Prefer'] = req.headers['prefer'];
    }

    const fetchOptions = {
      method: req.method,
      headers
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string') {
        fetchOptions.body = req.body;
      } else if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(fullUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    return res.send(data);
  } catch (error) {
    console.error('Vercel Supabase proxy error:', error);
    return res.status(500).json({ error: error.message || 'Supabase proxy request failed' });
  }
}
