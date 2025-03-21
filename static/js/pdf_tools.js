document.addEventListener('DOMContentLoaded', function() {
    // Initialize dropzones
    initDropZones();
    
    // Set up form submissions
    setupFormSubmissions();
});

// Initialize drag and drop file upload zones
function initDropZones() {
    const dropZones = document.querySelectorAll('.drop-zone');
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    dropZones.forEach(zone => {
        const input = zone.querySelector('input[type="file"]');
        const fileListElement = document.getElementById(zone.dataset.listId);
        
        // Add mobile-specific adjustments
        if (isMobile) {
            zone.classList.add('drop-zone-mobile');
            
            // Modify text for mobile
            const paragraphs = zone.querySelectorAll('p');
            paragraphs.forEach(p => {
                if (p.textContent.includes('Drag & drop')) {
                    p.textContent = p.textContent.replace('Drag & drop', 'Tap to select');
                }
            });
            
            // Optimize icon spacing
            const uploadIcon = zone.querySelector('.fa-cloud-upload-alt');
            if (uploadIcon) {
                uploadIcon.classList.add('mb-2');
                uploadIcon.classList.remove('mb-3');
            }
        }
        
        // Show files when selected through input
        if (input) {
            input.addEventListener('change', () => {
                updateFileList(input.files, fileListElement);
            });
        }
        
        if (!isMobile) {
            // Desktop: Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, preventDefaults, false);
            });
            
            // Highlight drop zone when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.classList.add('active');
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.classList.remove('active');
                }, false);
            });
            
            // Handle dropped files
            zone.addEventListener('drop', (e) => {
                if (input) {
                    if (input.multiple) {
                        input.files = e.dataTransfer.files;
                    } else {
                        // For single file inputs, just use the first file
                        const dt = new DataTransfer();
                        dt.items.add(e.dataTransfer.files[0]);
                        input.files = dt.files;
                    }
                    
                    // Trigger change event
                    const event = new Event('change');
                    input.dispatchEvent(event);
                }
            }, false);
        } else {
            // Mobile: Add touch feedback
            zone.addEventListener('touchstart', () => {
                zone.classList.add('active');
            });
            
            zone.addEventListener('touchend', () => {
                setTimeout(() => {
                    zone.classList.remove('active');
                }, 300);
            });
        }
        
        // Open file dialog when clicking on the drop zone
        zone.addEventListener('click', () => {
            if (input) {
                input.click();
            }
        });
    });
}

