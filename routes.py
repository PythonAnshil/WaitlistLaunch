import os
import uuid
import logging
from flask import render_template, request, redirect, url_for, flash, send_file, jsonify, session
from werkzeug.utils import secure_filename
from models import Waitlist
from pdf_utils import (
    merge_pdfs, split_pdf, compress_pdf, 
    extract_text_from_pdf, extract_images_from_pdf
)

def register_routes(app):
    """Register all routes with the Flask app"""
    
    # Ensure necessary directories exist
    os.makedirs('temp_uploads', exist_ok=True)
    os.makedirs('data', exist_ok=True)
    
    # File upload helper
    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'
    
    @app.route('/')
    def index():
        """Landing page with waitlist signup"""
        return render_template('index.html')
    
    @app.route('/signup', methods=['POST'])
    def signup():
        """Handle waitlist signup"""
        email = request.form.get('email', '').strip()
        name = request.form.get('name', '').strip()
        
        if not email or not name:
            flash('Please provide both email and name.', 'danger')
            return redirect(url_for('index'))
            
        success = Waitlist.add_entry(email, name)
        
        if success:
            flash('Thank you for joining our waitlist!', 'success')
            return render_template('success.html', email=email, name=name)
        else:
            flash('This email is already on our waitlist.', 'warning')
            return redirect(url_for('index'))
    
    @app.route('/tools')
    def tools():
        """PDF tools page"""
        return render_template('pdf_tools.html')
    
    @app.route('/merge-pdfs', methods=['POST'])
    def merge_pdfs_route():
        """Handle PDF merge operation"""
        if 'files[]' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
            
        files = request.files.getlist('files[]')
        
        if not files or len(files) < 2:
            return jsonify({'error': 'Please upload at least 2 PDF files'}), 400
        
        # Validate files
        for file in files:
            if file.filename == '':
                return jsonify({'error': 'One or more files have no name'}), 400
            if not allowed_file(file.filename):
                return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        # Save files temporarily
        temp_paths = []
        for file in files:
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(path)
            temp_paths.append(path)
        
        try:
            # Merge PDFs
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_merged.pdf")
            merge_pdfs(temp_paths, output_path)
            
            # Set session data for download
            session['download_file'] = output_path
            session['download_name'] = 'merged.pdf'
            
            # Clean up temp files
            for path in temp_paths:
                try:
                    os.remove(path)
                except Exception as e:
                    logging.error(f"Error removing temp file {path}: {e}")
            
            return jsonify({'success': True, 'message': 'PDFs merged successfully'}), 200
            
        except Exception as e:
            logging.error(f"Error merging PDFs: {e}")
            return jsonify({'error': f'Error processing PDFs: {str(e)}'}), 500
    
    @app.route('/split-pdf', methods=['POST'])
    def split_pdf_route():
        """Handle PDF split operation"""
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Get page ranges
        page_ranges = request.form.get('page_ranges', '')
        
        try:
            # Split PDF
            output_dir = os.path.join(app.config['UPLOAD_FOLDER'], str(uuid.uuid4()))
            os.makedirs(output_dir, exist_ok=True)
            
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_split.zip")
            split_pdf(file_path, output_path, page_ranges, output_dir)
            
            # Set session data for download
            session['download_file'] = output_path
            session['download_name'] = 'split_pdf.zip'
            
            # Clean up temp file
            try:
                os.remove(file_path)
            except Exception as e:
                logging.error(f"Error removing temp file {file_path}: {e}")
            
            return jsonify({'success': True, 'message': 'PDF split successfully'}), 200
            
        except Exception as e:
            logging.error(f"Error splitting PDF: {e}")
            return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500
    
    @app.route('/compress-pdf', methods=['POST'])
    def compress_pdf_route():
        """Handle PDF compression operation"""
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        try:
            # Compress PDF
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_compressed.pdf")
            compress_pdf(file_path, output_path)
            
            # Set session data for download
            session['download_file'] = output_path
            session['download_name'] = 'compressed.pdf'
            
            # Clean up temp file
            try:
                os.remove(file_path)
            except Exception as e:
                logging.error(f"Error removing temp file {file_path}: {e}")
            
            return jsonify({'success': True, 'message': 'PDF compressed successfully'}), 200
            
        except Exception as e:
            logging.error(f"Error compressing PDF: {e}")
            return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500
    
    @app.route('/extract-content', methods=['POST'])
    def extract_content_route():
        """Handle PDF content extraction operation"""
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        extraction_type = request.form.get('extraction_type', 'text')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        try:
            if extraction_type == 'text':
                # Extract text
                output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_extracted.txt")
                extract_text_from_pdf(file_path, output_path)
                download_name = 'extracted_text.txt'
            else:
                # Extract images
                output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_extracted_images.zip")
                extract_images_from_pdf(file_path, output_path)
                download_name = 'extracted_images.zip'
            
            # Set session data for download
            session['download_file'] = output_path
            session['download_name'] = download_name
            
            # Clean up temp file
            try:
                os.remove(file_path)
            except Exception as e:
                logging.error(f"Error removing temp file {file_path}: {e}")
            
            return jsonify({'success': True, 'message': 'Content extracted successfully'}), 200
            
        except Exception as e:
            logging.error(f"Error extracting content: {e}")
            return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500
    
    @app.route('/download-result')
    def download_result():
        """Download the processed file"""
        if 'download_file' not in session or 'download_name' not in session:
            flash('No file to download', 'danger')
            return redirect(url_for('tools'))
        
        file_path = session['download_file']
        download_name = session['download_name']
        
        if not os.path.exists(file_path):
            flash('File no longer available', 'danger')
            return redirect(url_for('tools'))
        
        try:
            return send_file(file_path, 
                            as_attachment=True, 
                            download_name=download_name)
        except Exception as e:
            logging.error(f"Error downloading file: {e}")
            flash('Error downloading file', 'danger')
            return redirect(url_for('tools'))
    
    @app.errorhandler(404)
    def page_not_found(e):
        """Handle 404 errors"""
        return render_template('error.html', error="Page not found"), 404
    
    @app.errorhandler(500)
    def server_error(e):
        """Handle 500 errors"""
        return render_template('error.html', error="Server error occurred"), 500
        
    @app.after_request
    def add_header(response):
        """Add headers to prevent caching"""
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response
