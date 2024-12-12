export const analyzeRequestTiming = (entry) => {
    const timings = entry.timings || {};
    const connectionInfo = entry.connectionInfo || {};
    
    // Get all timing values with fallbacks to 0
    const blocked = Math.max(0, timings.blocked || 0);
    const dns = Math.max(0, timings.dns || 0);
    const connect = Math.max(0, timings.connect || 0);
    const ssl = Math.max(0, timings.ssl || 0);
    const send = Math.max(0, timings.send || 0);
    const wait = Math.max(0, timings.wait || 0);
    const receive = Math.max(0, timings.receive || 0);

    const totalTime = blocked + dns + connect + ssl + send + wait + receive;
    
    // Analysis results
    const analysis = {
        totalTime,
        primaryDelay: null,
        delays: [],
        isAtConnectionLimit: connectionInfo.concurrent >= 6,
        explanation: ''
    };

    // Check connection pool limitation
    if (analysis.isAtConnectionLimit) {
        analysis.primaryDelay = 'connection_limit';
        analysis.delays.push({
            type: 'connection_limit',
            duration: blocked,
            message: `Request queued due to browser connection limit (${connectionInfo.concurrent}/6 active connections)`
        });
    }
    
    // DNS Resolution delay
    if (dns > 100) { // Threshold of 100ms for DNS
        analysis.delays.push({
            type: 'dns',
            duration: dns,
            message: `DNS resolution took ${dns}ms`
        });
    }

    // SSL/TLS handshake delay
    if (ssl > 100) { // Threshold of 100ms for SSL
        analysis.delays.push({
            type: 'ssl',
            duration: ssl,
            message: `SSL/TLS handshake took ${ssl}ms`
        });
    }

    // TCP Connection delay
    if (connect > 100) { // Threshold of 100ms for TCP
        analysis.delays.push({
            type: 'connect',
            duration: connect,
            message: `TCP connection establishment took ${connect}ms`
        });
    }

    // Server processing delay (TTFB)
    if (wait > 200) { // Threshold of 200ms for TTFB
        analysis.delays.push({
            type: 'ttfb',
            duration: wait,
            message: `Time to First Byte (TTFB) was ${wait}ms, indicating server processing delay`
        });
    }

    // Client-side scheduling delay
    if (blocked > 100 && !analysis.isAtConnectionLimit) {
        analysis.delays.push({
            type: 'blocked',
            duration: blocked,
            message: `Request was blocked for ${blocked}ms due to browser scheduling`
        });
    }

    // Determine primary delay if not at connection limit
    if (!analysis.primaryDelay) {
        const sortedDelays = analysis.delays.sort((a, b) => b.duration - a.duration);
        analysis.primaryDelay = sortedDelays[0]?.type || 'none';
    }

    // Generate human-readable explanation
    if (analysis.delays.length === 0) {
        analysis.explanation = `Request completed in ${totalTime}ms with no significant delays`;
    } else {
        analysis.explanation = analysis.delays
            .sort((a, b) => b.duration - a.duration)
            .map(d => d.message)
            .join('. ');
    }

    return analysis;
};
