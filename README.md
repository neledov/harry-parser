# HARRY - HAR Analyzer

HARRY is a powerful web-based HTTP Archive (HAR) file analyzer with special features for SAML traffic analysis and security assessment.

## Features

- 🔒 Secure user authentication and file management
- 📊 Interactive HAR file visualization
- 🔍 Advanced filtering and search capabilities
- 🛡️ SAML traffic analysis and security validation
- 📜 Certificate validation and analysis
- 🔐 XML signature verification
- 📋 One-click cURL command generation
- ⏱️ Request timeline visualization
- 🔄 Real-time WebSocket updates

## Prerequisites

- Python 3.12+
- Flask and dependencies
- SQLite3
- Modern web browser with JavaScript enabled

## Installation

1. Clone the repository:
```bash
git clone https://github.com/neledov/harry-parser.git
cd harry-parser
```

2. Create and activate virtual environment:
```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Initialize the database:
```bash
python
>>> from app import app, db
>>> with app.app_context():
...     db.create_all()
>>> exit()
```

## Running the Application

Start the server:
```bash
python app.py
```

Access the application at 'http://localhost:5000'

## Project Structure

```
harry/
├── app.py                 # Main Flask application
├── models.py              # Database models
├── requirements.txt       # Project dependencies
├── static/
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   └── js/
│       ├── bundle.js     # Main JavaScript bundle
│       ├── handlers/
│       │   └── requests.js
│       ├── utils/
│       │   ├── certificate-analyzer.js
│       │   ├── curl.js
│       │   ├── encryption-handler.js
│       │   ├── helpers.js
│       │   ├── html.js
│       │   ├── saml-analyzer.js
│       │   ├── saml-detector.js
│       │   ├── saml.js
│       │   └── signature-validator.js
│       ├── visualization/
│       │   └── chart.js
│       ├── main.js
│       ├── preload.js
│       └── websocket.js
├── templates/
│   ├── base.html         # Base template
│   ├── login.html        # Login page
│   ├── macros.html       # Reusable template components
│   ├── processing.html   # Processing status page
│   ├── register.html     # Registration page
│   ├── requests.html     # Main analysis view
│   └── upload.html       # File upload page
└── uploads/              # User uploaded files directory
```

## Key Features

### HAR Analysis
- Real-time HAR file parsing
- Interactive request/response viewer
- Timeline visualization
- Advanced filtering and search

### SAML Analysis
- SAML message detection and decoding
- Security validation
- Certificate analysis
- XML signature verification
- Encryption validation

### Security
- User authentication
- Secure file storage
- Per-user file isolation
- Input validation
- XSS protection

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

