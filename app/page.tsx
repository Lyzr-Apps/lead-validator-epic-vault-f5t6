'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  FiUploadCloud,
  FiDownload,
  FiSearch,
  FiAlertTriangle,
  FiFile,
  FiTrash2,
  FiClock,
  FiDatabase,
  FiActivity,
  FiUsers,
  FiMail,
  FiPhone,
  FiLink,
  FiSettings,
  FiGrid,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiZap,
  FiShield,
  FiAward,
  FiTrendingUp,
  FiLayers,
  FiCpu,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiArrowRight
} from 'react-icons/fi'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const AGENT_ID = '699af2de0271d733cc3bee05'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface LeadSummary {
  total_records: number
  valid_emails: number
  invalid_emails: number
  suspicious_emails: number
  enriched_fields: number
  duplicates_removed: number
  quality_score: number
}

interface CleanRecord {
  email: string
  email_status: string
  name: string
  company: string
  job_title: string
  phone: string
  linkedin_url: string
  row_status: string
  completeness: number
}

interface ArtifactFile {
  file_url: string
  name?: string
  format_type?: string
}

interface ProcessingResult {
  status: string
  message: string
  summary: LeadSummary
  cleanRecords: CleanRecord[]
  artifactFiles: ArtifactFile[]
}

interface HistoryRun {
  id: string
  fileName: string
  dateProcessed: string
  recordCount: number
  qualityScore: number
  summary: LeadSummary
  cleanRecords: CleanRecord[]
  artifactFiles: ArtifactFile[]
}

interface CSVData {
  headers: string[]
  rows: Record<string, string>[]
}

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────

const SAMPLE_SUMMARY: LeadSummary = {
  total_records: 247,
  valid_emails: 198,
  invalid_emails: 23,
  suspicious_emails: 26,
  enriched_fields: 312,
  duplicates_removed: 14,
  quality_score: 82
}

const SAMPLE_RECORDS: CleanRecord[] = [
  { email: 'sarah.chen@techcorp.io', email_status: 'valid', name: 'Sarah Chen', company: 'TechCorp Solutions', job_title: 'VP of Engineering', phone: '+1-415-555-0142', linkedin_url: 'https://linkedin.com/in/sarahchen', row_status: 'green', completeness: 95 },
  { email: 'j.martinez@innovate.com', email_status: 'valid', name: 'James Martinez', company: 'Innovate Labs', job_title: 'Head of Product', phone: '+1-650-555-0198', linkedin_url: 'https://linkedin.com/in/jmartinez', row_status: 'green', completeness: 100 },
  { email: 'emily.r@startup.co', email_status: 'suspicious', name: 'Emily Rogers', company: 'StartupCo', job_title: 'CTO', phone: '', linkedin_url: 'https://linkedin.com/in/emilyrogers', row_status: 'yellow', completeness: 72 },
  { email: 'invalid@notreal.xyz', email_status: 'invalid', name: 'Unknown Contact', company: '', job_title: '', phone: '', linkedin_url: '', row_status: 'red', completeness: 18 },
  { email: 'david.kim@enterprise.com', email_status: 'valid', name: 'David Kim', company: 'Enterprise Global', job_title: 'Director of Sales', phone: '+1-212-555-0167', linkedin_url: 'https://linkedin.com/in/davidkim', row_status: 'green', completeness: 88 },
]

const SAMPLE_CSV_DATA: CSVData = {
  headers: ['email', 'name', 'company', 'job_title', 'phone'],
  rows: [
    { email: 'sarah.chen@techcorp.io', name: 'Sarah Chen', company: 'TechCorp Solutions', job_title: 'VP of Engineering', phone: '+1-415-555-0142' },
    { email: 'j.martinez@innovate.com', name: 'James Martinez', company: 'Innovate Labs', job_title: 'Head of Product', phone: '+1-650-555-0198' },
    { email: 'emily.r@startup.co', name: 'Emily Rogers', company: 'StartupCo', job_title: 'CTO', phone: '' },
    { email: 'invalid@notreal.xyz', name: '', company: '', job_title: '', phone: '' },
    { email: 'david.kim@enterprise.com', name: 'David Kim', company: 'Enterprise Global', job_title: 'Director of Sales', phone: '+1-212-555-0167' },
  ]
}

