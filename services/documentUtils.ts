import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Fix for PDF.js import structure in ESM environments
// Sometimes the module is wrapped in 'default'
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Initialize PDF worker
if (pdfjs.GlobalWorkerOptions) {
  // Use cdnjs for the worker script as it is more reliable for cross-origin worker loading
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export const DocumentUtils = {
  async readPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText;
  },

  async readDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  },

  async readFile(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      return this.readPdf(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.endsWith('.docx')
    ) {
      return this.readDocx(file);
    } else if (file.type === 'text/plain') {
      return await file.text();
    }
    throw new Error(`Unsupported file type: ${file.type}. Please upload PDF, DOCX, or TXT.`);
  },

  async generatePdfFromElement(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Element not found");
        return;
    }

    try {
        const canvas = await html2canvas(element, { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calculate ratio to fit width
        const ratio = pdfWidth / imgWidth;
        const finalImgHeight = imgHeight * ratio;

        // If content is longer than one page, we might need multiple pages.
        // For simplicity in this version, we add the image scaling to width.
        // If it's a very long resume, it might compress vertically or need paging logic.
        // Basic implementation for 1-2 page resumes:
        
        let heightLeft = finalImgHeight;
        let position = 0;
        let pageHeight = pdfHeight;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalImgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - finalImgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalImgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error("Error generating PDF", error);
    }
  }
};