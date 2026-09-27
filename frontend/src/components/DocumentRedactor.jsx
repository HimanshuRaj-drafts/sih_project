import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Undo, Check, X, ZoomIn, ZoomOut, MousePointer2, Square } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Fix worker for react-pdf (Vite compatible)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const DocumentRedactor = ({ file, onComplete, onCancel }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectangles, setRectangles] = useState([]);
  const [currentRect, setCurrentRect] = useState(null);
  
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState('draw'); // 'draw' or 'select'
  
  const isPdf = file.type === 'application/pdf';
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [imageSrc, setImageSrc] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const [ocrBoxes, setOcrBoxes] = useState([]);
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [ocrDimensions, setOcrDimensions] = useState({width: 1, height: 1});

  // Load Image
  useEffect(() => {
    if (!isPdf && file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      const img = new Image();
      img.onload = () => setImageSize({ width: img.width, height: img.height });
      img.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isPdf]);

  // Fetch OCR for Image when selecting text
  useEffect(() => {
    if (mode === 'select' && !isPdf && ocrBoxes.length === 0 && !isLoadingOcr) {
      const fetchOcr = async () => {
        setIsLoadingOcr(true);
        try {
          const formData = new FormData();
          formData.append('file', file);
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          const response = await fetch(`${baseUrl}/api/v1/evidence/ocr-boxes`, {
            method: 'POST',
            body: formData
          });
          const data = await response.json();
          if (data.boxes) {
            setOcrBoxes(data.boxes);
            setOcrDimensions({width: data.width, height: data.height});
          }
        } catch(e) {
          console.error(e);
        } finally {
          setIsLoadingOcr(false);
        }
      };
      fetchOcr();
    }
  }, [mode, isPdf, file, ocrBoxes.length, isLoadingOcr]);

  // Handle PDF load
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };
  const onPageLoadSuccess = (page) => {
    const width = page.originalWidth || page.width || (page.getViewport && page.getViewport({scale: 1}).width) || 800;
    const height = page.originalHeight || page.height || (page.getViewport && page.getViewport({scale: 1}).height) || 1000;
    setPdfDimensions({ width, height });
  };

  // Draw Canvas (for both Image and PDF overlay)
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let baseWidth = isPdf ? pdfDimensions.width : imageSize.width;
    let baseHeight = isPdf ? pdfDimensions.height : imageSize.height;
    
    if (baseWidth === 0) return;
    
    canvas.width = baseWidth;
    canvas.height = baseHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'black';
    rectangles.forEach(r => {
      if (!isPdf || r.page === pageNumber) {
        ctx.fillRect(r.x, r.y, r.width, r.height);
      }
    });
    
    if (currentRect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [rectangles, currentRect, pdfDimensions, imageSize, pageNumber, isPdf]);

  const getEventPos = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { clientX, clientY };
  };

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = getEventPos(e);
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    if (mode !== 'draw') return;
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || mode !== 'draw') return;
    if (e.cancelable) e.preventDefault();
    
    const pos = getCanvasPos(e);
    setCurrentRect(prev => ({
      ...prev,
      width: pos.x - prev.x,
      height: pos.y - prev.y
    }));
  };

  const handlePointerUp = () => {
    if (isDrawing && currentRect) {
      let { x, y, width, height } = currentRect;
      if (width < 0) { x += width; width = Math.abs(width); }
      if (height < 0) { y += height; height = Math.abs(height); }
      
      if (width > 5 && height > 5) {
        setRectangles([...rectangles, { x, y, width, height, page: pageNumber }]);
      }
    }
    setIsDrawing(false);
    setCurrentRect(null);
  };

  // Text selection to redaction boxes
  useEffect(() => {
    const handleSelection = () => {
      if (mode !== 'select') return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      
      if (rects.length === 0) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;
      
      const newRects = rects.map(r => ({
        x: (r.left - canvasRect.left) * scaleX,
        y: (r.top - canvasRect.top) * scaleY,
        width: r.width * scaleX,
        height: r.height * scaleY,
        page: pageNumber
      }));
      
      setRectangles(prev => [...prev, ...newRects]);
      selection.removeAllRanges();
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, [mode, pageNumber]);

  const handleUndo = () => {
    setRectangles(rectangles.slice(0, -1));
  };

  const handleDone = async () => {
    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      rectangles.forEach(rect => {
        const pageIndex = rect.page - 1;
        if (pageIndex >= 0 && pageIndex < pages.length) {
          const page = pages[pageIndex];
          const pageHeight = page.getHeight();
          const pageWidth = page.getWidth();
          
          const scaleX = pageWidth / pdfDimensions.width;
          const scaleY = pageHeight / pdfDimensions.height;
          
          page.drawRectangle({
            x: rect.x * scaleX,
            y: pageHeight - ((rect.y + rect.height) * scaleY),
            width: rect.width * scaleX,
            height: rect.height * scaleY,
            color: rgb(0, 0, 0),
          });
        }
      });
      
      const pdfBytes = await pdfDoc.save();
      const newFile = new File([pdfBytes], file.name, { type: 'application/pdf' });
      onComplete(newFile);
      
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = imageSize.width;
      canvas.height = imageSize.height;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = 'black';
        rectangles.forEach(r => {
          ctx.fillRect(r.x, r.y, r.width, r.height);
        });
        canvas.toBlob((blob) => {
          const newFile = new File([blob], file.name, { type: file.type });
          onComplete(newFile);
        }, file.type);
      };
      img.src = imageSrc;
    }
  };

  return createPortal(
    <div className="fixed top-0 left-0 z-[9999] w-screen h-screen bg-[#F8FAFC] flex flex-col overflow-hidden animate-cipher m-0 p-0">
      {/* Top Toolbar */}
      <div className="w-full bg-white p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center text-slate-900 border-b border-slate-200 space-y-3 sm:space-y-0 shadow-sm z-20">
        <div className="font-bold text-slate-800 text-lg flex items-center space-x-2">
          <span className="truncate max-w-[200px] sm:max-w-md">{file.name}</span>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono border border-blue-200">Manual Redaction</span>
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 hide-scrollbar">
          {/* Tool Modes */}
          <div className="flex bg-slate-100 rounded-lg p-1 mr-2 border border-slate-200">
            <button 
              onClick={() => setMode('draw')} 
              className={`p-2 rounded-md flex items-center space-x-1 ${mode === 'draw' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Draw Boxes"
            >
              <Square className="w-4 h-4" /> <span className="text-xs font-bold hidden md:inline">Draw</span>
            </button>
            <button 
              onClick={() => setMode('select')} 
              className={`p-2 rounded-md flex items-center space-x-1 ${mode === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Select Text to Hide"
            >
              <MousePointer2 className="w-4 h-4" /> <span className="text-xs font-bold hidden md:inline">Select Text</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 rounded-lg mr-2 border border-slate-200">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 hover:bg-slate-200 rounded-l-lg text-slate-600" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-600 w-12 text-center font-bold">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 hover:bg-slate-200 rounded-r-lg text-slate-600" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <button onClick={handleUndo} className="px-3 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 text-slate-700">
            <Undo className="w-4 h-4" /> <span className="hidden sm:inline">Undo</span>
          </button>
          <button onClick={onCancel} className="p-2 bg-slate-100 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 rounded-lg text-slate-500 transition-colors" title="Cancel">
            <X className="w-5 h-5" />
          </button>
          <button onClick={handleDone} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-colors flex items-center space-x-2 text-white">
            <Check className="w-4 h-4" /> <span className="hidden sm:inline">Apply</span>
          </button>
        </div>
      </div>

      {/* Main Drawing Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#F8FAFC] flex justify-center items-start p-4 sm:p-10 touch-pan-x touch-pan-y z-10 relative"
      >
        <div 
          className="relative shadow-xl bg-white origin-top"
          style={{ transform: `scale(${scale})`, touchAction: mode === 'draw' ? 'none' : 'auto' }}
        >
          {isPdf ? (
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="p-20 text-slate-400 font-bold">Loading PDF...</div>}
            >
              <Page 
                pageNumber={pageNumber} 
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : (
            <img src={imageSrc} alt="Redactable" draggable="false" className="block select-none" />
          )}

          {/* Transparent Canvas Overlay */}
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className={`absolute inset-0 z-10 w-full h-full ${mode === 'draw' ? 'cursor-crosshair' : 'pointer-events-none'}`}
          />

          {/* OCR text layer for images */}
          {!isPdf && mode === 'select' && (
            <div className="absolute inset-0 z-20 pointer-events-auto" style={{ width: '100%', height: '100%' }}>
              {isLoadingOcr ? (
                <div className="flex items-center justify-center w-full h-full bg-white/60 backdrop-blur-sm text-slate-800 font-bold">
                  <div className="animate-pulse">Extracting text for selection via Tesseract OCR...</div>
                </div>
              ) : (
                ocrBoxes.map((box, i) => {
                  const scaleX = imageSize.width / ocrDimensions.width;
                  const scaleY = imageSize.height / ocrDimensions.height;
                  return (
                    <span
                      key={i}
                      style={{
                        position: 'absolute',
                        left: `${(box.left * scaleX / imageSize.width) * 100}%`,
                        top: `${(box.top * scaleY / imageSize.height) * 100}%`,
                        width: `${(box.width * scaleX / imageSize.width) * 100}%`,
                        height: `${(box.height * scaleY / imageSize.height) * 100}%`,
                        color: 'transparent',
                        cursor: 'text',
                        userSelect: 'text'
                      }}
                      className="selection:bg-blue-500/30"
                    >
                      {box.text}{" "}
                    </span>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Pagination for PDF */}
      <div className="w-full bg-white p-3 text-slate-500 font-medium text-xs flex justify-between items-center border-t border-slate-200 z-20">
        <div>
          {mode === 'draw' ? (
             <span>Drag to draw redaction boxes.</span>
          ) : (
             <span>Highlight text to automatically redact it.</span>
          )}
        </div>
        {isPdf && numPages > 1 && (
          <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
            <button 
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber(p => p - 1)}
              className="px-2 hover:text-blue-600 disabled:opacity-50"
            >Prev</button>
            <span className="font-mono font-bold text-slate-700">{pageNumber} / {numPages}</span>
            <button 
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber(p => p + 1)}
              className="px-2 hover:text-blue-600 disabled:opacity-50"
            >Next</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DocumentRedactor;
