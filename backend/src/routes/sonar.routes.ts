import { Router, Request, Response } from 'express';

export const sonarRouter = Router();

function formatProxyError(err: any, targetUrl: string): string {
  const cause = err?.cause;
  const causeCode = cause?.code || '';
  const causeMsg = cause?.message || '';

  if (causeCode === 'ECONNREFUSED' || causeMsg.includes('ECONNREFUSED')) {
    return `Connection refused at "${targetUrl}". SonarQube is not running at this address or the port is closed. If testing locally, please ensure your SonarQube service is started.`;
  }
  if (causeCode === 'ENOTFOUND' || causeMsg.includes('ENOTFOUND') || causeMsg.includes('getaddrinfo')) {
    return `Cannot resolve hostname for "${targetUrl}". Please check for typos in the Sonar server URL.`;
  }
  if (causeCode === 'ETIMEDOUT' || causeMsg.includes('ETIMEDOUT')) {
    return `Connection to "${targetUrl}" timed out. Ensure your VPN or network firewall allows access to this server.`;
  }
  if (causeMsg.includes('certificate') || causeCode.includes('CERT') || causeMsg.includes('self-signed')) {
    return `SSL/TLS certificate error connecting to "${targetUrl}": ${causeMsg}`;
  }

  const detail = causeMsg || causeCode || err?.message || 'Unknown network error';
  return `Failed to connect to "${targetUrl}": ${detail}`;
}

// Proxy endpoint to bypass browser CORS when querying SonarQube instances
sonarRouter.post('/proxy', async (req: Request, res: Response) => {
  let targetUrl = '';
  try {
    const { url, token } = req.body;
    targetUrl = url;

    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing target "url" parameter in request body' });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'DevSecOps-Suite-SonarExporter/1.0',
    };

    if (token && typeof token === 'string' && token.trim() !== '') {
      const cleanToken = token.trim();
      const base64Auth = Buffer.from(`${cleanToken}:`).toString('base64');
      headers['Authorization'] = `Basic ${base64Auth}`;
    }

    const method = (req.body.method || 'GET').toUpperCase();
    const requestBody = req.body.body;
    const bodyContentType = req.body.contentType;

    if (bodyContentType) {
      headers['Content-Type'] = bodyContentType;
    } else if (requestBody && typeof requestBody === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (method !== 'GET' && method !== 'HEAD' && requestBody !== undefined) {
      fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    res.status(response.status).header('Content-Type', contentType).send(data);
  } catch (error: any) {
    const userFriendlyMessage = formatProxyError(error, targetUrl);
    res.status(502).json({ error: userFriendlyMessage });
  }
});
