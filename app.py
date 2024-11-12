# app.py

import os
import uuid
import json
import logging
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename  # Ensure secure_filename is imported

app = Flask(__name__)
app.secret_key = 'your_secure_secret_key_here'  # Replace with a secure random key in production

# Configure upload folder and allowed extensions
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'har'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Configure logging
if not os.path.exists('logs'):
    os.makedirs('logs')
logging.basicConfig(
    filename='logs/harry_parser.log',
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s'
)

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    """Handle HAR file uploads."""
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'harfile' not in request.files:
            flash('No file part in the request.')
            return redirect(request.url)
        file = request.files['harfile']
        # If user does not select file, browser may submit an empty part without filename
        if file.filename == '':
            flash('No file selected for uploading.')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)  # Use secure_filename to sanitize the filename
            # Generate a unique filename to prevent collisions
            unique_id = uuid.uuid4().hex
            stored_filename = f"{unique_id}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)
            file.save(file_path)
            logging.info(f"Uploaded file: {stored_filename}")
            # Redirect to processing page
            return redirect(url_for('processing', filename=stored_filename))
        else:
            flash('Allowed file type is .har')
            return redirect(request.url)
    return render_template('upload.html', app_name='HARry Parser')

@app.route('/processing/<filename>')
def processing(filename):
    """Display processing page while the HAR file is being parsed."""
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            har_data = json.load(f)
    except Exception as e:
        logging.error(f"Error parsing HAR file {filename}: {e}")
        flash('Failed to parse the HAR file. Please ensure it is a valid HAR file.')
        return redirect(url_for('upload_file'))
    
    # Extract entries
    entries = har_data.get('log', {}).get('entries', [])
    if not entries:
        flash('No HTTP requests found in the HAR file.')
        return redirect(url_for('upload_file'))
    
    # Render the processing template
    return render_template('processing.html', app_name='HARry Parser', filename=filename)

@app.route('/requests/<filename>')
def show_requests(filename):
    """Display the list of HTTP requests from the HAR file."""
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            har_data = json.load(f)
    except Exception as e:
        logging.error(f"Error loading HAR file {filename}: {e}")
        flash('Failed to load the HAR file. Please ensure it is a valid HAR file.')
        return redirect(url_for('upload_file'))
    
    entries = har_data.get('log', {}).get('entries', [])
    if not entries:
        flash('No HTTP requests found in the HAR file.')
        return redirect(url_for('upload_file'))
    
    # Pass entries to the template
    return render_template('requests.html', app_name='HARry Parser', entries=entries, filename=filename)

@app.route('/request/<filename>/<int:index>')
def get_request_detail(filename, index):
    """API endpoint to get details of a specific HTTP request."""
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            har_data = json.load(f)
    except Exception as e:
        logging.error(f"Error loading HAR file {filename}: {e}")
        return jsonify({'error': 'Failed to load HAR file.'}), 500
    
    entries = har_data.get('log', {}).get('entries', [])
    if index < 0 or index >= len(entries):
        return jsonify({'error': 'Invalid request index.'}), 400
    
    entry = entries[index]
    return jsonify(entry)

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
