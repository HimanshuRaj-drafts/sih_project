from PIL import Image
import pytesseract
import cv2
import numpy as np
import os

TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# ===============================================
# 1) Simple OCR extraction (text only)
# ===============================================
def extract_text_only(image_path):
    try:
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except Exception as e:
        return f"OCR failed: {e}"

# ===============================================
# 2) OCR extraction with line segmentation
# ===============================================
def extract_text_with_lines(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image at {image_path}")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Improve contrast
    gray = cv2.medianBlur(gray, 3)
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]

    # Extract text
    data = pytesseract.image_to_data(
        gray,
        output_type=pytesseract.Output.DICT,
        lang='eng'
    )

    lines = []
    for i, txt in enumerate(data["text"]):
        if txt.strip():
            lines.append({
                "text": txt,
                "block_num": data["block_num"][i],
                "par_num": data["par_num"][i],
                "line_num": data["line_num"][i],
                "word_num": data["word_num"][i],
                "left": data["left"][i],
                "top": data["top"][i],
                "width": data["width"][i],
                "height": data["height"][i]
            })
    return lines


# ===============================================
# 3) OCR with bounding box for each word
# ===============================================
def extract_words_with_boxes(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image at {image_path}")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Dilation → connect fragmented text
    kernel = np.ones((2, 2), np.uint8)
    dilated = cv2.dilate(gray, kernel, iterations=1)

    # Extract words
    data = pytesseract.image_to_data(
        dilated,
        output_type=pytesseract.Output.DICT,
        lang='eng'
    )

    words_with_boxes = []
    n_boxes = len(data['level'])
    for i in range(n_boxes):
        if float(data['conf'][i]) > 50 and data['text'][i].strip():
            x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
            words_with_boxes.append({
                "text": data['text'][i],
                "left": x,
                "top": y,
                "width": w,
                "height": h,
                "confidence": float(data['conf'][i])
            })

    return words_with_boxes

if __name__ == "__main__":
    test_image_path = r"C:\Users\RUPESH YADAV\OneDrive\Attachments\Desktop\download.png"
    
    if os.path.exists(test_image_path):
        print("Extracting text...")
        text = extract_text_only(test_image_path)
        print("--- EXTRACTED TEXT ---")
        print(text)
        print("----------------------")
    else:
        print(f"Could not find image at {test_image_path}")