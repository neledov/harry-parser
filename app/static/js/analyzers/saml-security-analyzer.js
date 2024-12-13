import { decodeCertificate } from '../analyzers/certificate-analyzer.js';
import { validateXmlSignature } from '../utils/signature-validator.js';

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

    // Add security warnings based on validations
    if (validations.signature.status === 'missing') {
        issues.push('Missing XML signature');
    }
    if (validations.encryption.status === 'unencrypted') {
        warnings.push('SAML message is not encrypted');
    }
    if (!validations.certificates.found) {
        issues.push('No certificates found in SAML message');
    }
    if (validations.timestamps.isExpired) {
        issues.push('SAML assertion has expired');
    }
    if (validations.timestamps.isNotYetValid) {
        issues.push('SAML assertion is not yet valid');
    }

    return {
        issues,
        warnings,
        validations,
        certificateInfo: extractCertificateInfo(decoded)
    };
};

const validateSignature = (decoded) => {
    const hasSignature = decoded.includes('<ds:Signature') || decoded.includes('<Signature');
    if (!hasSignature) {
        return {
            status: 'missing',
            details: 'No signature found - potential security risk'
        };
    }

    const validationResult = validateXmlSignature(decoded);
    return {
        status: validationResult.isValid ? 'valid' : 'invalid',
        details: validationResult.isValid ? 
            'SAML message signature is valid' : 
            'Invalid signature detected',
        algorithm: validationResult.algorithm,
        transforms: validationResult.transforms,
        digestMethod: validationResult.digestMethod,
        signatureDetails: validationResult.signatureDetails
    };
};

const checkEncryption = (decoded) => {
    const hasEncryption = decoded.includes('EncryptedData') || decoded.includes('EncryptedKey');
    const encryptionAlgorithm = extractEncryptionAlgorithm(decoded);
    
    return {
        status: hasEncryption ? 'encrypted' : 'unencrypted',
        details: hasEncryption ? `SAML message is encrypted using ${encryptionAlgorithm || 'unknown algorithm'}` : 'Message is not encrypted',
        algorithm: encryptionAlgorithm
    };
};

const extractEncryptionAlgorithm = (decoded) => {
    const algorithmMatch = decoded.match(/Algorithm="(.*?)"/);
    return algorithmMatch ? algorithmMatch[1] : null;
};

const validateCertificates = (decoded) => {
    const certMatches = decoded.match(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/g);
    const certificates = certMatches ? certMatches.map(cert => {
        const certData = cert.replace(/<\/?ds:X509Certificate>/g, '');
        return decodeCertificate(certData);
    }) : [];

    return {
        found: certificates.length,
        details: certificates.length ? 
            `Found ${certificates.length} certificate(s) in SAML message` : 
            'No certificates found',
        certificates: certificates
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

    const isExpired = notOnOrAfter && now > notOnOrAfter;
    const isNotYetValid = notBefore && now < notBefore;

    return {
        status: (!isExpired && !isNotYetValid) ? 'valid' : 'invalid',
        notBefore,
        notOnOrAfter,
        isExpired,
        isNotYetValid,
        details: generateTimestampDetails(isExpired, isNotYetValid, notBefore, notOnOrAfter)
    };
};

const generateTimestampDetails = (isExpired, isNotYetValid, notBefore, notOnOrAfter) => {
    if (isExpired) return 'SAML assertion has expired';
    if (isNotYetValid) return 'SAML assertion is not yet valid';
    if (notBefore && notOnOrAfter) return 'Timestamp validation successful';
    return 'Incomplete timestamp information';
};

const validateAudience = (samlData) => {
    const audiences = samlData.conditions?.audiences || [];
    return {
        found: audiences.length,
        values: audiences,
        details: audiences.length ? 
            `Found ${audiences.length} audience restriction(s)` : 
            'No audience restrictions',
        status: audiences.length ? 'valid' : 'missing'
    };
};

const extractCertificateInfo = (decoded) => {
    const certMatches = decoded.match(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/g);
    if (!certMatches) return null;

    return certMatches.map(cert => {
        const certData = cert.replace(/<\/?ds:X509Certificate>/g, '');
        const decodedCert = decodeCertificate(certData);
        return {
            raw: certData,
            decoded: decodedCert,
            status: {
                isValid: decodedCert && !decodedCert.isExpired && !decodedCert.isNotYetValid,
                isExpired: decodedCert?.isExpired || false,
                isNotYetValid: decodedCert?.isNotYetValid || false
            }
        };
    });
};
