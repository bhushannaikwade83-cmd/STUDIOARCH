// Vercel Serverless Function - B2 Authorization
// Replaces PHP proxy with Node.js function

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // B2 Credentials from environment
    const B2_KEY_ID = process.env.B2_KEY_ID || '379cd0b52bbf';
    const B2_APP_KEY = process.env.B2_APP_KEY || '0040a614cfa7c97e3de2377263ad7e9b55c68b587d';
    const B2_BUCKET_ID = process.env.B2_BUCKET_ID || '0327892cfdc0dba592e0b1f';
    const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'STUDIO-ARCH';

    console.log('[B2-AUTH] Authorizing with B2...');

    // Step 1: Authorize with B2
    const authHeader = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');

    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`
      }
    });

    if (!authResponse.ok) {
      throw new Error(`B2 auth failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const authToken = authData.authorizationToken;
    const apiUrl = authData.apiUrl;
    const downloadUrl = authData.downloadUrl;

    console.log('[B2-AUTH] ✅ Authorized');

    // Step 2: Get upload URL
    console.log('[B2-AUTH] Getting upload URL...');

    const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bucketId: B2_BUCKET_ID })
    });

    const uploadUrlData = await uploadUrlResponse.json();

    if (!uploadUrlData.uploadUrl) {
      throw new Error('Could not get B2 upload URL');
    }

    console.log('[B2-AUTH] ✅ Got upload URL');

    // Return auth data to frontend
    res.status(200).json({
      success: true,
      uploadUrl: uploadUrlData.uploadUrl,
      authToken: uploadUrlData.authorizationToken,
      bucketName: B2_BUCKET_NAME,
      downloadUrl: downloadUrl,
      apiUrl: apiUrl
    });

  } catch (error) {
    console.error('[B2-AUTH] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
