import requests
import fitz # PyMuPDF

# 1. Create a dummy PDF with some PII
doc = fitz.open()
page = doc.new_page()
page.insert_text((50, 50), "Confidential Report", fontsize=20)
page.insert_text((50, 100), "Candidate Name: John Doe", fontsize=12)
page.insert_text((50, 120), "Phone: 9876543210", fontsize=12)
pdf_bytes = doc.write()
doc.close()

with open("dummy_test.pdf", "wb") as f:
    f.write(pdf_bytes)

print("Created dummy_test.pdf")

# 2. Upload it via API
url = "http://127.0.0.1:8000/api/v1/evidence/upload"
files = {'file': ('dummy_test.pdf', open('dummy_test.pdf', 'rb'), 'application/pdf')}
data = {'case_number': 'TEST-123', 'uploader_id': 'officer_1'}

print("Uploading to", url)
response = requests.post(url, files=files, data=data)

if response.status_code != 200:
    print("Upload Failed:", response.text)
    exit(1)

res_json = response.json()
print("Upload Success:", res_json)

doc_id = res_json['document_id']

# 3. View it via API
view_url = f"http://127.0.0.1:8000/api/v1/evidence/view/{doc_id}"
headers = {'X-Viewer-Email': 'test@ncrb.gov.in'}

print("Fetching from", view_url)
view_response = requests.get(view_url, headers=headers)

if view_response.status_code == 200:
    print(f"View Success: Received {len(view_response.content)} bytes of PDF.")
else:
    print("View Failed:", view_response.text)
