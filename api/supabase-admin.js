export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

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
    if (req.headers['x-upsert']) {
      headers['x-upsert'] = req.headers['x-upsert'];
    }
    if (req.headers['cache-control']) {
      headers['cache-control'] = req.headers['cache-control'];
    }

    const fetchOptions = {
      method: req.method,
      headers
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const rawBody = await getRawBody(req);
      if (rawBody.length > 0) {
        fetchOptions.body = rawBody;
      }
    }

    const response = await fetch(fullUrl, fetchOptions);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    return res.send(buffer);
  } catch (error) {
    console.error('Vercel Supabase proxy error:', error);
    return res.status(500).json({ error: error.message || 'Supabase proxy request failed' });
  }
}
