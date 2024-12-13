export const analyzeRequestTiming = (entry) => {
    const timings = entry.timings || {};
    const connectionInfo = entry.connectionInfo || {};
    
    // Get all timing values with fallbacks to 0
    const blocked = Math.round(Math.max(0, timings.blocked || 0));
    const dns = Math.round(Math.max(0, timings.dns || 0));
    const connect = Math.round(Math.max(0, timings.connect || 0));
    const ssl = Math.round(Math.max(0, timings.ssl || 0));
    const send = Math.round(Math.max(0, timings.send || 0));
    const wait = Math.round(Math.max(0, timings.wait || 0));
    const receive = Math.round(Math.max(0, timings.receive || 0));

    const totalTime = blocked + dns + connect + ssl + send + wait + receive;
    
    const isHTTP2 = entry.request?.httpVersion?.includes('2') || 
                    entry.response?.httpVersion?.includes('2');

    // Analysis results
    const analysis = {
        totalTime,
        primaryDelay: null,
        delays: [],
        isAtConnectionLimit: !isHTTP2 && connectionInfo.concurrent >= 6,
        httpVersion: isHTTP2 ? 'HTTP/2' : 'HTTP/1.1',
        explanation: ''
    };

    // Check connection pool limitation for HTTP/1.1
    if (analysis.isAtConnectionLimit) {
        analysis.primaryDelay = 'connection_limit';
        analysis.delays.push({
            type: 'connection_limit',
            duration: blocked,
            message: `HTTP/1.1 connection pool limit reached (${connectionInfo.concurrent}/6 active connections)`
        });
    }
    
    // DNS Resolution delay
    if (dns > 100) {
        analysis.delays.push({
            type: 'dns',
            duration: dns,
            message: `DNS resolution took ${dns}ms`
        });
    }

    // SSL/TLS handshake delay
    if (ssl > 100) {
        analysis.delays.push({
            type: 'ssl',
            duration: ssl,
            message: `SSL/TLS handshake took ${ssl}ms`
        });
    }

    // TCP Connection delay
    if (connect > 100) {
        analysis.delays.push({
            type: 'connect',
            duration: connect,
            message: `TCP connection establishment took ${connect}ms`
        });
    }

    // Server processing delay (TTFB)
    if (wait > 200) {
        analysis.delays.push({
            type: 'ttfb',
            duration: wait,
            message: `Time to First Byte (TTFB) was ${wait}ms, indicating server processing delay`
        });
    }

    // Client-side scheduling delay
    if (blocked > 100 && !analysis.isAtConnectionLimit) {
        const reason = isHTTP2 ? 
            'browser scheduling' : 
            'browser scheduling or connection pool availability';
            
        analysis.delays.push({
            type: 'blocked',
            duration: blocked,
            message: `Request was blocked for ${blocked}ms due to ${reason}`
        });
    }

    // Determine primary delay if not at connection limit
    if (!analysis.primaryDelay) {
        const sortedDelays = analysis.delays.sort((a, b) => b.duration - a.duration);
        analysis.primaryDelay = sortedDelays[0]?.type || 'none';
    }

    // Generate human-readable explanation
    if (analysis.delays.length === 0) {
        analysis.explanation = `${analysis.httpVersion} request completed in ${totalTime}ms with no significant delays`;
    } else {
        analysis.explanation = analysis.delays
            .sort((a, b) => b.duration - a.duration)
            .map(d => d.message)
            .join('. ');
    }

    return analysis;
};
