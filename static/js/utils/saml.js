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
    if (xmlDoc.getElementsByTagName('samlp:Response').length > 0) return 'Response';
    if (xmlDoc.getElementsByTagName('samlp:Request').length > 0) return 'Request';
    if (xmlDoc.getElementsByTagName('samlp:AuthnRequest').length > 0) return 'AuthnRequest';
    return 'Unknown';
};

const extractIssuer = (xmlDoc) => {
    const issuerNode = xmlDoc.getElementsByTagName('saml:Issuer')[0];
    return issuerNode ? issuerNode.textContent : null;
};

const extractAttributes = (xmlDoc) => {
    const attributes = [];
    const attrStatements = xmlDoc.getElementsByTagName('saml:AttributeStatement');
    
    for (const statement of attrStatements) {
        const attrs = statement.getElementsByTagName('saml:Attribute');
        for (const attr of attrs) {
            attributes.push({
                name: attr.getAttribute('Name'),
                values: Array.from(attr.getElementsByTagName('saml:AttributeValue'))
                           .map(value => value.textContent)
            });
        }
    }
    return attributes;
};

const extractConditions = (xmlDoc) => {
    const conditionsNode = xmlDoc.getElementsByTagName('saml:Conditions')[0];
    if (!conditionsNode) return null;

    return {
        notBefore: conditionsNode.getAttribute('NotBefore'),
        notOnOrAfter: conditionsNode.getAttribute('NotOnOrAfter'),
        audiences: Array.from(conditionsNode.getElementsByTagName('saml:AudienceRestriction'))
                      .map(ar => ar.getElementsByTagName('saml:Audience')[0]?.textContent)
                      .filter(Boolean)
    };
};

const extractAuthStatements = (xmlDoc) => {
    return Array.from(xmlDoc.getElementsByTagName('saml:AuthnStatement'))
        .map(statement => ({
            authnInstant: statement.getAttribute('AuthnInstant'),
            sessionIndex: statement.getAttribute('SessionIndex'),
            authnContext: statement.getElementsByTagName('saml:AuthnContext')[0]
                ?.getElementsByTagName('saml:AuthnContextClassRef')[0]?.textContent
        }));
};

const extractAssertions = (xmlDoc) => {
    return Array.from(xmlDoc.getElementsByTagName('saml:Assertion'))
        .map(assertion => ({
            id: assertion.getAttribute('ID'),
            issueInstant: assertion.getAttribute('IssueInstant'),
            version: assertion.getAttribute('Version')
        }));
};