// Prevent default behaviors for drag and drop events
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Update file list display
function updateFileList(files, fileListElement) {
    if (!fileListElement) return;
    
    fileListElement.innerHTML = '';
    
    if (files.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item text-muted';
        li.textContent = 'No files selected';
        fileListElement.appendChild(li);
        return;
    }
    
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    Array.from(files).forEach(file => {
        const li = document.createElement('li');
        
        if (isMobile && file.name.length > 20) {
            // Mobile: better handling for long filenames
            li.className = 'list-group-item';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'text-truncate mb-1';
            nameDiv.title = file.name;
            nameDiv.textContent = file.name;
            
            const sizeDiv = document.createElement('div');
            sizeDiv.className = 'd-flex justify-content-between align-items-center';
            
            const fileTypeSpan = document.createElement('span');
            fileTypeSpan.className = 'badge bg-secondary me-2';
            fileTypeSpan.textContent = 'PDF';
            
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'badge bg-primary';
            sizeSpan.textContent = formatFileSize(file.size);
            
            sizeDiv.appendChild(fileTypeSpan);
            sizeDiv.appendChild(sizeSpan);
            
            li.appendChild(nameDiv);
            li.appendChild(sizeDiv);
        } else {
            // Desktop: standard display
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-truncate me-2';
            nameSpan.style.maxWidth = '80%';
            nameSpan.title = file.name;
            nameSpan.textContent = file.name;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'badge bg-primary rounded-pill';
            sizeSpan.textContent = formatFileSize(file.size);
            
            li.appendChild(nameSpan);
            li.appendChild(sizeSpan);
        }
        
        fileListElement.appendChild(li);
    });
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Set up form submissions for different PDF tools
function setupFormSubmissions() {
    // Merge PDFs form
    const mergeForm = document.getElementById('merge-form');
    if (mergeForm) {
        mergeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('merge-files');
            if (!fileInput.files.length || fileInput.files.length < 2) {
                showAlert('Please select at least two PDF files to merge', 'danger');
                return;
            }
            
            showLoading('Merging PDF files...');
            
            const formData = new FormData(mergeForm);
            
            fetch('/merge-pdfs', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    showAlert(data.error, 'danger');
                } else {
                    showAlert('PDFs merged successfully!', 'success');
                    window.location.href = '/download-result';
                }
            })
            .catch(error => {
                hideLoading();
                showAlert('An error occurred: ' + error, 'danger');
            });
        });
    }
    
    // Split PDF form
    const splitForm = document.getElementById('split-form');
    if (splitForm) {
        splitForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('split-file');
            if (!fileInput.files.length) {
                showAlert('Please select a PDF file to split', 'danger');
                return;
            }
            
            showLoading('Splitting PDF file...');
            
            const formData = new FormData(splitForm);
            
            fetch('/split-pdf', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    showAlert(data.error, 'danger');
                } else {
                    showAlert('PDF split successfully!', 'success');
                    window.location.href = '/download-result';
                }
            })
            .catch(error => {
                hideLoading();
                showAlert('An error occurred: ' + error, 'danger');
            });
        });
    }
    
    // Compress PDF form
    const compressForm = document.getElementById('compress-form');
    if (compressForm) {
        compressForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('compress-file');
            if (!fileInput.files.length) {
                showAlert('Please select a PDF file to compress', 'danger');
                return;
            }
            
            showLoading('Compressing PDF file...');
            
            const formData = new FormData(compressForm);
            
            fetch('/compress-pdf', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    showAlert(data.error, 'danger');
                } else {
                    showAlert('PDF compressed successfully!', 'success');
                    window.location.href = '/download-result';
                }
            })
            .catch(error => {
                hideLoading();
                showAlert('An error occurred: ' + error, 'danger');
            });
        });
    }
    
    // Extract Content form
    const extractForm = document.getElementById('extract-form');
    if (extractForm) {
        extractForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('extract-file');
            if (!fileInput.files.length) {
                showAlert('Please select a PDF file for extraction', 'danger');
                return;
            }
            
            const extractionType = document.querySelector('input[name="extraction_type"]:checked').value;
            showLoading(`Extracting ${extractionType} from PDF...`);
            
            const formData = new FormData(extractForm);
            
            fetch('/extract-content', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.error) {
                    showAlert(data.error, 'danger');
                } else {
                    showAlert('Content extracted successfully!', 'success');
                    window.location.href = '/download-result';
                }
            })
            .catch(error => {
                hideLoading();
                showAlert('An error occurred: ' + error, 'danger');
            });
        });
    }
}

// Show alert message
function showAlert(message, type) {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    
    // Clear any existing alerts
    const existingAlerts = alertsContainer.querySelectorAll('.alert');
    existingAlerts.forEach(existingAlert => {
        existingAlert.remove();
    });
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    
    // Check if it's a mobile device
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
        alert.classList.add('alert-mobile');
    }
    
    // Add icon based on alert type
    let iconClass = 'info-circle';
    if (type === 'success') iconClass = 'check-circle';
    if (type === 'danger') iconClass = 'exclamation-circle';
    if (type === 'warning') iconClass = 'exclamation-triangle';
    
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${iconClass} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertsContainer.appendChild(alert);
    
    // Scroll to alert on mobile
    if (isMobile) {
        alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }, 5000);
}
