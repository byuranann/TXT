let uploadedFile = null;
let splitFiles = [];

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const processing = document.getElementById('processing');
const status = document.getElementById('status');
const results = document.getElementById('results');

// Upload area click handler
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Drag and drop handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// File input change handler
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Process button handler
processBtn.addEventListener('click', () => {
    if (uploadedFile) {
        processFile();
    }
});

function handleFile(file) {
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        showStatus('Please select a .txt file', 'error');
        return;
    }

    uploadedFile = file;
    processBtn.disabled = false;
    uploadArea.innerHTML = `
        <div class="upload-icon">✅</div>
        <div class="upload-text">File selected: ${file.name}</div>
        <div class="upload-subtext">Ready to process</div>
    `;
    showStatus('File uploaded successfully! Click "Process File" to continue.', 'success');
}

async function processFile() {
    if (!uploadedFile) return;

    processing.style.display = 'block';
    processBtn.disabled = true;
    results.innerHTML = '';
    splitFiles = [];

    try {
        const text = await uploadedFile.text();
        const lines = text.split('\n');
        
        let copy = false;
        let currentFile = null;
        let currentContent = '';
        let fileName = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (copy) {
                currentContent += line + '\n';
                if (line.trim() === '~End') {
                    // Save the current file
                    splitFiles.push({
                        name: fileName + '.txt',
                        content: currentContent
                    });
                    currentContent = '';
                    copy = false;
                }
            } else if (line.trim().startsWith('Plate')) {
                // Extract filename from line like "Plate:\tfilename" or "Plate: filename"
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const afterColon = line.substring(colonIndex + 1);
                    // Split by whitespace (tabs or spaces) and get first non-empty part
                    const parts = afterColon.trim().split(/\s+/);
                    if (parts.length > 0 && parts[0]) {
                        fileName = parts[0];
                        currentContent = line + '\n';
                        copy = true;
                    }
                }
            }
        }

        // Handle case where file doesn't end with ~End
        if (copy && currentContent) {
            splitFiles.push({
                name: fileName + '.txt',
                content: currentContent
            });
        }

        displayResults();
        showStatus(`Successfully split file into ${splitFiles.length} parts!`, 'success');
        
    } catch (error) {
        showStatus('Error processing file: ' + error.message, 'error');
    } finally {
        processing.style.display = 'none';
        processBtn.disabled = false;
    }
}

function displayResults() {
    if (splitFiles.length === 0) {
        results.innerHTML = '<div class="status error">No files were generated. Make sure your file contains "Plate:" markers.</div>';
        return;
    }

    results.innerHTML = `
        <h2 style="margin-bottom: 20px; color: #333;">📋 Generated Files</h2>
        <button class="process-btn" onclick="downloadAllFiles()">
            📦 Download All Files (ZIP)
        </button>
    `;
    
    splitFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.style.animationDelay = `${index * 0.1}s`;
        
        const preview = file.content.length > 300 
            ? file.content.substring(0, 300) + '...'
            : file.content;
        
        fileItem.innerHTML = `
            <div class="file-name">📄 ${file.name}</div>
            <div class="file-preview">${preview}</div>
            <button class="download-btn" onclick="downloadFile(${index})">
                💾 Download
            </button>
        `;
        
        results.appendChild(fileItem);
    });
}

function downloadFile(index) {
    const file = splitFiles[index];
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function downloadAllFiles() {
    if (splitFiles.length === 0) return;
    
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
        showStatus('ZIP library not loaded. Please refresh the page and try again.', 'error');
        return;
    }
    
    try {
        // Create a new JSZip instance
        const zip = new JSZip();
        
        // Add each file to the zip
        splitFiles.forEach(file => {
            zip.file(file.name, file.content);
        });
        
        // Generate the zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Create download link
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `split_files_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus(`Successfully downloaded ${splitFiles.length} files as ZIP!`, 'success');
    } catch (error) {
        showStatus('Error creating ZIP file: ' + error.message, 'error');
    }
}

function showStatus(message, type) {
    status.innerHTML = `<div class="status ${type}">${message}</div>`;
    setTimeout(() => {
        status.innerHTML = '';
    }, 5000);
}