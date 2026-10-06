export default async function handler(req, res) {
  // 1. 设置跨域头 (CORS)，允许任意网页或前端程序调用你的 API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. 处理浏览器的 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. 提取请求参数 (支持 GET 链接传参 和 POST JSON 传参)
  const targetUrl = req.query.url || req.query.hwid || (req.body && (req.body.url || req.body.hwid));

  if (!targetUrl) {
    return res.status(400).json({
      status: 'error',
      message: '缺少必要参数 url 或 hwid。调用示例：/api/bypass?url=https://...'
    });
  }

  try {
    // 4. 模拟标准浏览器发起请求
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        message: `目标服务器响应异常: HTTP ${response.status}`
      });
    }

    const text = await response.text();
    let result = text.trim();

    // 5. 自动提取 Key / Token（优先尝试 JSON 解析，失败则使用正则匹配）
    try {
      const json = JSON.parse(text);
      result = json.key || json.result || json.token || text;
    } catch (e) {
      const match = text.match(/(?:key|token|result)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i);
      if (match && match[1]) {
        result = match[1];
      }
    }

    // 6. 返回提取结果
    return res.status(200).json({
      status: 'success',
      target: targetUrl,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || '网络请求处理失败'
    });
  }
}
