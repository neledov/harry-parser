export const isSamlRequest = (request) => {
    // Check URL patterns
    const samlUrlPatterns = ['/saml/', '/sso/', '/SAML/', '/SSO/'];
    const matchesUrl = samlUrlPatterns.some(pattern => request.url.includes(pattern));

    // Check headers
    const samlHeaders = request.headers.some(header => {
        const headerValue = header.value.toLowerCase();
        return (
            (header.name.toLowerCase() === 'content-type' && 
             headerValue.includes('application/samlrequest')) ||
            header.name.toLowerCase() === 'samlrequest' ||
            header.name.toLowerCase() === 'samlresponse'
        );
    });

    // Check POST data
    const hasSamlPost = request.postData?.text?.includes('SAMLRequest=') || 
                       request.postData?.text?.includes('SAMLResponse=');

    return matchesUrl || samlHeaders || hasSamlPost;
};

export const isSamlResponse = (response) => {
    // Check content type
    const samlContentType = response.headers.some(header =>
        header.name.toLowerCase() === 'content-type' && 
        header.value.toLowerCase().includes('application/saml')
    );

    // Check response body for SAML markers
    const samlMarkers = [
        '<saml:', 
        '<samlp:', 
        'urn:oasis:names:tc:SAML:',
        '<saml2:'
    ];

    const hasMarkers = response.content?.text && 
        samlMarkers.some(marker => response.content.text.includes(marker));

    return samlContentType || hasMarkers;
};
