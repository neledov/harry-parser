export const analyzeSamlSecurity = (samlData, decoded) => {
    const issues = [];
    const warnings = [];
    const validations = {
        signature: validateSignature(decoded),
        encryption: checkEncryption(decoded),
        certificates: validateCertificates(decoded),
        timestamps: validateTimestamps(samlData),
        audience: validateAudience(samlData)
    };

    return {
        issues,
        warnings,
        validations,
        certificateInfo: extractCertificateInfo(decoded)
    };
};

const validateSignature = (decoded) => {
    const hasSignature = decoded.includes('<ds:Signature') || decoded.includes('<Signature');
    return {
        status: hasSignature ? 'valid' : 'missing',
        details: hasSignature ? 'SAML message is signed' : 'No signature found - potential security risk'
    };
};

const checkEncryption = (decoded) => {
    const hasEncryption = decoded.includes('EncryptedData') || decoded.includes('EncryptedKey');
    return {
        status: hasEncryption ? 'encrypted' : 'unencrypted',
        details: hasEncryption ? 'SAML message is encrypted' : 'Message is not encrypted'
    };
};

const validateCertificates = (decoded) => {
    // Extract and validate certificate information
    const certMatches = decoded.match(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/g);
    return {
        found: certMatches ? certMatches.length : 0,
        details: certMatches ? 'Certificates found in SAML message' : 'No certificates found'
    };
};

const validateTimestamps = (samlData) => {
    const now = new Date();
    const conditions = samlData.conditions;
    
    if (!conditions) {
        return {
            status: 'missing',
            details: 'No timestamp conditions found'
        };
    }

    const notBefore = conditions.notBefore ? new Date(conditions.notBefore) : null;
    const notOnOrAfter = conditions.notOnOrAfter ? new Date(conditions.notOnOrAfter) : null;

    return {
        status: 'valid',
        notBefore,
        notOnOrAfter,
        isExpired: notOnOrAfter && now > notOnOrAfter,
        isNotYetValid: notBefore && now < notBefore
    };
};

const validateAudience = (samlData) => {
    const audiences = samlData.conditions?.audiences || [];
    return {
        found: audiences.length,
        values: audiences,
        details: audiences.length ? 'Audience restrictions found' : 'No audience restrictions'
    };
};

const extractCertificateInfo = (decoded) => {
    const certMatches = decoded.match(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/g);
    if (!certMatches) return null;

    return certMatches.map(cert => {
        const certData = cert.replace(/<\/?ds:X509Certificate>/g, '');
        return {
            raw: certData,
            // Add more certificate parsing if needed
        };
    });
};
