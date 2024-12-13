export const handleEncryptedAssertion = (decoded) => {
    const encryptedData = extractEncryptedData(decoded);
    const encryptionMethod = getEncryptionMethod(decoded);
    const keyInfo = extractKeyInfo(decoded);
    
    return {
        encryptedData,
        method: encryptionMethod,
        keyInfo,
        algorithms: {
            data: getDataEncryptionAlgorithm(decoded),
            key: getKeyEncryptionAlgorithm(decoded)
        }
    };
};

const extractEncryptedData = (decoded) => {
    const match = decoded.match(/<xenc:EncryptedData.*?>(.*?)<\/xenc:EncryptedData>/s);
    return match ? match[1] : null;
};

const getEncryptionMethod = (decoded) => {
    const match = decoded.match(/<xenc:EncryptionMethod Algorithm="(.*?)"/);
    return match ? match[1] : null;
};

const extractKeyInfo = (decoded) => {
    const match = decoded.match(/<ds:KeyInfo>(.*?)<\/ds:KeyInfo>/s);
    return match ? match[1] : null;
};

const getDataEncryptionAlgorithm = (decoded) => {
    const match = decoded.match(/<xenc:EncryptionMethod Algorithm="(.*?)"/);
    return match ? {
        algorithm: match[1],
        strength: getAlgorithmStrength(match[1])
    } : null;
};

const getKeyEncryptionAlgorithm = (decoded) => {
    const match = decoded.match(/<xenc:EncryptedKey.*?<xenc:EncryptionMethod Algorithm="(.*?)"/s);
    return match ? {
        algorithm: match[1],
        strength: getAlgorithmStrength(match[1])
    } : null;
};

const getAlgorithmStrength = (algorithm) => {
    const strengthMap = {
        'http://www.w3.org/2001/04/xmlenc#aes256-cbc': 256,
        'http://www.w3.org/2001/04/xmlenc#aes192-cbc': 192,
        'http://www.w3.org/2001/04/xmlenc#aes128-cbc': 128,
        'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p': 'RSA',
        'http://www.w3.org/2001/04/xmlenc#rsa-1_5': 'RSA-Legacy'
    };
    return strengthMap[algorithm] || 'Unknown';
};
