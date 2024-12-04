# HARRY Parser

![HARRY Parser](https://img.shields.io/badge/HARRY-Parser-89CFF0?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

HARRY Parser is a sophisticated HAR (HTTP Archive) file analyzer with special focus on SAML protocol analysis and visualization. Built with modern web technologies, it provides an intuitive interface for developers and security professionals to inspect network traffic and SAML authentication flows.

## 🚀 Features

- **HAR File Analysis**
  - Detailed request/response inspection
  - Timeline visualization of network requests
  - Advanced filtering and search capabilities
  - cURL command generation

- **SAML Analysis**
  - Deep SAML message parsing
  - XML signature validation
  - Certificate analysis and validation
  - Encryption verification
  - Security assessment reporting

- **User Experience**
  - Dark mode interface
  - Real-time filtering
  - Keyboard navigation
  - One-click copy functionality
  - Responsive design

## 🛠 Technology Stack

- **Backend**: Flask, SQLAlchemy
- **Frontend**: Vanilla JavaScript (ES6+), Chart.js
- **Security**: Flask-Login, Werkzeug
- **Styling**: Modern CSS with Grid/Flexbox

## 🚦 Getting Started

1. Clone the repository:
\`\`\`bash
git clone https://github.com/neledov/harry-parser.git
\`\`\`

2. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

3. Set up environment variables:
\`\`\`bash
export SECRET_KEY="your-secret-key"
\`\`\`

4. Initialize the database:
\`\`\`bash
flask db upgrade
\`\`\`

5. Run the application:
\`\`\`bash
flask run
\`\`\`

## 💡 Usage

1. Register/Login to your account
2. Upload HAR files through the intuitive interface
3. Navigate through requests using the left panel
4. Analyze detailed request/response information
5. Inspect SAML messages with security analysis
6. Export requests as cURL commands

## 🔒 Security Features

- Secure file handling
- User authentication and authorization
- SAML security validation
- Certificate chain verification
- Encryption analysis
- XML signature validation

## 🎯 Use Cases

- API debugging and testing
- SAML integration troubleshooting
- Security audit and compliance
- Network traffic analysis
- Performance monitoring

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## �� License

This project is licensed under the MIT License - see the LICENSE file for details.

## ✨ Author

**Anton Neledov**
- GitHub: [@neledov](https://github.com/neledov)

## 🙏 Acknowledgments

Special thanks to all contributors and the open-source community for making this project possible.

---

Made with ❤️ by Anton Neledov
