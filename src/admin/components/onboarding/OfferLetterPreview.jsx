import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiFileText, FiDownload, FiChevronRight, FiChevronLeft, FiPrinter, FiSettings, FiLoader } from "react-icons/fi";
import { setStep, updateOfferLetter } from "../../store/slices/onboardingSlice";
import { TEMPLATES, generateOfferLetterContent, getTemplateById } from "../../utils/offerLetterTemplates";
import TemplateSelector from "./TemplateSelector";
import jsPDF from "jspdf";

const OfferLetterPreview = () => {
  const dispatch = useDispatch();

  const onboarding = useSelector((state) => state.onboarding);
  const employeeDetails = onboarding?.employeeDetails || {};
  const offerLetter = onboarding?.offerLetter || {};

  const [selectedTemplate, setSelectedTemplate] = useState(offerLetter.template || "corporate");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate content when template or employee details change
  useEffect(() => {
    if (selectedTemplate && employeeDetails) {
      const newContent = generateOfferLetterContent(selectedTemplate, employeeDetails);
      setContent(newContent);
    }
  }, [selectedTemplate, employeeDetails]);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
  };

  const handleNext = () => {
    dispatch(updateOfferLetter({ content, template: selectedTemplate, generated: true }));
    dispatch(setStep(5));
  };

  const handleBack = () => {
    dispatch(setStep(3));
  };

  const downloadPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - (margin * 2);
      const lineHeight = 6.5;
      
      // Clean the content - remove any special characters that might cause issues
      let cleanContent = content
        .replace(/[%]/g, '') // Remove % symbols
        .replace(/[•]/g, '-') // Replace bullets with hyphens
        .replace(/[`]/g, "'") // Replace backticks
        .replace(/[“”]/g, '"') // Replace smart quotes
        .replace(/[‘’]/g, "'"); // Replace smart apostrophes
      
      // Set initial styles
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      
      // Split content into lines
      const splitText = doc.splitTextToSize(cleanContent, maxLineWidth);
      
      let y = margin;
      
      // Add each line to PDF with page breaks
      for (let i = 0; i < splitText.length; i++) {
        const line = splitText[i];
        const lineText = line.trim();
        
        // Skip empty lines but add spacing
        if (lineText === "") {
          y += lineHeight / 2;
          continue;
        }
        
        // Check if we need a new page
        if (y + lineHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        
        // Detect and style different line types
        const isMainHeader = lineText.match(/^OFFER OF EMPLOYMENT$|^=========================================$/);
        const isSectionHeader = lineText.match(/^\d+\.\s+[A-Z]/) || lineText.match(/^TERMS OF APPOINTMENT$/) || lineText.match(/^ACCEPTANCE OF OFFER:$/);
        const isSubHeader = lineText.match(/^PRIVATE & CONFIDENTIAL$/) || lineText.match(/^RE: /i);
        const isLabel = lineText.match(/^(To:|Date:|Ref:|Dear|Subject:|Re:)/i);
        const isSignature = lineText.includes("Signature:") || lineText.includes("____________________");
        
        if (isMainHeader) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(lineText, pageWidth / 2, y, { align: "center" });
          doc.setFontSize(11);
        } 
        else if (isSectionHeader) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(lineText, margin, y);
          doc.setFontSize(11);
        }
        else if (isSubHeader) {
          doc.setFont("helvetica", "bold");
          doc.text(lineText, margin, y);
        }
        else if (isLabel) {
          doc.setFont("helvetica", "bold");
          doc.text(lineText, margin, y);
        }
        else if (isSignature) {
          doc.setFont("helvetica", "italic");
          doc.text(lineText, margin, y);
        }
        else {
          doc.setFont("helvetica", "normal");
          // Handle bullet points
          if (lineText.match(/^[-•]/) || lineText.match(/^[0-9]+\./)) {
            doc.text(lineText, margin + 5, y);
          } else {
            doc.text(lineText, margin, y);
          }
        }
        
        // Reset font
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        
        y += lineHeight;
      }

      const computedName = (employeeDetails.firstName || "") + (employeeDetails.lastName ? `_${employeeDetails.lastName}` : "");
      const filename = `Offer_Letter_${computedName || "Candidate"}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const templateConfig = getTemplateById(selectedTemplate);
    
    // Clean content for printing
    let cleanContent = content
      .replace(/[%]/g, '')
      .replace(/[`]/g, "'");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offer Letter - ${employeeDetails.firstName || 'Candidate'}</title>
          <style>
            body {
              font-family: ${templateConfig.fontFamily || 'Times New Roman, serif'};
              margin: 20mm;
              color: #333;
              line-height: 1.5;
              font-size: 11pt;
            }
            .content {
              white-space: pre-wrap;
            }
            h1 {
              text-align: center;
              font-size: 18pt;
              margin-bottom: 20px;
            }
            h2 {
              font-size: 14pt;
              margin-top: 15px;
              margin-bottom: 10px;
            }
            .signature-line {
              margin-top: 40px;
            }
            @media print {
              body {
                margin: 20mm;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="content">${cleanContent.replace(/\n/g, '<br>')}</div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const currentTemplate = getTemplateById(selectedTemplate);

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Configuration Sidebar */}
      <div className="space-y-6 lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FiSettings className="text-green-600" />
            Template Selection
          </h3>
          
          <TemplateSelector 
            selectedTemplate={selectedTemplate}
            onSelectTemplate={handleTemplateChange}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={downloadPDF} 
              disabled={isGenerating}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border hover:border-green-500 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <FiLoader size={20} className="text-green-600 animate-spin" />
              ) : (
                <FiDownload size={20} className="text-gray-400" />
              )}
              <span className="text-[10px] font-bold">{isGenerating ? "GENERATING..." : "DOWNLOAD PDF"}</span>
            </button>
            <button 
              onClick={handlePrint}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border hover:border-green-500 transition-all flex flex-col items-center justify-center gap-2"
            >
              <FiPrinter size={20} className="text-gray-400" />
              <span className="text-[10px] font-bold">PRINT</span>
            </button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            <strong>📄 Template Info:</strong> {currentTemplate.description}
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed mt-2">
            <strong>💡 Tip:</strong> You can edit the content below before downloading.
          </p>
        </div>
      </div>

      {/* Editor Area */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-8 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiFileText className="text-green-600" />
              <span className="text-sm font-bold">Offer Letter Editor</span>
            </div>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              Editable Content
            </span>
          </div>

          <div className="p-6 md:p-10">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[600px] p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-inner outline-none resize-y font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-200"
              style={{
                fontFamily: currentTemplate.fontFamily
              }}
              placeholder="Offer letter content will appear here..."
            />
          </div>

          <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-between">
            <button 
              onClick={handleBack} 
              className="flex items-center gap-2 font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <FiChevronLeft size={20} /> Back
            </button>
            <button
              onClick={handleNext}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              Review Application <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferLetterPreview;