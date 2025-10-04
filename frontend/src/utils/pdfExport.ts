import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { AfterActionReport } from '@/types/session'

export const exportToPDF = async (
  element: HTMLElement,
  report: AfterActionReport,
  userName: string
): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#030712',
      scale: 2,
      logging: false,
      useCORS: true,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10

    pdf.setFillColor(3, 7, 18)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')

    pdf.setTextColor(164, 255, 0)
    pdf.setFontSize(24)
    pdf.text('CPR Training After-Action Report', margin, 20)

    pdf.setTextColor(200, 200, 200)
    pdf.setFontSize(12)
    pdf.text(`Trainee: ${userName}`, margin, 30)
    pdf.text(`Date: ${format(report.session.startTime, 'MMMM d, yyyy')}`, margin, 36)
    pdf.text(`Session ID: ${report.session.id}`, margin, 42)

    pdf.setDrawColor(100, 100, 100)
    pdf.line(margin, 48, pageWidth - margin, 48)

    let yPosition = 58

    pdf.setTextColor(164, 255, 0)
    pdf.setFontSize(16)
    pdf.text('Performance Summary', margin, yPosition)
    yPosition += 10

    pdf.setTextColor(200, 200, 200)
    pdf.setFontSize(11)
    pdf.text(`Overall Score: ${report.summary.performanceScore}%`, margin, yPosition)
    yPosition += 6
    pdf.text(`Total Compressions: ${report.session.totalCompressions}`, margin, yPosition)
    yPosition += 6
    pdf.text(`Average Compression Rate: ${report.session.avgCompressionRate} CPM`, margin, yPosition)
    yPosition += 6
    pdf.text(`Average Compression Depth: ${report.session.avgCompressionDepth} cm`, margin, yPosition)
    yPosition += 6
    pdf.text(`Total Corrections: ${report.summary.totalCorrections} (${report.summary.criticalErrors} critical)`, margin, yPosition)
    yPosition += 12

    if (report.session.certification) {
      pdf.setTextColor(report.session.certification.passed ? 100 : 255, 255, 100)
      pdf.setFontSize(14)
      pdf.text(
        `Certification Status: ${report.session.certification.passed ? 'PASSED' : 'NOT PASSED'}`,
        margin,
        yPosition
      )
      if (report.session.certification.certificateId) {
        yPosition += 6
        pdf.setFontSize(10)
        pdf.text(`Certificate ID: ${report.session.certification.certificateId}`, margin, yPosition)
      }
      yPosition += 12
    }

    if (report.summary.strengths.length > 0) {
      pdf.setTextColor(164, 255, 0)
      pdf.setFontSize(14)
      pdf.text('Strengths', margin, yPosition)
      yPosition += 8
      
      pdf.setTextColor(200, 200, 200)
      pdf.setFontSize(10)
      report.summary.strengths.forEach(strength => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        const lines = pdf.splitTextToSize(`• ${strength}`, pageWidth - (margin * 2))
        lines.forEach((line: string) => {
          pdf.text(line, margin + 2, yPosition)
          yPosition += 5
        })
      })
      yPosition += 5
    }

    if (report.summary.areasForImprovement.length > 0) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setTextColor(255, 200, 0)
      pdf.setFontSize(14)
      pdf.text('Areas for Improvement', margin, yPosition)
      yPosition += 8
      
      pdf.setTextColor(200, 200, 200)
      pdf.setFontSize(10)
      report.summary.areasForImprovement.forEach(area => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        const lines = pdf.splitTextToSize(`• ${area}`, pageWidth - (margin * 2))
        lines.forEach((line: string) => {
          pdf.text(line, margin + 2, yPosition)
          yPosition += 5
        })
      })
      yPosition += 5
    }

    if (report.recommendations.length > 0) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setTextColor(200, 150, 255)
      pdf.setFontSize(14)
      pdf.text('Training Recommendations', margin, yPosition)
      yPosition += 8
      
      pdf.setTextColor(200, 200, 200)
      pdf.setFontSize(10)
      report.recommendations.forEach((recommendation, index) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        const lines = pdf.splitTextToSize(`${index + 1}. ${recommendation}`, pageWidth - (margin * 2))
        lines.forEach((line: string) => {
          pdf.text(line, margin + 2, yPosition)
          yPosition += 5
        })
      })
    }

    pdf.addPage()
    pdf.setTextColor(164, 255, 0)
    pdf.setFontSize(16)
    pdf.text('Session Timeline', margin, 20)
    
    const imgWidth = pageWidth - (margin * 2)
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    let currentY = 30
    const maxHeight = pageHeight - 40
    
    if (imgHeight > maxHeight) {
      const scaledHeight = maxHeight
      const scaledWidth = (scaledHeight * canvas.width) / canvas.height
      pdf.addImage(imgData, 'PNG', margin, currentY, scaledWidth, scaledHeight)
    } else {
      pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight)
    }

    pdf.setTextColor(150, 150, 150)
    pdf.setFontSize(8)
    pdf.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, margin, pageHeight - 5)
    pdf.text('Rescue CPR Training System', pageWidth - margin - 40, pageHeight - 5)

    const filename = `CPR_Report_${format(report.session.startTime, 'yyyy-MM-dd')}_${report.session.id.slice(0, 8)}.pdf`
    pdf.save(filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF report')
  }
}