import os
import logging
from pathlib import Path
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
from flask_httpauth import HTTPBasicAuth
from werkzeug.security import check_password_hash
from app.models import db, User, HARFile
from app.utils import allowed_file

main = Blueprint('main', __name__, template_folder='templates', static_folder='static')
basic_auth = HTTPBasicAuth()

if not os.path.exists('logs'):
    os.makedirs('logs')
logging.basicConfig(filename='logs/harry_parser.log', level=logging.INFO,
                    format='%(asctime)s %(levelname)s:%(message)s')

def get_user_files(user_id):
    return HARFile.query.filter_by(user_id=user_id).all()

def handle_file_upload(file, user):
    filename = secure_filename(file.filename)
    
    # Check and remove existing file
    existing_file = HARFile.query.filter_by(
        filename=filename,
        user_id=user.id
    ).first()

    if existing_file:
        filepath = os.path.join(user.get_user_upload_folder(), filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        db.session.delete(existing_file)
        db.session.commit()

    # Save new file
    user_upload_dir = user.get_user_upload_folder()
    Path(user_upload_dir).mkdir(parents=True, exist_ok=True)
    filepath = os.path.join(user_upload_dir, filename)

    file.save(filepath)
    file_size = os.path.getsize(filepath)

    # Create new database entry
    har_file = HARFile(
        filename=filename,
        filesize=file_size,
        user_id=user.id
    )
    db.session.add(har_file)
    db.session.commit()

    return filename, file_size

@basic_auth.verify_password
def verify_password(username, password):
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return user

@main.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.upload_file'))

    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and user.check_password(request.form['password']):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page if next_page else url_for('main.upload_file'))
        flash('Invalid username or password')
    return render_template('login.html', app_name='HARRY')

@main.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.upload_file'))

    if request.method == 'POST':
        if User.query.filter_by(username=request.form['username']).first():
            flash('Username already exists')
            return redirect(url_for('main.register'))

        if User.query.filter_by(email=request.form['email']).first():
            flash('Email already registered')
            return redirect(url_for('main.register'))

        user = User(username=request.form['username'], email=request.form['email'])
        user.set_password(request.form['password'])
        db.session.add(user)
        db.session.commit()
        flash('Registration successful')
        return redirect(url_for('main.login'))
    return render_template('register.html', app_name='HARRY')

@main.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.login'))

@main.route('/', methods=['GET', 'POST'])
@login_required
def upload_file():
    if request.method == 'POST':
        if 'harfile' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['harfile']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file'}), 400

        try:
            filename, _ = handle_file_upload(file, current_user)
            logging.info(f"User {current_user.username} uploaded HAR file: {filename}")
            return jsonify({'filename': filename, 'success': True})
        except Exception as e:
            logging.error(f"Upload error: {str(e)}")
            return jsonify({'error': 'Upload failed'}), 500

    user_files = get_user_files(current_user.id)
    return render_template('upload.html', app_name='HARRY', files=user_files)

@main.route('/delete/<filename>', methods=['DELETE'])
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

@main.route('/processing/<filename>')
@login_required
def processing(filename):
    return render_template('processing.html', app_name='HARRY', filename=filename)

@main.route('/requests/<filename>')
@login_required
def requests_page(filename):
    har_file = HARFile.query.filter_by(
        filename=filename,
        user_id=current_user.id
    ).first()

    if not har_file:
        flash('File not found or access denied.')
        return redirect(url_for('main.upload_file'))

    return render_template('requests.html', app_name='HARRY', filename=filename)

@main.route('/api/v1/upload', methods=['POST'])
@basic_auth.login_required
def api_v1_upload_file():
    if 'harfile' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['harfile']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400

    try:
        user = basic_auth.current_user()
        filename, _ = handle_file_upload(file, user)
        processing_url = url_for('main.requests_page', filename=filename, _external=True)
        return jsonify({
            'success': True,
            'filename': filename,
            'processing_url': processing_url
        })
    except Exception as e:
        logging.error(f"API upload error: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500
