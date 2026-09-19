import pymupdf as fitz  # PyMuPDF (modern import)
import pytesseract
import cv2
import numpy as np
import hashlib
from PIL import Image
from fastapi import HTTPException

# --- START: STATION 1 TEXT EXTRACTION & HASHING ENGINE ---

def compute_sha256(file_bytes: bytes) -> str:
    """Computes a deterministic SHA-256 hash for blockchain anchoring."""
    return hashlib.sha256(file_bytes).hexdigest()

def clean_scanned_image(image_bytes: bytes) -> np.ndarray:
    """
    Cleans low-quality scanned documents using OpenCV to maximize OCR accuracy.
    Applies grayscale, Gaussian blur (noise reduction), and adaptive binarization.
    """
    # 1. Convert byte stream to OpenCV format
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image bytes.")

    # 2. Convert to Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Apply Gaussian Blur to remove background noise/grain
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # 4. Adaptive Thresholding (Binarization) to sharpen text
    processed_img = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    return processed_img

def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """Runs OCR on cleaned image bytes."""
    try:
        cleaned_img_array = clean_scanned_image(image_bytes)
        # Convert OpenCV array back to PIL Image for Tesseract
        pil_img = Image.fromarray(cleaned_img_array)
        
        # Run Tesseract OCR (Assuming path is configured if on Windows)
        text = pytesseract.image_to_string(pil_img)
        return text
    except Exception as e:
        print(f"OCR Processing Error: {e}")
        return ""

def ingest_and_extract_text(file_bytes: bytes, filename: str) -> dict:
    """
    Main Station 1 Pipeline:
    1. Computes SHA-256 of the raw file.
    2. Determines if file is PDF or Image.
    3. Extracts text (uses native PyMuPDF text first, falls back to OCR for scanned pages).
    """
    # 1. Compute Cryptographic Hash
    file_hash = compute_sha256(file_bytes)
    extracted_text = ""
    filename_lower = filename.lower()
    
    # 2. Process PDF Documents
    if filename_lower.endswith('.pdf'):
        try:
            doc = fitz.open("pdf", file_bytes)
            for page_num, page in enumerate(doc):
                # Try getting native text (works for digital PDFs)
                text = page.get_text("text").strip()
                
                if text:
                    extracted_text += f"\n--- Page {page_num + 1} ---\n{text}"
                else:
                    # Fallback: Page has no native text, it's likely a scanned image.
                    # Extract the embedded images and run OCR.
                    for img_index, img_info in enumerate(page.get_images(full=True)):
                        xref = img_info[0]
                        base_image = doc.extract_image(xref)
                        extracted_text += extract_text_from_image_bytes(base_image["image"])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF Parsing Failed: {str(e)}")
            
    # 3. Process Standalone Images (JPG, PNG)
    elif filename_lower.endswith(('.png', '.jpg', '.jpeg')):
        extracted_text = extract_text_from_image_bytes(file_bytes)
        
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Please upload PDF, PNG, or JPG.")

    return {
        "filename": filename,
        "document_hash": file_hash,
        "raw_text": extracted_text.strip()
    }

# --- END: STATION 1 TEXT EXTRACTION & HASHING ENGINE ---

if __name__ == "__main__":
    pdf_path = r"C:\Users\RUPESH YADAV\OneDrive\Attachments\Desktop\rupesh.pdf"
    
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()
    
    result = ingest_and_extract_text(file_bytes, "rupesh.pdf")
    
    print(f"Filename: {result['filename']}")
    print(f"Document Hash: {result['document_hash']}")
    print("--- Extracted Text ---")
    print(result["raw_text"])