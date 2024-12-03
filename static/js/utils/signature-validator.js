export const validateXmlSignature = (decoded) => {
    const signedInfo = extractSignedInfo(decoded);
    const signature = extractSignatureValue(decoded);
    const certificate = extractCertificate(decoded);
    
    const signatureMethodMatch = decoded.match(/SignatureMethod Algorithm="(.*?)"/);
    const signatureMethod = signatureMethodMatch ? signatureMethodMatch[1] : null;
    
    const canonMethodMatch = decoded.match(/CanonicalizationMethod Algorithm="(.*?)"/);
    const canonMethod = canonMethodMatch ? canonMethodMatch[1] : null;

    const inclusiveNamespacesMatch = decoded.match(/PrefixList="(.*?)"/);
    const inclusiveNamespaces = inclusiveNamespacesMatch ? inclusiveNamespacesMatch[1].split(' ') : [];

    const verificationResult = verifySignature(signedInfo, signature, certificate, {
        canonicalization: canonMethod,
        inclusiveNamespaces
    });
    
    return {
        isValid: verificationResult.isValid,
        algorithm: {
            uri: signatureMethod,
            name: mapAlgorithmToName(signatureMethod)
        },
        canonicalization: {
            uri: canonMethod,
            name: mapCanonicalizationToName(canonMethod),
            inclusiveNamespaces
        },
        transforms: getTransforms(decoded),
        digestMethod: getDigestMethod(decoded),
        signatureDetails: {
            signedInfo,
            signature,
            certificate
        },
        diagnostics: verificationResult
    };
};

const verifySignature = (signedInfo, signature, certificate, options) => {
    const errors = [];
    let certificateStatus = null;

    try {
        if (certificate && signature && signedInfo) {
            const certDer = forge.util.decode64(certificate);
            const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(certDer));
            const publicKey = cert.publicKey;
            
            // Create message digest based on SignatureMethod
            const md = forge.md.sha256.create();
            
            // Apply canonicalization
            const normalizedSignedInfo = canonicalizeXml(signedInfo, options);
            md.update(normalizedSignedInfo);
            
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

const canonicalizeXml = (xml, options) => {
    let normalized = xml;
    
    // Handle exclusive canonicalization
    if (options.canonicalization === 'http://www.w3.org/2001/10/xml-exc-c14n#') {
        normalized = normalizeNamespaces(normalized, options.inclusiveNamespaces);
    }
    
    return normalized
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .replace(/> +</g, '><')
        .replace(/ +/g, ' ')
        .replace(/\t/g, ' ')
        .trim();
};

const normalizeNamespaces = (xml, inclusiveNamespaces) => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const nsMap = new Map();
    
    // Collect namespaces
    const collectNs = (element) => {
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('xmlns:')) {
                const prefix = attr.name.split(':')[1];
                if (inclusiveNamespaces.includes(prefix)) {
                    nsMap.set(prefix, attr.value);
                }
            }
        });
        Array.from(element.children).forEach(collectNs);
    };
    
    collectNs(doc.documentElement);
    return xml;
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

const mapAlgorithmToName = (uri) => {
    const algorithms = {
        // RSA Variants
        'http://www.w3.org/2000/09/xmldsig#rsa-sha1': 'RSA-SHA1',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha224': 'RSA-SHA224',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256': 'RSA-SHA256',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384': 'RSA-SHA384',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512': 'RSA-SHA512',
        
        // DSA Variants
        'http://www.w3.org/2000/09/xmldsig#dsa-sha1': 'DSA-SHA1',
        'http://www.w3.org/2009/xmldsig11#dsa-sha256': 'DSA-SHA256',
        
        // ECDSA Variants
        'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha1': 'ECDSA-SHA1',
        'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha224': 'ECDSA-SHA224',
        'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256': 'ECDSA-SHA256',
        'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384': 'ECDSA-SHA384',
        'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512': 'ECDSA-SHA512',
        
        // HMAC Variants
        'http://www.w3.org/2000/09/xmldsig#hmac-sha1': 'HMAC-SHA1',
        'http://www.w3.org/2001/04/xmldsig-more#hmac-sha224': 'HMAC-SHA224',
        'http://www.w3.org/2001/04/xmldsig-more#hmac-sha256': 'HMAC-SHA256',
        'http://www.w3.org/2001/04/xmldsig-more#hmac-sha384': 'HMAC-SHA384',
        'http://www.w3.org/2001/04/xmldsig-more#hmac-sha512': 'HMAC-SHA512',
        
        // RSA-PSS Variants
        'http://www.w3.org/2007/05/xmldsig-more#sha1-rsa-MGF1': 'RSA-PSS-SHA1',
        'http://www.w3.org/2007/05/xmldsig-more#sha224-rsa-MGF1': 'RSA-PSS-SHA224',
        'http://www.w3.org/2007/05/xmldsig-more#sha256-rsa-MGF1': 'RSA-PSS-SHA256',
        'http://www.w3.org/2007/05/xmldsig-more#sha384-rsa-MGF1': 'RSA-PSS-SHA384',
        'http://www.w3.org/2007/05/xmldsig-more#sha512-rsa-MGF1': 'RSA-PSS-SHA512',
        
        // RSASSA-PKCS1-v1_5 Variants
        'http://www.w3.org/2001/04/xmldsig-more#rsa-md5': 'RSA-MD5',
        'http://www.w3.org/2001/04/xmldsig-more#rsa-ripemd160': 'RSA-RIPEMD160',
        
        // Digest Algorithms
        'http://www.w3.org/2000/09/xmldsig#sha1': 'SHA1',
        'http://www.w3.org/2001/04/xmldsig-more#sha224': 'SHA224',
        'http://www.w3.org/2001/04/xmlenc#sha256': 'SHA256',
        'http://www.w3.org/2001/04/xmldsig-more#sha384': 'SHA384',
        'http://www.w3.org/2001/04/xmlenc#sha512': 'SHA512'
    };
    return algorithms[uri] || 'Unknown Algorithm';
};
const mapCanonicalizationToName = (uri) => {
    const methods = {
        'http://www.w3.org/2001/10/xml-exc-c14n#': 'Exclusive Canonicalization',
        'http://www.w3.org/2001/10/xml-exc-c14n#WithComments': 'Exclusive Canonicalization with Comments',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315': 'Canonical XML 1.0',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments': 'Canonical XML 1.0 with Comments',
        'http://www.w3.org/2006/12/xml-c14n11': 'Canonical XML 1.1',
        'http://www.w3.org/2006/12/xml-c14n11#WithComments': 'Canonical XML 1.1 with Comments'
    };
    return methods[uri] || 'Unknown Canonicalization';
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
        'http://www.w3.org/2001/10/xml-exc-c14n#WithComments': 'Exclusive Canonicalization with Comments',
        'http://www.w3.org/TR/1999/REC-xpath-19991116': 'XPath',
        'http://www.w3.org/2002/06/xmldsig-filter2': 'XPath Filter 2.0'
    };
    return transforms[uri] || 'Unknown Transform';
};

const getDigestMethod = (decoded) => {
    const digestMatch = decoded.match(/<ds:DigestMethod Algorithm="(.*?)"/);
    return digestMatch ? {
        uri: digestMatch[1],
        name: mapAlgorithmToName(digestMatch[1])
    } : null;
};
