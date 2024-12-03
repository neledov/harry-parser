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
        assertions: extractAssertions(xmlDoc)
    };
};

const getSamlType = (xmlDoc) => {
    if (xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'Response').length > 0) return 'Response';
    if (xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'Request').length > 0) return 'Request';
    if (xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'AuthnRequest').length > 0) return 'AuthnRequest';
    if (xmlDoc.getElementsByTagName('samlp:Response').length > 0) return 'Response';
    if (xmlDoc.getElementsByTagName('saml2p:Response').length > 0) return 'Response';
    if (xmlDoc.getElementsByTagName('samlp:Request').length > 0) return 'Request';
    if (xmlDoc.getElementsByTagName('samlp:AuthnRequest').length > 0) return 'AuthnRequest';
    return 'Unknown';
};

const extractIssuer = (xmlDoc) => {
    const issuerNode = 
        xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer')[0] ||
        xmlDoc.getElementsByTagName('saml:Issuer')[0] ||
        xmlDoc.getElementsByTagName('saml2:Issuer')[0];
    return issuerNode ? issuerNode.textContent : null;
};

const extractAttributes = (xmlDoc) => {
    const attributes = [];
    const attrStatements = [
        ...Array.from(xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml:AttributeStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml2:AttributeStatement'))
    ];
    
    for (const statement of attrStatements) {
        const attrs = [
            ...Array.from(xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Attribute')),
            ...Array.from(statement.getElementsByTagName('saml:Attribute')),
            ...Array.from(statement.getElementsByTagName('saml2:Attribute'))
        ];
        for (const attr of attrs) {
            attributes.push({
                name: attr.getAttribute('Name'),
                values: Array.from(attr.getElementsByTagName('saml:AttributeValue'))
                           .concat(Array.from(attr.getElementsByTagName('saml2:AttributeValue')))
                           .concat(Array.from(attr.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeValue')))
                           .map(value => value.textContent)
            });
        }
    }
    return attributes;
};

const extractConditions = (xmlDoc) => {
    const conditionsNode = 
        xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Conditions')[0] ||
        xmlDoc.getElementsByTagName('saml:Conditions')[0] ||
        xmlDoc.getElementsByTagName('saml2:Conditions')[0];
    if (!conditionsNode) return null;

    return {
        notBefore: conditionsNode.getAttribute('NotBefore'),
        notOnOrAfter: conditionsNode.getAttribute('NotOnOrAfter'),
        audiences: Array.from(conditionsNode.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AudienceRestriction'))
                      .concat(Array.from(conditionsNode.getElementsByTagName('saml:AudienceRestriction')))
                      .concat(Array.from(conditionsNode.getElementsByTagName('saml2:AudienceRestriction')))
                      .map(ar => {
                          const audience = ar.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Audience')[0] ||
                                         ar.getElementsByTagName('saml:Audience')[0] ||
                                         ar.getElementsByTagName('saml2:Audience')[0];
                          return audience?.textContent;
                      })
                      .filter(Boolean)
    };
};

const extractAuthStatements = (xmlDoc) => {
    const statements = [
        ...Array.from(xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AuthnStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml:AuthnStatement')),
        ...Array.from(xmlDoc.getElementsByTagName('saml2:AuthnStatement'))
    ];
    
    return statements.map(statement => ({
        authnInstant: statement.getAttribute('AuthnInstant'),
        sessionIndex: statement.getAttribute('SessionIndex'),
        authnContext: (
            statement.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AuthnContextClassRef')[0] ||
            statement.getElementsByTagName('saml:AuthnContextClassRef')[0] ||
            statement.getElementsByTagName('saml2:AuthnContextClassRef')[0]
        )?.textContent
    }));
};

const extractAssertions = (xmlDoc) => {
    const assertions = [
        ...Array.from(xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Assertion')),
        ...Array.from(xmlDoc.getElementsByTagName('saml:Assertion')),
        ...Array.from(xmlDoc.getElementsByTagName('saml2:Assertion'))
    ];
    
    return assertions.map(assertion => ({
        id: assertion.getAttribute('ID'),
        issueInstant: assertion.getAttribute('IssueInstant'),
        version: assertion.getAttribute('Version')
    }));
};
