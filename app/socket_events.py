import os
import json
import logging
import eventlet
from flask import request
from flask_login import current_user
from flask_socketio import emit
from app.models import HARFile

def register_socket_events(socketio):
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
                total_entries = len(entries)

                chunk_size = 25
                for i in range(0, total_entries, chunk_size):
                    chunk = entries[i:i + chunk_size]
                    emit('har_data_chunk', {
                        'chunk': chunk,
                        'progress': (i + len(chunk)) / total_entries * 100,
                        'isLast': (i + chunk_size) >= total_entries,
                        'totalEntries': total_entries
                    })
                    eventlet.sleep(0)  # Yield to other events

                logging.info(f"User {current_user.username} streamed HAR file: {filename} with {total_entries} entries")
        except json.JSONDecodeError as e:
            logging.error(f"JSON decode error in HAR file {filename}: {str(e)}")
            emit('error', {'message': 'Invalid HAR file format'})
        except Exception as e:
            logging.error(f"Error streaming HAR file {filename}: {str(e)}")
            emit('error', {'message': 'Error processing HAR file'})
