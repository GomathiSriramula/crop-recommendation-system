import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { FEATURE_FIELDS } from './featureRules'

function displayValue(value, fallback = 'Unavailable') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number' && !Number.isFinite(value)) return fallback
  return String(value)
}

function numberValue(value, digits = 2) {
  if (value === null || value === undefined || value === '') return 'Unavailable'
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : 'Unavailable'
}

function rupees(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable'
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 'Unavailable'
  return `Rs. ${parsed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function percent(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable'
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : 'Unavailable'
}

function probability(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable'
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(1)}%` : 'Unavailable'
}

function cropName(crop) {
  return crop ? String(crop) : 'Unavailable'
}

function addBrandHeader(doc, title, reportDate) {
  doc.setFillColor(4, 120, 87)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('SoilWise', 14, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(reportDate, doc.internal.pageSize.getWidth() - 14, 17, { align: 'right' })

  doc.setTextColor(7, 55, 48)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, 14, 42)
}

function addFooter(doc) {
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(226, 232, 240)
    doc.line(14, height - 14, width - 14, height - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`SoilWise Crop Report  |  Page ${page} of ${pages}`, width / 2, height - 8, { align: 'center' })
  }
}

export async function downloadCropReport(result) {
  if (!result || !Array.isArray(result.recommendations) || !result.recommendations.length) {
    throw new Error('No recommendation data is available for this report.')
  }

  const now = new Date()
  const reportDate = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const fileDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  addBrandHeader(doc, 'Crop Recommendation Report', `Generated ${reportDate}`)

  let cursorY = 50
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(4, 120, 87)
  doc.text('Entered Soil and Climate Parameters', 14, cursorY)
  cursorY += 4

  const inputs = result.inputs || {}
  autoTable(doc, {
    startY: cursorY,
    head: [['Parameter', 'Entered value']],
    body: FEATURE_FIELDS.map((field) => [
      field.label,
      displayValue(inputs[field.name]),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: [51, 65, 85] },
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  cursorY = doc.lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Top 5 Recommended Crops', 14, cursorY)
  cursorY += 4
  autoTable(doc, {
    startY: cursorY,
    head: [['Rank', 'Crop', 'Model probability', 'Economic rank']],
    body: result.recommendations.map((item, index) => {
      const economics = item.economics || {}
      const profitAvailable = economics.profit_rs_per_ha !== null && economics.profit_rs_per_ha !== undefined
      const profitRanking = result.recommendations
        .filter((candidate) => candidate.economics?.profit_rs_per_ha !== null && candidate.economics?.profit_rs_per_ha !== undefined)
        .sort((a, b) => Number(b.economics.profit_rs_per_ha) - Number(a.economics.profit_rs_per_ha))
      const economicRank = profitAvailable
        ? profitRanking.findIndex((candidate) => candidate.crop === item.crop) + 1 || 'Unavailable'
        : 'Unavailable'
      return [index + 1, cropName(item.crop), probability(item.probability), economicRank]
    }),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: [51, 65, 85] },
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
  })

  for (const [index, item] of result.recommendations.entries()) {
    doc.addPage()
    addBrandHeader(doc, `${index + 1}. ${cropName(item.crop)}`, `Generated ${reportDate}`)

    const analysis = item.soil_analysis || {}
    const soilRows = FEATURE_FIELDS.map((field) => {
      const keyMap = { N: 'N', P: 'P', K: 'K', temperature: 'temperature', humidity: 'humidity', ph: 'ph', rainfall: 'rainfall' }
      const analysisItem = analysis[keyMap[field.name]] || {}
      const range = analysisItem.range_low !== null && analysisItem.range_low !== undefined && analysisItem.range_high !== null && analysisItem.range_high !== undefined
        ? `${numberValue(analysisItem.range_low)} to ${numberValue(analysisItem.range_high)}`
        : 'Unavailable'
      return [
        field.label,
        displayValue(analysisItem.value ?? inputs[field.name]),
        range,
        displayValue(analysisItem.status, 'Unavailable'),
      ]
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(4, 120, 87)
    doc.text('Soil Analysis for This Crop', 14, 50)
    autoTable(doc, {
      startY: 54,
      head: [['Parameter', 'Your value', 'Dataset range', 'Status']],
      body: soilRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: [51, 65, 85] },
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    cursorY = doc.lastAutoTable.finalY + 10
    const economics = item.economics || {}
    const yieldValue = economics.estimated_yield ?? economics.yield_kg_per_ha ?? economics.yield
    doc.text('Economic Estimate', 14, cursorY)
    cursorY += 4
    autoTable(doc, {
      startY: cursorY,
      head: [['Metric', 'Estimated value']],
      body: [
        ['Estimated yield', yieldValue === undefined ? 'Unavailable (not provided)' : displayValue(yieldValue)],
        ['Revenue per ha', rupees(economics.revenue_rs_per_ha)],
        ['Cost per ha', rupees(economics.cost_rs_per_ha)],
        ['Profit per ha', rupees(economics.profit_rs_per_ha)],
        ['ROI', percent(economics.roi_percent)],
      ],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.4, textColor: [51, 65, 85] },
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })
  }

  doc.addPage()
  addBrandHeader(doc, 'Prediction Explanation and Disclaimers', `Generated ${reportDate}`)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(4, 120, 87)
  doc.text('SHAP Feature Contributions', 14, 50)

  const features = Array.isArray(result.explanation?.features)
    ? [...result.explanation.features].sort((a, b) => Math.abs(Number(b.contribution ?? b.shap ?? 0)) - Math.abs(Number(a.contribution ?? a.shap ?? 0)))
    : []
  if (features.length) {
    autoTable(doc, {
      startY: 54,
      head: [['Feature', 'Value', 'SHAP contribution', 'Effect']],
      body: features.map((item) => {
        const shap = Number(item.contribution ?? item.shap)
        const contribution = Number.isFinite(shap) ? (shap >= 0 ? '+' : '') + shap.toFixed(4) : 'Unavailable'
        const effect = Number.isFinite(shap) ? (shap >= 0 ? 'Supports' : 'Opposes') : displayValue(item.direction)
        return [
          item.feature || 'Unavailable',
          displayValue(item.value ?? inputs[item.feature]),
          contribution,
          effect,
        ]
      }),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: [51, 65, 85] },
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(51, 65, 85)
    doc.text('No SHAP feature contribution data is available in this result.', 14, 58)
  }

  let disclaimerY = features.length ? doc.lastAutoTable.finalY + 12 : 66
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(4, 120, 87)
  doc.text('Important Disclaimer', 14, disclaimerY)
  disclaimerY += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  const disclaimer = 'Crop recommendations and SHAP explanations are model estimates and may not fit every field or season. Economic figures are estimates based on assumed prices and yields, not guaranteed returns. Dataset-derived soil ranges are statistical reference values and are not verified agronomic limits. Results should not replace advice from a qualified agricultural professional or local soil testing service.'
  const disclaimerLines = doc.splitTextToSize(disclaimer, 182)
  doc.text(disclaimerLines, 14, disclaimerY)

  addFooter(doc)
  doc.save(`SoilWise_Crop_Report_${fileDate}.pdf`)
}
