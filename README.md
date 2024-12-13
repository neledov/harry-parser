# HARRY - HAR Request Analyzer
```
 ____   ____
/  0 \_/  0 \_______
\___/  \___/       \\ 
                HARRY
  ```
A web application for analyzing HTTP Archive (HAR) files with special focus on SAML request analysis and network performance metrics.

## Features

- Real-time HAR file parsing and analysis
- SAML request detection and detailed analysis
- Network performance visualization
- Certificate validation and analysis
- Encryption strength assessment
- Timeline visualization for request lifecycle
- Advanced filtering and search capabilities
- Concurrent connection analysis
- WebSocket-based streaming for large files
- Offline support with IndexedDB caching

### Technical Highlights

- WebSocket streaming for efficient data transfer
- Event-driven architecture
- Modular JavaScript with clear separation of concerns
- Responsive visualization using Chart.js
- Efficient caching with IndexedDB
- GZIP compression support
- Multi-user support with authentication

## Tech Stack

- Backend: Flask, Python 3.8+
- Frontend: Vanilla JavaScript (ES6+)
- Database: SQLite, IndexedDB
- WebSocket: Flask-SocketIO
- Authentication: Flask-Login
- Visualization: Chart.js
- Styling: Custom CSS

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/neledov/harry-parser.git
   cd harry-parser
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv env
   source env/bin/activate  # On Windows: env\\Scripts\\activate
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
5. Run the application:
```bash
flask run
```  
## Configuration

Create a \`config.json\` file in the root directory to configure server settings:

```json
{
    "host": "127.0.0.1",
    "port": 8443
}
```

### Configuration Options

#### Server Settings
- `host`: Server address (default: 127.0.0.1)
  - Use "0.0.0.0" to accept connections from any IP
  - Use specific IP for restricted access
  
- `port`: Server port (default: 8443)
  - Ports below 1024 require root privileges
  - Common alternative ports: 8443, 8080, 3000

Examples:

Local development:
```json
{
    "host": "127.0.0.1",
    "port": 8443
}
```

Production deployment:
```json
{
    "host": "0.0.0.0",
    "port": 443
}
```

## Development

The project follows a modular architecture:

```
HAR_Analyzer/
├── app/                              # Main application package
│   ├── __init__.py                  # App initialization, configuration, and extensions
│   ├── models.py                    # Database models for User and HARFile
│   ├── routes.py                    # HTTP route handlers and view functions
│   ├── socket_events.py             # WebSocket event handlers for real-time updates
│   ├── utils.py                     # General Python utility functions
│   ├── static/
│   │   ├── js/
│   │   │   ├── analyzers/           # Analysis modules for different aspects
│   │   │   │   ├── certificate-analyzer.js    # X.509 certificate validation and parsing
│   │   │   │   ├── encryption-analyzer.js     # Encryption methods and strength analysis
│   │   │   │   ├── saml-security-analyzer.js  # SAML security validation
│   │   │   │   └── timing-analyzer.js         # Network timing and performance metrics
│   │   │   ├── core/                # Core application functionality
│   │   │   │   ├── common-utils.js           # Shared utility functions
│   │   │   │   ├── har-socket-client.js      # WebSocket client implementation
│   │   │   │   └── indexed-db-manager.js     # Client-side storage management
│   │   │   ├── handlers/            # Event and interaction handlers
│   │   │   │   ├── file-upload-handler.js    # HAR file upload processing
│   │   │   │   └── request-handler.js        # HTTP request processing
│   │   │   ├── utils/               # Specialized utility modules
│   │   │   │   ├── saml-detector.js          # SAML request/response detection
│   │   │   │   ├── saml-parser.js            # SAML message parsing
│   │   │   │   └── signature-validator.js     # XML signature validation
│   │   │   ├── visualization/       # Data visualization components
│   │   │   │   ├── timeline-chart.js         # Request timeline charting
│   │   │   │   └── request-detail-renderer.js # Request details HTML generation
│   │   │   ├── bundle.js            # Main JavaScript bundle entry point
│   │   │   ├── main.js              # Application initialization
│   │   │   └── preload.js           # Pre-initialization and resource loading
│   │   └── css/
│   │       └── style.css            # Application styling and themes
│   └── templates/                    # Jinja2 HTML templates
│       ├── base.html                # Base template with common structure
│       ├── login.html               # User authentication page
│       ├── macros.html              # Reusable template components
│       ├── processing.html          # File processing status page
│       ├── register.html            # User registration page
│       ├── requests.html            # Request analysis main view
│       └── upload.html              # File upload interface
├── migrations/                       # Database migration scripts
│   └── versions/                    # Individual migration versions
├── .gitignore                       # Git ignore patterns
├── README.md                        # Project documentation
├── requirements.txt                 # Python dependencies
└── run.py                          # Application entry point

```

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Anton Neledov - [@neledov](https://github.com/neledov)

## Acknowledgments

- HAR Specification Working Group
- SAML 2.0 specifications
- Chart.js community