const SAMPLE_HISTORY: HistoryRun[] = [
  {
    id: 'run-001',
    fileName: 'q4_leads_techsector.csv',
    dateProcessed: '2025-01-15T14:30:00Z',
    recordCount: 247,
    qualityScore: 82,
    summary: SAMPLE_SUMMARY,
    cleanRecords: SAMPLE_RECORDS,
    artifactFiles: []
  },
  {
    id: 'run-002',
    fileName: 'conference_contacts_2024.csv',
    dateProcessed: '2025-01-10T09:15:00Z',
    recordCount: 156,
    qualityScore: 91,
    summary: { ...SAMPLE_SUMMARY, total_records: 156, valid_emails: 142, invalid_emails: 8, suspicious_emails: 6, quality_score: 91 },
    cleanRecords: SAMPLE_RECORDS.slice(0, 3),
    artifactFiles: []
  },
  {
    id: 'run-003',
    fileName: 'marketing_outreach_list.csv',
    dateProcessed: '2025-01-05T16:45:00Z',
    recordCount: 89,
    qualityScore: 74,
    summary: { ...SAMPLE_SUMMARY, total_records: 89, valid_emails: 62, invalid_emails: 15, suspicious_emails: 12, quality_score: 74 },
    cleanRecords: SAMPLE_RECORDS.slice(0, 2),
    artifactFiles: []
  }
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseCSV(text: string): CSVData {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
  return { headers, rows }
}

function parseAgentResponse(result: AIAgentResponse): ProcessingResult | null {
  if (!result.success) return null

  let data = result.response?.result

  if (typeof data === 'string') {
    data = parseLLMJson(data)
  }

  if (data?.response?.result) {
    data = data.response.result
  }

  if (data?.result && typeof data.result === 'object' && data.result.summary) {
    data = data.result
  }

  const summary: LeadSummary = {
    total_records: data?.summary?.total_records ?? 0,
    valid_emails: data?.summary?.valid_emails ?? 0,
    invalid_emails: data?.summary?.invalid_emails ?? 0,
    suspicious_emails: data?.summary?.suspicious_emails ?? 0,
    enriched_fields: data?.summary?.enriched_fields ?? 0,
    duplicates_removed: data?.summary?.duplicates_removed ?? 0,
    quality_score: data?.summary?.quality_score ?? 0
  }

  const cleanRecords: CleanRecord[] = Array.isArray(data?.clean_records)
    ? data.clean_records.map((r: any) => ({
        email: r?.email ?? '',
        email_status: r?.email_status ?? 'unknown',
        name: r?.name ?? '',
        company: r?.company ?? '',
        job_title: r?.job_title ?? '',
        phone: r?.phone ?? '',
        linkedin_url: r?.linkedin_url ?? '',
        row_status: r?.row_status ?? 'yellow',
        completeness: r?.completeness ?? 0
      }))
    : []

  const artifactFiles: ArtifactFile[] = Array.isArray(result.module_outputs?.artifact_files)
    ? result.module_outputs!.artifact_files.map((f: any) => ({
        file_url: f?.file_url ?? '',
        name: f?.name ?? '',
        format_type: f?.format_type ?? ''
      }))
    : []

  return {
    status: data?.status ?? 'completed',
    message: data?.message ?? '',
    summary,
    cleanRecords,
    artifactFiles
  }
}

function downloadCSV(records: CleanRecord[], filename?: string) {
  if (!records.length) return
  const headers = ['email', 'email_status', 'name', 'company', 'job_title', 'phone', 'linkedin_url', 'row_status', 'completeness']
  const csv = [
    headers.join(','),
    ...records.map(r => headers.map(h => {
      const val = (r as any)[h] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'leadforge_clean_leads.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'valid': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'invalid': return 'bg-red-100 text-red-700 border-red-200'
    case 'suspicious': return 'bg-amber-100 text-amber-700 border-amber-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getRowBg(rowStatus: string): string {
  switch (rowStatus?.toLowerCase()) {
    case 'green': return 'bg-emerald-50/50'
    case 'yellow': return 'bg-amber-50/50'
    case 'red': return 'bg-red-50/50'
    default: return ''
  }
}

function getQualityColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getQualityBadge(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── GLASS CARD ───────────────────────────────────────────────────────────────

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md rounded-[0.875rem]', className)}>
      {children}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <GlassCard className="p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={cn('w-10 h-10 rounded-[0.625rem] flex items-center justify-center', color || 'bg-emerald-100 text-emerald-600')}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </GlassCard>
  )
}

// ─── FILE DROPZONE ────────────────────────────────────────────────────────────

function FileDropzone({ onFileSelect, currentFile, onRemove, disabled }: {
  onFileSelect: (file: File, content: string) => void
  currentFile: File | null
  onRemove: () => void
  disabled?: boolean
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) onFileSelect(file, text)
    }
    reader.readAsText(file)
  }, [onFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile, disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  if (currentFile) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[0.625rem] bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FiFile className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{currentFile.name}</p>
              <p className="text-xs text-muted-foreground">{(currentFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled} className="text-muted-foreground hover:text-destructive">
            <FiTrash2 className="w-4 h-4" />
          </Button>
        </div>
      </GlassCard>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-[0.875rem] p-10 text-center cursor-pointer transition-all duration-200',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-white/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <FiUploadCloud className="w-7 h-7" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Drop your CSV file here, or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Supports .csv files up to 10MB</p>
        </div>
      </div>
    </div>
  )
}

// ─── CSV PREVIEW ──────────────────────────────────────────────────────────────

function CSVPreview({ data }: { data: CSVData }) {
  const previewRows = data.rows.slice(0, 5)

  if (data.headers.length === 0) return null

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.18]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Preview ({data.rows.length} rows detected)</p>
          <div className="flex flex-wrap gap-1.5">
            {data.headers.map((h, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">{h}</Badge>
            ))}
          </div>
        </div>
      </div>
      <ScrollArea className="max-h-[200px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {data.headers.map((h, i) => (
                <TableHead key={i} className="text-xs font-medium whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, i) => (
              <TableRow key={i}>
                {data.headers.map((h, j) => (
                  <TableCell key={j} className="text-xs py-2 whitespace-nowrap max-w-[200px] truncate">{row[h] || '-'}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </GlassCard>
  )
}

// ─── RESULTS TABLE ────────────────────────────────────────────────────────────

function ResultsTable({ records, sortField, sortDir, onSort }: {
  records: CleanRecord[]
  sortField: string
  sortDir: 'asc' | 'desc'
  onSort: (field: string) => void
}) {
  const columns = [
    { key: 'email', label: 'Email', icon: <FiMail className="w-3.5 h-3.5" /> },
    { key: 'email_status', label: 'Status', icon: <FiShield className="w-3.5 h-3.5" /> },
    { key: 'name', label: 'Name', icon: <FiUsers className="w-3.5 h-3.5" /> },
    { key: 'company', label: 'Company', icon: <FiDatabase className="w-3.5 h-3.5" /> },
    { key: 'job_title', label: 'Job Title', icon: <FiAward className="w-3.5 h-3.5" /> },
    { key: 'phone', label: 'Phone', icon: <FiPhone className="w-3.5 h-3.5" /> },
    { key: 'linkedin_url', label: 'LinkedIn', icon: <FiLink className="w-3.5 h-3.5" /> },
    { key: 'completeness', label: 'Completeness', icon: <FiTrendingUp className="w-3.5 h-3.5" /> },
  ]

  return (
    <ScrollArea className="h-[420px]">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            {columns.map(col => (
              <TableHead key={col.key} className="text-xs font-medium whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort(col.key)}>
                <div className="flex items-center gap-1.5">
                  {col.icon}
                  {col.label}
                  {sortField === col.key && (
                    sortDir === 'asc' ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((rec, i) => (
            <TableRow key={i} className={cn('transition-colors', getRowBg(rec.row_status))}>
              <TableCell className="text-xs font-medium py-2.5 whitespace-nowrap">{rec.email || '-'}</TableCell>
              <TableCell className="py-2.5">
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', getStatusColor(rec.email_status))}>
                  {rec.email_status === 'valid' && <FiCheckCircle className="w-3 h-3" />}
                  {rec.email_status === 'invalid' && <FiXCircle className="w-3 h-3" />}
                  {rec.email_status === 'suspicious' && <FiAlertCircle className="w-3 h-3" />}
                  {rec.email_status ? rec.email_status.charAt(0).toUpperCase() + rec.email_status.slice(1) : 'Unknown'}
                </span>
              </TableCell>
              <TableCell className="text-xs py-2.5 whitespace-nowrap">{rec.name || '-'}</TableCell>
              <TableCell className="text-xs py-2.5 whitespace-nowrap">{rec.company || '-'}</TableCell>
              <TableCell className="text-xs py-2.5 whitespace-nowrap">{rec.job_title || '-'}</TableCell>
              <TableCell className="text-xs py-2.5 whitespace-nowrap">{rec.phone || '-'}</TableCell>
              <TableCell className="text-xs py-2.5">
                {rec.linkedin_url ? (
                  <a href={rec.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <FiLink className="w-3 h-3" />
                    <span>Profile</span>
                  </a>
                ) : '-'}
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', rec.completeness >= 80 ? 'bg-emerald-500' : rec.completeness >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${Math.min(rec.completeness, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{rec.completeness}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

// ─── PROCESSING STATE ─────────────────────────────────────────────────────────

function ProcessingIndicator({ progress, step }: { progress: number; step: string }) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <FiRefreshCw className="w-5 h-5 text-primary animate-spin" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Processing your leads</p>
          <p className="text-xs text-muted-foreground">{step}</p>
        </div>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between mt-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', progress >= 10 ? 'bg-emerald-500' : 'bg-muted')} />
          <span className={cn('text-xs', progress >= 10 ? 'text-foreground' : 'text-muted-foreground')}>Validating</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', progress >= 40 ? 'bg-emerald-500' : 'bg-muted')} />
          <span className={cn('text-xs', progress >= 40 ? 'text-foreground' : 'text-muted-foreground')}>Enriching</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', progress >= 75 ? 'bg-emerald-500' : 'bg-muted')} />
          <span className={cn('text-xs', progress >= 75 ? 'text-foreground' : 'text-muted-foreground')}>Cleaning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', progress >= 100 ? 'bg-emerald-500' : 'bg-muted')} />
          <span className={cn('text-xs', progress >= 100 ? 'text-foreground' : 'text-muted-foreground')}>Complete</span>
        </div>
      </div>
    </GlassCard>
  )
}

// ─── RESULTS DISPLAY ──────────────────────────────────────────────────────────

function ResultsDisplay({ result, onDownload }: { result: ProcessingResult; onDownload: () => void }) {
  const [sortField, setSortField] = useState('completeness')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }, [sortField])

  const sortedRecords = useMemo(() => {
    const records = [...result.cleanRecords]
    records.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? ''
      const bVal = (b as any)[sortField] ?? ''
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    return records
  }, [result.cleanRecords, sortField, sortDir])

  const s = result.summary

  return (
    <div className="space-y-6">
      {/* Status message */}
      {result.message && (
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <FiCheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-foreground">{renderMarkdown(result.message)}</div>
          </div>
        </GlassCard>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<FiDatabase className="w-5 h-5" />}
          label="Total Records"
          value={s.total_records}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={<FiCheckCircle className="w-5 h-5" />}
          label="Valid Emails"
          value={s.valid_emails}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={<FiXCircle className="w-5 h-5" />}
          label="Invalid Emails"
          value={s.invalid_emails}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          icon={<FiAlertCircle className="w-5 h-5" />}
          label="Suspicious"
          value={s.suspicious_emails}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          icon={<FiZap className="w-5 h-5" />}
          label="Enriched Fields"
          value={s.enriched_fields}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          icon={<FiLayers className="w-5 h-5" />}
          label="Dupes Removed"
          value={s.duplicates_removed}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Quality Score */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[0.625rem] bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FiAward className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Quality Score</p>
              <p className="text-xs text-muted-foreground">{getQualityBadge(s.quality_score)} data quality</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32">
              <Progress value={s.quality_score} className="h-2.5" />
            </div>
            <span className={cn('text-2xl font-semibold tracking-tight', getQualityColor(s.quality_score))}>{s.quality_score}%</span>
          </div>
        </div>
      </GlassCard>

      {/* Data table header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">Cleaned Records</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{result.cleanRecords.length} records processed</p>
        </div>
        <Button onClick={onDownload} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[0.875rem]">
          <FiDownload className="w-4 h-4" />
          Download
        </Button>
      </div>

      {/* Data table */}
      <GlassCard className="overflow-hidden">
        <ResultsTable records={sortedRecords} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
      </GlassCard>
    </div>
  )
}

// ─── HISTORY CARD ─────────────────────────────────────────────────────────────

function HistoryCard({ run, onView }: { run: HistoryRun; onView: () => void }) {
  return (
    <GlassCard className="p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[0.625rem] bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <FiFile className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{run.fileName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <FiClock className="w-3 h-3" />
              {formatDate(run.dateProcessed)}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className={cn('font-medium', getQualityColor(run.qualityScore))}>
          {run.qualityScore}% Quality
        </Badge>
      </div>
      <Separator className="my-3 bg-white/[0.18]" />
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{run.recordCount}</span> records
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-emerald-600">{run.summary?.valid_emails ?? 0}</span> valid
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-red-600">{run.summary?.invalid_emails ?? 0}</span> invalid
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary font-medium">
          View Results <FiArrowRight className="w-3 h-3" />
        </div>
      </div>
    </GlassCard>
  )
}

// ─── AGENT STATUS ─────────────────────────────────────────────────────────────

function AgentStatusPanel({ activeAgentId, isProcessing }: { activeAgentId: string | null; isProcessing: boolean }) {
  const agents = [
    { id: AGENT_ID, name: 'Lead Processing Manager', purpose: 'Coordinates validation, enrichment, and cleaning workflow' },
    { id: 'sub-1', name: 'Email Validation Agent', purpose: 'Validates email addresses and detects invalid/suspicious entries' },
    { id: 'sub-2', name: 'Data Enrichment Agent', purpose: 'Enriches lead records with missing company and contact data' },
    { id: 'sub-3', name: 'Clean Output Agent', purpose: 'Deduplicates and formats final clean records' },
  ]

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiCpu className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Agent Status</p>
      </div>
      <div className="space-y-2">
        {agents.map((agent) => {
          const isActive = isProcessing && (activeAgentId === agent.id || agent.id === AGENT_ID)
          return (
            <div key={agent.id} className="flex items-center gap-2.5">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30')} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                <p className="text-xs text-muted-foreground truncate">{agent.purpose}</p>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Page() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard')

  // Sample data toggle
  const [showSample, setShowSample] = useState(false)

  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState('')
  const [csvData, setCsvData] = useState<CSVData | null>(null)

  // Config
  const [outputFormat, setOutputFormat] = useState('csv')
  const [enrichmentDepth, setEnrichmentDepth] = useState<'basic' | 'deep'>('basic')
  const [removeDuplicates, setRemoveDuplicates] = useState(true)

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState(0)
  const [processStep, setProcessStep] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Results
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // History
  const [history, setHistory] = useState<HistoryRun[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [viewingHistoryRun, setViewingHistoryRun] = useState<HistoryRun | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('leadforge_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Save history to localStorage
  const saveHistory = useCallback((runs: HistoryRun[]) => {
    setHistory(runs)
    try {
      localStorage.setItem('leadforge_history', JSON.stringify(runs))
    } catch {
      // ignore
    }
  }, [])

  // File upload handler
  const handleFileSelect = useCallback((file: File, content: string) => {
    setUploadedFile(file)
    setCsvContent(content)
    setCsvData(parseCSV(content))
    setResult(null)
    setErrorMessage(null)
  }, [])

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null)
    setCsvContent('')
    setCsvData(null)
    setResult(null)
    setErrorMessage(null)
  }, [])

  // Process leads
  const handleProcess = useCallback(async () => {
    if (!uploadedFile || !csvContent) return

    setIsProcessing(true)
    setResult(null)
    setErrorMessage(null)
    setActiveAgentId(AGENT_ID)
    setProcessProgress(5)
    setProcessStep('Uploading file...')

    try {
      // Simulate progress while waiting for agent
      const progressInterval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev < 30) {
            setProcessStep('Validating emails...')
            return prev + 2
          }
          if (prev < 60) {
            setProcessStep('Enriching data...')
            return prev + 1.5
          }
          if (prev < 85) {
            setProcessStep('Cleaning output...')
            return prev + 0.8
          }
          return prev
        })
      }, 500)

      // Upload file
      const uploadResult = await uploadFiles(uploadedFile)
      const assetIds = Array.isArray(uploadResult?.asset_ids) ? uploadResult.asset_ids : []

      // Call the manager agent
      const message = `Process this CSV lead list. Validate emails, enrich missing data, and clean the output. Output format: ${outputFormat}. Enrichment depth: ${enrichmentDepth}. Remove duplicates: ${removeDuplicates ? 'yes' : 'no'}. Here is the CSV data:\n${csvContent}`

      const agentResult = await callAIAgent(message, AGENT_ID, assetIds.length > 0 ? { assets: assetIds } : undefined)

      clearInterval(progressInterval)
      setProcessProgress(100)
      setProcessStep('Complete!')

      const parsed = parseAgentResponse(agentResult)

      if (parsed) {
        setResult(parsed)

        // Save to history
        const newRun: HistoryRun = {
          id: `run-${Date.now()}`,
          fileName: uploadedFile.name,
          dateProcessed: new Date().toISOString(),
          recordCount: parsed.summary.total_records,
          qualityScore: parsed.summary.quality_score,
          summary: parsed.summary,
          cleanRecords: parsed.cleanRecords,
          artifactFiles: parsed.artifactFiles
        }
        saveHistory([newRun, ...history])
      } else {
        setErrorMessage(agentResult?.error || agentResult?.response?.message || 'Failed to process leads. The agent returned an unexpected response format.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsProcessing(false)
      setActiveAgentId(null)
    }
  }, [uploadedFile, csvContent, outputFormat, enrichmentDepth, removeDuplicates, history, saveHistory])

  // Download handler
  const handleDownload = useCallback(() => {
    const data = viewingHistoryRun || result
    if (!data) return

    // Check for artifact files first
    const artifacts = Array.isArray(data.artifactFiles) ? data.artifactFiles : []
    if (artifacts.length > 0 && artifacts[0]?.file_url) {
      window.open(artifacts[0].file_url, '_blank')
      return
    }

    // Fallback: generate CSV client-side
    const records = Array.isArray(data.cleanRecords) ? data.cleanRecords : []
    downloadCSV(records, `leadforge_${data.fileName || 'clean_leads'}.csv`)
  }, [result, viewingHistoryRun])

  // Sample data display
  const displayResult = showSample && !result ? {
    status: 'completed',
    message: 'Successfully processed 247 lead records. 198 emails validated, 23 invalid emails flagged, 14 duplicates removed. Overall quality score: 82%.',
    summary: SAMPLE_SUMMARY,
    cleanRecords: SAMPLE_RECORDS,
    artifactFiles: []
  } as ProcessingResult : result

  const displayCsvData = showSample && !csvData ? SAMPLE_CSV_DATA : csvData

  // History filtering
  const filteredHistory = useMemo(() => {
    const source = showSample && history.length === 0 ? SAMPLE_HISTORY : history
    if (!historySearch.trim()) return source
    return source.filter(r => r.fileName.toLowerCase().includes(historySearch.toLowerCase()))
  }, [history, historySearch, showSample])

  // Handle viewing a history run
  const handleViewHistoryRun = useCallback((run: HistoryRun) => {
    setViewingHistoryRun(run)
  }, [])

  const handleBackFromHistory = useCallback(() => {
    setViewingHistoryRun(null)
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen font-sans tracking-tight" style={{ background: 'linear-gradient(135deg, hsl(160, 40%, 94%) 0%, hsl(180, 35%, 93%) 30%, hsl(160, 35%, 95%) 60%, hsl(140, 40%, 94%) 100%)' }}>
        {/* ─── HEADER ──────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 backdrop-blur-[16px] bg-white/60 border-b border-white/[0.18]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[0.625rem] bg-primary flex items-center justify-center">
                <FiZap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none">LeadForge</h1>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">Lead Validation & Enrichment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">Sample Data</Label>
              <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* ─── SIDEBAR ────────────────────────────────────── */}
            <aside className="hidden md:block w-56 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                <GlassCard className="p-2">
                  <nav className="space-y-1">
                    <button
                      onClick={() => { setActiveTab('dashboard'); setViewingHistoryRun(null) }}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[0.625rem] text-sm font-medium transition-colors', activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/50')}
                    >
                      <FiGrid className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => { setActiveTab('history'); setViewingHistoryRun(null) }}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[0.625rem] text-sm font-medium transition-colors', activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/50')}
                    >
                      <FiClock className="w-4 h-4" />
                      History
                      {(showSample ? SAMPLE_HISTORY.length : history.length) > 0 && (
                        <Badge variant="secondary" className="ml-auto text-xs">{showSample && history.length === 0 ? SAMPLE_HISTORY.length : history.length}</Badge>
                      )}
                    </button>
                  </nav>
                </GlassCard>

                <AgentStatusPanel activeAgentId={activeAgentId} isProcessing={isProcessing} />
              </div>
            </aside>

            {/* ─── MAIN CONTENT ───────────────────────────────── */}
            <main className="flex-1 min-w-0">
              {/* Mobile nav */}
              <div className="md:hidden mb-4">
                <GlassCard className="p-1.5 flex gap-1">
                  <button
                    onClick={() => { setActiveTab('dashboard'); setViewingHistoryRun(null) }}
                    className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[0.625rem] text-sm font-medium transition-colors', activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  >
                    <FiGrid className="w-4 h-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => { setActiveTab('history'); setViewingHistoryRun(null) }}
                    className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[0.625rem] text-sm font-medium transition-colors', activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  >
                    <FiClock className="w-4 h-4" />
                    History
                  </button>
                </GlassCard>
              </div>

              {/* ─── DASHBOARD TAB ─────────────────────────── */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Page header */}
                  <div>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">Process Leads</h2>
                    <p className="text-sm text-muted-foreground mt-1">Upload a CSV file to validate emails, enrich data, and clean your lead list.</p>
                  </div>

                  {/* File Upload */}
                  <FileDropzone
                    onFileSelect={handleFileSelect}
                    currentFile={showSample && !uploadedFile ? { name: 'q4_leads_techsector.csv', size: 48200 } as File : uploadedFile}
                    onRemove={handleRemoveFile}
                    disabled={isProcessing}
                  />

                  {/* CSV Preview */}
                  {displayCsvData && (displayCsvData.headers.length > 0) && (
                    <CSVPreview data={displayCsvData} />
                  )}

                  {/* Configuration */}
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <FiSettings className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Configuration</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Output Format */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Output Format</Label>
                        <Select value={outputFormat} onValueChange={setOutputFormat} disabled={isProcessing}>
                          <SelectTrigger className="rounded-[0.625rem] bg-white/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="xlsx">XLSX</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Enrichment Depth */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Enrichment Depth</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={enrichmentDepth === 'basic' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 rounded-[0.625rem] text-xs"
                            onClick={() => setEnrichmentDepth('basic')}
                            disabled={isProcessing}
                          >
                            Basic
                          </Button>
                          <Button
                            variant={enrichmentDepth === 'deep' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 rounded-[0.625rem] text-xs"
                            onClick={() => setEnrichmentDepth('deep')}
                            disabled={isProcessing}
                          >
                            Deep
                          </Button>
                        </div>
                      </div>

                      {/* Duplicates */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Duplicate Handling</Label>
                        <div className="flex items-center gap-2 pt-1">
                          <Switch checked={removeDuplicates} onCheckedChange={setRemoveDuplicates} disabled={isProcessing} />
                          <span className="text-xs text-foreground font-medium">{removeDuplicates ? 'Remove' : 'Keep'}</span>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex items-end">
                        <Button
                          onClick={handleProcess}
                          disabled={isProcessing || (!uploadedFile && !showSample)}
                          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[0.875rem] h-10"
                        >
                          {isProcessing ? (
                            <>
                              <FiRefreshCw className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <FiZap className="w-4 h-4" />
                              Validate & Enrich
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Error */}
                  {errorMessage && (
                    <GlassCard className="p-4 border-red-200/50">
                      <div className="flex items-start gap-3">
                        <FiAlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-700">Processing Error</p>
                          <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 text-xs rounded-[0.625rem]"
                            onClick={() => { setErrorMessage(null); handleProcess() }}
                          >
                            <FiRefreshCw className="w-3 h-3 mr-1.5" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Processing */}
                  {isProcessing && (
                    <ProcessingIndicator progress={processProgress} step={processStep} />
                  )}

                  {/* Results */}
                  {displayResult && !isProcessing && (
                    <ResultsDisplay result={displayResult} onDownload={handleDownload} />
                  )}

                  {/* Empty state */}
                  {!displayResult && !isProcessing && !errorMessage && !uploadedFile && !showSample && (
                    <GlassCard className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <FiUploadCloud className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">Ready to process your leads</h3>
                          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                            Upload a CSV file with your lead data. LeadForge will validate emails, enrich missing fields, remove duplicates, and deliver a clean dataset.
                          </p>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <Button variant="outline" className="rounded-[0.875rem] text-xs gap-2" onClick={() => setShowSample(true)}>
                            <FiActivity className="w-3.5 h-3.5" />
                            View Sample
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Mobile agent status */}
                  <div className="md:hidden">
                    <AgentStatusPanel activeAgentId={activeAgentId} isProcessing={isProcessing} />
                  </div>
                </div>
              )}

              {/* ─── HISTORY TAB ───────────────────────────── */}
              {activeTab === 'history' && !viewingHistoryRun && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground tracking-tight">Processing History</h2>
                      <p className="text-sm text-muted-foreground mt-1">View past processing runs and re-access results.</p>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by filename..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-10 rounded-[0.875rem] bg-white/50 border-white/[0.18]"
                    />
                  </div>

                  {/* History list */}
                  {filteredHistory.length > 0 ? (
                    <div className="space-y-3">
                      {filteredHistory.map((run) => (
                        <HistoryCard key={run.id} run={run} onView={() => handleViewHistoryRun(run)} />
                      ))}
                    </div>
                  ) : (
                    <GlassCard className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                          <FiClock className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">No runs yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {historySearch ? 'No results match your search. Try a different filename.' : 'Process your first lead list to see it appear here.'}
                          </p>
                        </div>
                        {!historySearch && (
                          <Button variant="outline" className="rounded-[0.875rem] text-xs gap-2" onClick={() => setActiveTab('dashboard')}>
                            <FiArrowRight className="w-3.5 h-3.5" />
                            Go to Dashboard
                          </Button>
                        )}
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* ─── HISTORY DETAIL VIEW ───────────────────── */}
              {activeTab === 'history' && viewingHistoryRun && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleBackFromHistory} className="gap-1.5 text-xs rounded-[0.625rem]">
                      <FiChevronUp className="w-3.5 h-3.5 -rotate-90" />
                      Back to History
                    </Button>
                    <Separator orientation="vertical" className="h-5 bg-border" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground tracking-tight">{viewingHistoryRun.fileName}</h2>
                      <p className="text-xs text-muted-foreground">{formatDate(viewingHistoryRun.dateProcessed)}</p>
                    </div>
                  </div>

                  <ResultsDisplay
                    result={{
                      status: 'completed',
                      message: '',
                      summary: viewingHistoryRun.summary,
                      cleanRecords: viewingHistoryRun.cleanRecords,
                      artifactFiles: viewingHistoryRun.artifactFiles
                    }}
                    onDownload={handleDownload}
                  />
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
