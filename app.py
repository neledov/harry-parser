# app.py

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import os
import json
from werkzeug.utils import secure_filename
import logging

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your_default_secret_key')  # Use environment variable

# Configure logging
if not os.path.exists('logs'):
    os.makedirs('logs')
logging.basicConfig(filename='logs/harry_parser.log', level=logging.INFO,
                    format='%(asctime)s %(levelname)s:%(message)s')

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'har'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'harfile' not in request.files:
            flash('No file part')
            return redirect(request.url)
        file = request.files['harfile']
        # If user does not select file, browser may submit an empty part without filename
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(filepath)
            logging.info(f"Uploaded HAR file: {filename}")
            return redirect(url_for('processing', filename=filename))
        else:
            flash('Invalid file type. Please upload a .har file.')
            return redirect(request.url)
    return render_template('upload.html', app_name='HARRY')

@app.route('/processing/<filename>')
def processing(filename):
    # Here you can add code to process the HAR file if needed
    # For simplicity, we'll redirect to the requests page after processing
    return render_template('processing.html', app_name='HARRY', filename=filename)

@app.route('/requests/<filename>')
def requests_page(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        flash('File not found.')
        return redirect(url_for('upload_file'))
    with open(filepath, 'r', encoding='utf-8') as f:
        har_data = json.load(f)
    entries = har_data.get('log', {}).get('entries', [])
    logging.info(f"Loaded {len(entries)} entries from HAR file: {filename}")
    return render_template('requests.html', app_name='HARRY', entries=entries, filename=filename)

@app.route('/request/<filename>/<int:index>')
def get_request_detail(filename, index):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found.'}), 404
    with open(filepath, 'r', encoding='utf-8') as f:
        har_data = json.load(f)
    entries = har_data.get('log', {}).get('entries', [])
    if index < 0 or index >= len(entries):
        return jsonify({'error': 'Invalid request index.'}), 400
    entry = entries[index]
    # Extract relevant data
    request_data = {
        'method': entry['request']['method'],
        'url': entry['request']['url'],
        'headers': entry['request'].get('headers', []),
        'queryString': entry['request'].get('queryString', []),
        'postData': entry['request'].get('postData', {})
    }
    response_data = {
        'status': entry['response']['status'],
        'statusText': entry['response'].get('statusText', ''),
        'headers': entry['response'].get('headers', []),
        'content': entry['response'].get('content', {})
    }
    timings = entry.get('timings', {})
    logging.info(f"Fetched details for request index {index} in file {filename}")
    return jsonify({
        'request': request_data,
        'response': response_data,
        'timings': timings
    })

if __name__ == '__main__':
    # Ensure the upload and logs directories exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    app.run(debug=True)
