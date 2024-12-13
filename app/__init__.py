import os
import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_compress import Compress
from flask_login import LoginManager
from flask_socketio import SocketIO
from app.models import db, User

# Extensions instances
socketio = SocketIO()
login_manager = LoginManager()
compress = Compress()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_default_secret_key')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///harry.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
    app.config['COMPRESS_ALGORITHM'] = 'gzip'
    app.config['COMPRESS_MIMETYPES'] = [
        'text/html', 'text/css', 'text/xml',
        'application/json', 'application/javascript',
        'application/x-javascript', 'application/xml',
        'application/samlrequest'
    ]
    app.config['COMPRESS_LEVEL'] = 9
    app.config['COMPRESS_MIN_SIZE'] = 500

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'
    compress.init_app(app)
    socketio.init_app(app,
                      async_mode='eventlet',
                      ping_timeout=60,
                      ping_interval=25,
                      max_http_buffer_size=1e8,
                      cors_allowed_origins="*")

    # Register Blueprints or routes
    from app.routes import main as main_blueprint
    app.register_blueprint(main_blueprint)

    from app.socket_events import register_socket_events
    register_socket_events(socketio)

    return app
