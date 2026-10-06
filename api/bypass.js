export default async function handler(req, res) {
  // 设置 CORS 跨域头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url || req.query.hwid || (req.body && (req.body.url || req.body.hwid));

  if (!targetUrl) {
    return res.status(400).json({
      status: 'error',
      message: '请提供 url 参数，例如：/api/bypass?url=https://...'
    });
  }

  try {
    let resultKey = null;

    // 1. 针对 Platoboost / Delta 类型的链接 (包含 platorelay 或 platoboost)
    if (targetUrl.includes('platoboost') || targetUrl.includes('platorelay')) {
      resultKey = await bypassPlatoboost(targetUrl);
    } else {
      // 2. 普通链接的提取逻辑
      resultKey = await generalBypass(targetUrl);
    }

    return res.status(200).json({
      status: 'success',
      target: targetUrl,
      result: resultKey,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || '绕过解析失败'
    });
  }
}

// 专门解析 Platoboost 接口逻辑
async function bypassPlatoboost(urlStr) {
  const u = new URL(urlStr);
  const dParam = u.searchParams.get('d') || u.searchParams.get('id');

  if (!dParam) {
    throw new Error('链接缺少必要的 d 或 id 参数');
  }

  // 直接绕过前端 HTML，请求 Platoboost 后台 API
  const apiUrl = `https://api.platoboost.com/v1/sessions/auth/plan?id=${encodeURIComponent(dParam)}`;
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://auth.platorelay.com',
      'Referer': urlStr
    }
  });

  const text = await response.text();
  try {
    const json = JSON.parse(text);
    if (json.key) return json.key;
    if (json.data && json.data.key) return json.data.key;
    if (json.redirect) return json.redirect;
    return json;
  } catch (e) {
    // 正则二次提取
    const match = text.match(/(?:key|token)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i);
    if (match && match[1]) return match[1];
    throw new Error('未能从 Platoboost API 获取到有效的 Key');
  }
}

// 普通链接逻辑
async function generalBypass(urlStr) {
  const response = await fetch(urlStr, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.key || json.result || json.token || text;
  } catch (e) {
    const match = text.match(/(?:key|token|result)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i);
    return match ? match[1] : text.trim();
  }
}
