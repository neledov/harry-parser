import eventlet
eventlet.monkey_patch()

from app import create_app, socketio

application = create_app()
app = application

if __name__ == '__main__':
    app.run()
