# HARRY - HAR Analyzer

HARRY is a offline web-based HTTP Archive (HAR) file analyzer with special focus on SAML traffic analysis and security assessment.

## Features

- Secure multi-user authentication system
- Real-time HAR file parsing and visualization
- Advanced SAML message analysis and validation
- XML signature verification
- Certificate chain analysis
- Timeline visualization for request/response cycles
- Intelligent request filtering and search capabilities
- Response content search functionality
- Syntax highlighting for various content types
- WebSocket-based streaming for large files

## Technology Stack

- Backend: Flask, SQLAlchemy, Flask-SocketIO
- Frontend: Vanilla JavaScript (ES6+), Chart.js
- Security: Flask-Login, Werkzeug
- Database: SQLite
- Styling: Custom CSS with dark theme

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/harry.git
cd harry
```

2. Create and activate virtual environment:
```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

3. Install dependencies:
```bash
pip install flask flask-sqlalchemy flask-login flask-socketio werkzeug
```

4. Initialize the database:
```bash
python
>>> from app import app, db
>>> with app.app_context():
...     db.create_all()
>>> exit()
```

## Configuration

- Set environment variables:
```bash
export SECRET_KEY='your-secure-secret-key'  # On Windows: set SECRET_KEY=your-secure-secret-key
```

- Default configuration:
  - Upload directory: ./uploads
  - Database: SQLite (harry.db)
  - Logs directory: ./logs

## Running the Application

Development server:
```bash
python app.py
```

Production deployment:
- Use gunicorn with eventlet worker
- Set up reverse proxy (nginx recommended)
- Configure SSL/TLS

## Security Features

- Secure password hashing using Werkzeug
- Per-user file isolation
- SAML security analysis
  - XML signature validation
  - Certificate validation
  - Encryption verification
  - Security algorithm assessment

## File Structure

- /static
  - /js: Frontend JavaScript modules
  - /css: Styling
- /templates: Jinja2 templates
- /uploads: User HAR files
- /logs: Application logs

## Usage

1. Register an account
2. Upload HAR files through web interface
3. Analyze requests, responses, and SAML messages
4. Use filters and search to find specific traffic
5. View detailed timing information and security analysis

## Development

- JavaScript modules use ES6 import/export
- WebSocket handles real-time data streaming
- Modular design for easy extension
- Custom event handling for UI interactions

## License

MIT License

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## Support

File issues through the GitHub issue tracker
