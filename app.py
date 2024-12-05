from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_socketio import SocketIO, emit
from models import db, User, HARFile
import os
import json
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
from pathlib import Path

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_default_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///harry.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
ALLOWED_EXTENSIONS = {'har'}

db.init_app(app)
socketio = SocketIO(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

if not os.path.exists('logs'):
    os.makedirs('logs')
logging.basicConfig(filename='logs/harry_parser.log', level=logging.INFO,
                    format='%(asctime)s %(levelname)s:%(message)s')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_files(user_id):
    return HARFile.query.filter_by(user_id=user_id).all()

@socketio.on('connect')
def handle_connect():
    logging.info(f"Client connected: {request.sid}")

@socketio.on('request_har_data')
def handle_har_request(data):
    if not current_user.is_authenticated:
        emit('error', {'message': 'Authentication required'})
        return

    filename = data.get('filename')
    har_file = HARFile.query.filter_by(
        filename=filename,
        user_id=current_user.id
    ).first()
    
    if not har_file:
        emit('error', {'message': 'File not found or access denied'})
        return
        
    filepath = os.path.join(current_user.get_user_upload_folder(), filename)
    if not os.path.exists(filepath):
        emit('error', {'message': 'File not found'})
        return

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            har_data = json.load(f)
            entries = har_data.get('log', {}).get('entries', [])
            
            # Stream entries in chunks
            chunk_size = 50
            total_entries = len(entries)
            
            for i in range(0, total_entries, chunk_size):
                chunk = entries[i:i + chunk_size]
                emit('har_data_chunk', {
                    'chunk': chunk,
                    'progress': (i + len(chunk)) / total_entries * 100,
                    'isLast': (i + chunk_size) >= total_entries,
                    'totalEntries': total_entries
                })
                
            logging.info(f"User {current_user.username} streamed HAR file: {filename}")
    except Exception as e:
        logging.error(f"Error streaming HAR file {filename}: {str(e)}")
        emit('error', {'message': 'Error processing HAR file'})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('upload_file'))
    
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and user.check_password(request.form['password']):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page if next_page else url_for('upload_file'))
        flash('Invalid username or password')
    return render_template('login.html', app_name='HARRY')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('upload_file'))
    
    if request.method == 'POST':
        if User.query.filter_by(username=request.form['username']).first():
            flash('Username already exists')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=request.form['email']).first():
            flash('Email already registered')
            return redirect(url_for('register'))
        
        user = User(username=request.form['username'], email=request.form['email'])
        user.set_password(request.form['password'])
        db.session.add(user)
        db.session.commit()
        flash('Registration successful')
        return redirect(url_for('login'))
    return render_template('register.html', app_name='HARRY')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/', methods=['GET', 'POST'])
@login_required
def upload_file():
    if request.method == 'POST':
        if 'harfile' not in request.files:
            flash('No file part')
            return redirect(request.url)
            
        file = request.files['harfile']
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            
            user_upload_dir = current_user.get_user_upload_folder()
            Path(user_upload_dir).mkdir(parents=True, exist_ok=True)
            
            filepath = os.path.join(user_upload_dir, filename)
            file.save(filepath)
            
            filesize = os.path.getsize(filepath)
            
            har_file = HARFile(
                filename=filename,
                filesize=filesize,
                user_id=current_user.id
            )
            db.session.add(har_file)
            db.session.commit()
            
            logging.info(f"User {current_user.username} uploaded HAR file: {filename}")
            return redirect(url_for('processing', filename=filename))
            
        flash('Invalid file type. Please upload a .har file.')
        return redirect(request.url)
        
    user_files = get_user_files(current_user.id)
    return render_template('upload.html', app_name='HARRY', files=user_files)

@app.route('/delete/<filename>', methods=['DELETE'])
@login_required
def delete_file(filename):
    har_file = HARFile.query.filter_by(
        filename=filename,
        user_id=current_user.id
    ).first()
    
    if not har_file:
        return jsonify({'success': False, 'error': 'File not found or access denied'}), 403
        
    filepath = os.path.join(current_user.get_user_upload_folder(), filename)
    
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
        db.session.delete(har_file)
        db.session.commit()
        logging.info(f"User {current_user.username} deleted file: {filename}")
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error deleting file {filename}: {str(e)}")
        return jsonify({'success': False, 'error': 'Error deleting file'}), 500

@app.route('/processing/<filename>')
@login_required
def processing(filename):
    return render_template('processing.html', app_name='HARRY', filename=filename)

@app.route('/requests/<filename>')
@login_required
def requests_page(filename):
    har_file = HARFile.query.filter_by(
        filename=filename,
        user_id=current_user.id
    ).first()
    
    if not har_file:
        flash('File not found or access denied.')
        return redirect(url_for('upload_file'))
        
    return render_template('requests.html', 
                         app_name='HARRY', 
                         filename=filename)

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    socketio.run(app, debug=True)
