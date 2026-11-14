"""OCR dokumentów: Tesseract (pol+eng). PDF → obrazy przez pdf2image (poppler)."""
import io

import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image

MAX_IMAGES_PER_DOC = 5
MAX_OCR_CHARS = 8000


def extract_text(filename: str, data: bytes) -> str:
    images = []
    if filename.lower().endswith(".pdf"):
        try:
            images = convert_from_bytes(data, dpi=150)
        except Exception:
            return ""
    else:
        try:
            images = [Image.open(io.BytesIO(data))]
        except Exception:
            return ""
    chunks = []
    for img in images[:MAX_IMAGES_PER_DOC]:
        try:
            text = pytesseract.image_to_string(img, lang="pol+eng")
            chunks.append(text.strip())
        except Exception:
            continue
    return "\n".join(c for c in chunks if c)[:MAX_OCR_CHARS]
