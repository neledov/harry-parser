export const decodeCertificate = (certData) => {
    // Remove headers, footers, and whitespace
    const cleanCert = certData.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '');
    
    try {
        // Convert base64 to binary ASN.1 structure
        const binaryDer = atob(cleanCert);
        const asn1 = forge.asn1.fromDer(binaryDer);
        const cert = forge.pki.certificateFromAsn1(asn1);

        return {
            subject: formatDN(cert.subject.attributes),
            issuer: formatDN(cert.issuer.attributes),
            validity: {
                notBefore: cert.validity.notBefore,
                notAfter: cert.validity.notAfter
            },
            serialNumber: cert.serialNumber,
            fingerprints: {
                sha1: calculateFingerprint(cert, 'sha1'),
                sha256: calculateFingerprint(cert, 'sha256')
            },
            publicKey: {
                algorithm: cert.publicKey.algorithm,
                keySize: cert.publicKey.n.bitLength()
            },
            extensions: formatExtensions(cert.extensions),
            signatureAlgorithm: cert.signatureOid,
            isExpired: cert.validity.notAfter < new Date(),
            isNotYetValid: cert.validity.notBefore > new Date()
        };
    } catch (e) {
        console.error('Certificate parsing error:', e);
        return null;
    }
};

const formatDN = (attributes) => {
    return attributes.reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
    }, {});
};

const calculateFingerprint = (cert, algorithm) => {
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert));
    const md = forge.md[algorithm].create();
    md.update(der.getBytes());
    return md.digest().toHex();
};

const formatExtensions = (extensions) => {
    return extensions.reduce((acc, ext) => {
        acc[ext.name] = ext.value;
        return acc;
    }, {});
};
