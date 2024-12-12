import os
import json
from app import create_app, socketio
from app.utils import generate_certificates

DEFAULT_HOST = '127.0.0.1'
DEFAULT_PORT = 8443

def load_config():
    config_path = 'config.json'
    if not os.path.exists(config_path):
        return DEFAULT_HOST, DEFAULT_PORT
    
    try:
        with open(config_path, 'r') as f:
            config_data = json.load(f)
        # Extract host and port with defaults if not found
        host = config_data.get('host', DEFAULT_HOST)
        port = config_data.get('port', DEFAULT_PORT)
        
        # Validate port is an integer
        if not isinstance(port, int):
            port = DEFAULT_PORT
        
        return host, port
    except (json.JSONDecodeError, OSError):
        # If file can't be read or JSON is invalid, use defaults
        return DEFAULT_HOST, DEFAULT_PORT

if __name__ == '__main__':
    app = create_app()

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs('logs', exist_ok=True)

    if not os.path.exists('cert.pem'):
        generate_certificates()

    host, port = load_config()
    socketio.run(app,
                 debug=True,
                 certfile='cert.pem',
                 keyfile='key.pem',
                 host=host,
                 port=port)
