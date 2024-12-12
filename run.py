import os
from app import create_app, socketio
from app.utils import generate_certificates

if __name__ == '__main__':
    app = create_app()

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs('logs', exist_ok=True)

    if not os.path.exists('cert.pem'):
        generate_certificates()

    socketio.run(app,
                 debug=True,
                 certfile='cert.pem',
                 keyfile='key.pem',
                 host='127.0.0.1',
                 port=8443)
