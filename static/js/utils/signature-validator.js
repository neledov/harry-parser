export const validateXmlSignature = (decoded) => {
    const signedInfo = extractSignedInfo(decoded);
    const signature = extractSignatureValue(decoded);
    const certificate = extractCertificate(decoded);
    
    const verificationResult = verifySignature(signedInfo, signature, certificate);
    
    return {
        isValid: verificationResult.isValid,
        algorithm: getSignatureAlgorithm(decoded),
        transforms: getTransforms(decoded),
        digestMethod: getDigestMethod(decoded),
        signatureDetails: {
            signedInfo,
            signature,
            certificate
        },
        diagnostics: {
            hasCertificate: !!certificate,
            hasSignature: !!signature,
            hasSignedInfo: !!signedInfo,
            verificationErrors: verificationResult.errors,
            certificateStatus: verificationResult.certificateStatus
        }
    };
};

const extractSignedInfo = (decoded) => {
    const signedInfoMatch = decoded.match(/<ds:SignedInfo>(.*?)<\/ds:SignedInfo>/s);
    return signedInfoMatch ? signedInfoMatch[1] : null;
};

const extractSignatureValue = (decoded) => {
    const signatureMatch = decoded.match(/<ds:SignatureValue>(.*?)<\/ds:SignatureValue>/s);
    return signatureMatch ? signatureMatch[1] : null;
};

const extractCertificate = (decoded) => {
    const certMatch = decoded.match(/<ds:X509Certificate>(.*?)<\/ds:X509Certificate>/s);
    return certMatch ? certMatch[1] : null;
};

const getSignatureAlgorithm = (decoded) => {
    const algorithmMatch = decoded.match(/Algorithm="(.*?)"/);
    return algorithmMatch ? {
        uri: algorithmMatch[1],
        name: mapAlgorithmToName(algorithmMatch[1])
    } : null;
};

const mapAlgorithmToName = (uri) => {
    const algorithms = {
        'http://www.w3.org/2000/09/xmldsig#rsa-sha1': 'RSA-SHA1',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256': 'RSA-SHA256',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384': 'RSA-SHA384',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512': 'RSA-SHA512'
    };
    return algorithms[uri] || 'Unknown Algorithm';
};

const getTransforms = (decoded) => {
    const transforms = decoded.match(/<ds:Transform Algorithm="(.*?)"/g);
    return transforms ? transforms.map(t => {
        const uri = t.match(/Algorithm="(.*?)"/)[1];
        return {
            uri,
            name: mapTransformToName(uri)
        };
    }) : [];
};

const mapTransformToName = (uri) => {
    const transforms = {
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature': 'Enveloped Signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#': 'Exclusive Canonicalization',
        'http://www.w3.org/2001/10/xml-exc-c14n#WithComments': 'Exclusive Canonicalization with Comments'
    };
    return transforms[uri] || 'Unknown Transform';
};

const getDigestMethod = (decoded) => {
    const digestMatch = decoded.match(/<ds:DigestMethod Algorithm="(.*?)"/);
    return digestMatch ? {
        uri: digestMatch[1],
        name: mapDigestToName(digestMatch[1])
    } : null;
};

const mapDigestToName = (uri) => {
    const digests = {
        'http://www.w3.org/2000/09/xmldsig#sha1': 'SHA1',
        'http://www.w3.org/2001/04/xmlenc#sha256': 'SHA256',
        'http://www.w3.org/2001/04/xmldsig-more#sha384': 'SHA384',
        'http://www.w3.org/2001/04/xmlenc#sha512': 'SHA512'
    };
    return digests[uri] || 'Unknown Digest';
};

const verifySignature = (signedInfo, signature, certificate) => {
    const errors = [];
    let certificateStatus = null;

    try {
        if (certificate && signature && signedInfo) {
            const certDer = forge.util.decode64(certificate);
            const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(certDer));
            
            // Create RSA public key from certificate
            const publicKey = cert.publicKey;
            const md = forge.md.sha256.create();
            
            // Update message digest with normalized signed info
            md.update(normalizeXml(signedInfo));
            
            // Verify signature using RSA-SHA256
            const sig = forge.util.decode64(signature);
            const verified = publicKey.verify(md.digest().bytes(), sig);
            
            if (!verified) {
                errors.push('Signature verification failed');
            }
            
            certificateStatus = {
                subject: cert.subject.getField('CN').value,
                issuer: cert.issuer.getField('CN').value,
                validFrom: cert.validity.notBefore,
                validTo: cert.validity.notAfter,
                isExpired: cert.validity.notAfter < new Date(),
                serialNumber: cert.serialNumber,
                signatureAlgorithm: cert.signatureOid
            };
        }
    } catch (e) {
        errors.push(`Verification error: ${e.message}`);
        console.error('Detailed verification error:', e);
    }

    return {
        isValid: errors.length === 0,
        errors,
        certificateStatus
    };
};

const normalizeXml = (xml) => {
    return xml.replace(/\s+/g, ' ')
              .replace(/>\s+</g, '><')
              .replace(/\s+>/g, '>')
              .replace(/<\s+/g, '<')
              .trim();
};
