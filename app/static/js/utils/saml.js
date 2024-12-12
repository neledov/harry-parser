export const decodeSamlMessage = (encodedData) => {
    const cleaned = encodedData.replace(/\s/g, '+')
                             .replace(/%2B/g, '+')
                             .replace(/%3D/g, '=');
    try {
        return atob(cleaned);
    } catch (e) {
        return null;
    }
};

export const parseSamlXml = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    return {
        type: getSamlType(xmlDoc),
        issuer: extractIssuer(xmlDoc),
        attributes: extractAttributes(xmlDoc),
        conditions: extractConditions(xmlDoc),
        authStatements: extractAuthStatements(xmlDoc),
        assertions: extractAssertions(xmlDoc),
        destination: getDestination(xmlDoc),
        id: getResponseID(xmlDoc)
    };
};

const getDestination = (xmlDoc) => {
    const response = xmlDoc.documentElement;
    return response.getAttribute('Destination');
};

const getResponseID = (xmlDoc) => {
    const response = xmlDoc.documentElement;
    return response.getAttribute('ID');
};

const getSamlType = (xmlDoc) => {
    // Check for SAML 2.0 namespace first
    const saml2Response = xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'Response');
    const saml2Request = xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'AuthnRequest');
    
    if (saml2Response.length > 0) return 'Response';
    if (saml2Request.length > 0) return 'AuthnRequest';
    
    // Fallback to tag name checks
    if (xmlDoc.getElementsByTagName('saml2p:Response').length > 0) return 'Response';
    if (xmlDoc.getElementsByTagName('samlp:Response').length > 0) return 'Response';
    if (xmlDoc.getElementsByTagName('saml2p:AuthnRequest').length > 0) return 'AuthnRequest';
    if (xmlDoc.getElementsByTagName('samlp:AuthnRequest').length > 0) return 'AuthnRequest';
    
    return 'Unknown';
};

const extractIssuer = (xmlDoc) => {
    const issuerNode = 
        xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer')[0] ||
        xmlDoc.getElementsByTagName('saml2:Issuer')[0] ||
        xmlDoc.getElementsByTagName('saml:Issuer')[0];
    return issuerNode ? issuerNode.textContent : null;
};

const extractAttributes = (xmlDoc) => {
    const attributes = new Map(); // Use Map to prevent duplicates
    
    const attrStatements = [
        ...Array.from(xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml2:AttributeStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml:AttributeStatement'))
    ];
    
    for (const statement of attrStatements) {
        const attrs = [
            ...Array.from(statement.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Attribute')),
            ...Array.from(statement.getElementsByTagName('saml2:Attribute')),
            ...Array.from(statement.getElementsByTagName('saml:Attribute'))
        ];
        
        for (const attr of attrs) {
            const name = attr.getAttribute('Name');
            const values = [
                ...Array.from(attr.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeValue')),
                ...Array.from(attr.getElementsByTagName('saml2:AttributeValue')),
                ...Array.from(attr.getElementsByTagName('saml:AttributeValue'))
            ].map(value => value.textContent);
            
            // Use Set to remove duplicates within values
            const uniqueValues = [...new Set(values)];
            attributes.set(name, uniqueValues);
        }
    }
    
    return Array.from(attributes).map(([name, values]) => ({
        name,
        values
    }));
};

const extractConditions = (xmlDoc) => {
    const conditionsNode = 
        xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Conditions')[0] ||
        xmlDoc.getElementsByTagName('saml2:Conditions')[0] ||
        xmlDoc.getElementsByTagName('saml:Conditions')[0];
    
    if (!conditionsNode) return null;

    // Use Set for unique audience values
    const audienceSet = new Set();
    
    const audienceRestrictions = [
        ...Array.from(conditionsNode.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AudienceRestriction')),
        ...Array.from(conditionsNode.getElementsByTagName('saml2:AudienceRestriction')),
        ...Array.from(conditionsNode.getElementsByTagName('saml:AudienceRestriction'))
    ];

    audienceRestrictions.forEach(ar => {
        const audiences = [
            ...Array.from(ar.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Audience')),
            ...Array.from(ar.getElementsByTagName('saml2:Audience')),
            ...Array.from(ar.getElementsByTagName('saml:Audience'))
        ];
        audiences.forEach(audience => {
            if (audience.textContent) {
                audienceSet.add(audience.textContent);
            }
        });
    });

    return {
        notBefore: conditionsNode.getAttribute('NotBefore'),
        notOnOrAfter: conditionsNode.getAttribute('NotOnOrAfter'),
        audiences: [...audienceSet]
    };
};

const extractAuthStatements = (xmlDoc) => {
    const statements = [
        ...Array.from(xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AuthnStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml2:AuthnStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml:AuthnStatement'))
    ];
    
    return statements.map(statement => ({
        authnInstant: statement.getAttribute('AuthnInstant'),
        sessionIndex: statement.getAttribute('SessionIndex'),
        authnContext: (
            statement.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AuthnContextClassRef')[0] ||
            statement.getElementsByTagName('saml2:AuthnContextClassRef')[0] ||
            statement.getElementsByTagName('saml:AuthnContextClassRef')[0]
        )?.textContent
    }));
};

const extractAssertions = (xmlDoc) => {
    const assertions = [
        ...Array.from(xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Assertion')),
        ...Array.from(xmlDoc.getElementsByTagName('saml2:Assertion')),
        ...Array.from(xmlDoc.getElementsByTagName('saml:Assertion'))
    ];
    
    return assertions.map(assertion => ({
        id: assertion.getAttribute('ID'),
        issueInstant: assertion.getAttribute('IssueInstant'),
        version: assertion.getAttribute('Version')
    }));
};
