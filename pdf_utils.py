import os
import zipfile
import logging
from PyPDF2 import PdfMerger, PdfReader, PdfWriter
import fitz  # PyMuPDF
import re
import tempfile
import shutil

def merge_pdfs(input_paths, output_path):
    """Merge multiple PDFs into one file"""
    merger = PdfMerger()
    
    for path in input_paths:
        merger.append(path)
    
    merger.write(output_path)
    merger.close()
    return output_path

def parse_page_ranges(page_ranges_str, total_pages):
    """Parse page ranges string into actual page ranges"""
    ranges = []
    if not page_ranges_str.strip():
        # If no ranges specified, return all pages
        return [(1, total_pages)]
    
    parts = page_ranges_str.split(',')
    for part in parts:
        part = part.strip()
        if '-' in part:
            start, end = map(str.strip, part.split('-'))
            if start and end:
                start_num = int(start)
                end_num = int(end)
                if 1 <= start_num <= end_num <= total_pages:
                    ranges.append((start_num, end_num))
        else:
            try:
                page_num = int(part)
                if 1 <= page_num <= total_pages:
                    ranges.append((page_num, page_num))
            except ValueError:
                pass
    
    return ranges or [(1, total_pages)]

def split_pdf(input_path, output_zip_path, page_ranges_str, output_dir):
    """Split a PDF based on specified page ranges or into individual pages"""
    reader = PdfReader(input_path)
    total_pages = len(reader.pages)
    
    if page_ranges_str.strip():
        # Split according to specified ranges
        ranges = parse_page_ranges(page_ranges_str, total_pages)
    else:
        # Split into individual pages
        ranges = [(i, i) for i in range(1, total_pages + 1)]
    
    # Create output PDFs
    file_paths = []
    for i, (start, end) in enumerate(ranges):
        writer = PdfWriter()
        
        for page_num in range(start - 1, end):  # Convert to 0-based indexing
            writer.add_page(reader.pages[page_num])
        
        output_file = os.path.join(output_dir, f"split_{i+1}_{start}-{end}.pdf")
        with open(output_file, 'wb') as output:
            writer.write(output)
        file_paths.append(output_file)
    
    # Create zip file
    with zipfile.ZipFile(output_zip_path, 'w') as zipf:
        for file_path in file_paths:
            zipf.write(file_path, os.path.basename(file_path))
    
    # Clean up individual files
    for file_path in file_paths:
        try:
            os.remove(file_path)
        except Exception as e:
            logging.error(f"Error removing temp file {file_path}: {e}")
    
    return output_zip_path

def compress_pdf(input_path, output_path):
    """Compress a PDF file"""
    doc = fitz.open(input_path)
    
    # Set parameters for compression
    doc.save(
        output_path, 
        garbage=4,  # Clean up unused objects
        deflate=True,  # Compress streams
        clean=True,  # Clean content streams
        linear=True  # Optimize for web viewing
    )
    
    doc.close()
    return output_path

def extract_text_from_pdf(input_path, output_path):
    """Extract text from a PDF file"""
    text = []
    doc = fitz.open(input_path)
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text.append(f"--- Page {page_num + 1} ---\n")
        text.append(page.get_text())
        text.append("\n\n")
    
    doc.close()
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(''.join(text))
    
    return output_path

def extract_images_from_pdf(input_path, output_zip_path):
    """Extract images from a PDF file"""
    temp_dir = tempfile.mkdtemp()
    
    try:
        doc = fitz.open(input_path)
        img_count = 0
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            image_list = page.get_images(full=True)
            
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Determine image extension
                ext = base_image["ext"]
                if ext == "jpeg":
                    ext = "jpg"
                
                # Save image
                img_filename = f"image_p{page_num+1}_{img_index+1}.{ext}"
                img_path = os.path.join(temp_dir, img_filename)
                
                with open(img_path, "wb") as img_file:
                    img_file.write(image_bytes)
                
                img_count += 1
        
        doc.close()
        
        # If no images found, create a placeholder text file
        if img_count == 0:
            with open(os.path.join(temp_dir, "no_images_found.txt"), "w") as f:
                f.write("No images were found in the PDF document.")
        
        # Create zip file
        with zipfile.ZipFile(output_zip_path, 'w') as zipf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, os.path.basename(file_path))
        
        return output_zip_path
        
    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)
