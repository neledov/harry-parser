export const generateCurlCommand = ({ request }) => {
    const { method, url, headers, postData } = request;
    let command = `curl -X ${method} "${url}"`;
    
    headers.forEach(header => {
        command += `\n  -H "${header.name}: ${header.value}"`;
    });

    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && postData?.text) {
        command += `\n  -d "${postData.text.replace(/"/g, '\\"')}"`;
    }

    return command;
};
