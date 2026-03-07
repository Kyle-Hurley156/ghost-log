export default async function handler(req, res) {
  // 1. Set CORS headers so the iOS app is allowed to talk to this server
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests from the browser/app
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Safely grab the key from the server environment (invisible to users)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });
  }

  const { prompt, isImage, imageData } = req.body;

  try {
    // 3. Construct the payload based on whether it's text or a scanned food image
    let body;
    if (isImage) {
      body = { 
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageData } }] }] 
      };
    } else {
      body = { 
        contents: [{ parts: [{ text: prompt }] }] 
      };
    }

    // 4. Securely fetch from Google's servers
    const model = isImage ? 'gemini-2.0-flash' : 'gemini-2.0-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    // 5. Send the result back to the iOS App
    res.status(200).json(data);
    
  } catch (error) {
    console.error("Ghost AI Error:", error);
    res.status(500).json({ error: error.message });
  }
}