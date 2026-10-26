import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Users,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select } from '../../components/common/Select';
import { leadService } from '../../services/leadService';
import { Campaign, Lead } from '../../types';
import { formatPhoneNumber } from '../../lib/formatters';

export interface LeadCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  onImportComplete: () => void;
}

interface ParsedLeadRow {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  metadata: Record<string, any>;
  isValid: boolean;
  validationError?: string;
}

export const LeadCsvImportModal: React.FC<LeadCsvImportModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setIsImporting(false);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Robust client-side CSV parser
  const parseCsvText = (text: string): ParsedLeadRow[] => {
    const lines = text
      .split(/\r\n|\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      throw new Error('CSV file must contain a header row and at least one contact row.');
    }

    // Split headers respecting quotes
    const splitRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(c => c.replace(/^["']|["']$/g, '').trim());
    };

    const rawHeaders = splitRow(lines[0]);
    const lowerHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Identify primary column indices
    const nameIdx = lowerHeaders.findIndex(h =>
      ['name', 'fullname', 'leadname', 'customer', 'prospect', 'lead'].includes(h)
    );
    const phoneIdx = lowerHeaders.findIndex(h =>
      ['phone', 'mobile', 'phonenumber', 'contact', 'cell', 'telephone'].includes(h)
    );
    const emailIdx = lowerHeaders.findIndex(h =>
      ['email', 'emailaddress', 'mail'].includes(h)
    );

    if (nameIdx === -1 && phoneIdx === -1) {
      throw new Error(
        `Could not detect required columns. Header row had: "${rawHeaders.join(', ')}". Must include "name" and "phone" columns.`
      );
    }

    const rows: ParsedLeadRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = splitRow(lines[i]);
      if (cols.length === 0 || cols.every(c => c === '')) continue;

      const rawName = nameIdx !== -1 ? cols[nameIdx] || '' : `Lead #${i}`;
      const rawPhone = phoneIdx !== -1 ? cols[phoneIdx] || '' : '';
      const rawEmail = emailIdx !== -1 ? cols[emailIdx] || '' : undefined;

      // Harvest metadata from remaining columns
      const metadata: Record<string, any> = {
        importSource: 'CSV Upload',
        importedAt: new Date().toISOString(),
      };

      rawHeaders.forEach((header, idx) => {
        if (idx !== nameIdx && idx !== phoneIdx && idx !== emailIdx && cols[idx]) {
          metadata[header] = cols[idx];
        }
      });

      // Phone Normalization for Indian & E.164 numbers
      const digitsOnly = rawPhone.replace(/\D/g, '');
      let normalizedPhone = rawPhone;
      let isValid = true;
      let validationError: string | undefined = undefined;

      if (!rawName.trim()) {
        isValid = false;
        validationError = 'Missing contact name';
      } else if (!rawPhone.trim()) {
        isValid = false;
        validationError = 'Missing phone number';
      } else if (digitsOnly.length === 10) {
        // Standard 10-digit Indian Mobile -> prepend +91
        normalizedPhone = `+91${digitsOnly}`;
      } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        normalizedPhone = `+${digitsOnly}`;
      } else if (rawPhone.startsWith('+') && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
        normalizedPhone = `+${digitsOnly}`;
      } else {
        isValid = false;
        validationError = `Invalid phone digits (${digitsOnly.length} digits)`;
      }

      rows.push({
        id: `row_${i}`,
        name: rawName,
        phone: rawPhone,
        normalizedPhone,
        email: rawEmail || undefined,
        metadata,
        isValid,
        validationError,
      });
    }

    if (rows.length === 0) {
      throw new Error('No valid contact records found in this file.');
    }

    return rows;
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.type.includes('csv')) {
      setParseError('Please upload a valid .csv file format.');
      return;
    }

    setFile(selectedFile);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCsvText(text);
        setParsedRows(parsed);
      } catch (err: any) {
        setParseError(err?.message || 'Failed to parse CSV file.');
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setParseError('Error reading uploaded file from filesystem.');
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDownloadSample = () => {
    const sampleCsv = `name,phone,email,city,intent_category
Pranav Kulkarni,+919922935920,pranav@fluid.live,Pune,Enterprise AI
Neha Sharma,+919820011223,neha@example.in,Mumbai,Inbound Demo
Aarav Mehta,+919876543210,aarav@example.in,Bengaluru,Voice Agent
Pooja Reddy,+919845012345,pooja@example.in,Hyderabad,High Priority
Vikram Malhotra,+919811098765,vikram@example.in,Delhi NCR,Pricing Query`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fluid_live_sample_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const leadsToImport = validRows.map(r => ({
        name: r.name,
        phone: r.normalizedPhone,
        email: r.email,
        metadata: r.metadata,
      }));

      const res = await leadService.importLeads(
        leadsToImport,
        selectedCampaignId ? selectedCampaignId : undefined
      );

      setImportResult({ count: res.importedCount || leadsToImport.length });
      onImportComplete();
    } catch (err: any) {
      setParseError(err?.message || 'Database batch import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Consumer Leads CSV"
      description="Upload contacts via CSV, automatically validate E.164 phone numbers, and assign them directly to campaigns."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={handleDownloadSample} leftIcon={<Download className="h-4 w-4" />}>
            Download Sample CSV
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={isImporting}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {parsedRows.length > 0 && !importResult && (
              <Button
                size="sm"
                onClick={handleImportSubmit}
                isLoading={isImporting}
                disabled={validCount === 0}
                leftIcon={<Users className="h-4 w-4" />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Import {validCount} Valid Contacts
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Success Confirmation View */}
        {importResult ? (
          <div className="p-8 text-center space-y-3 bg-emerald-50/60 rounded-xl border border-emerald-200 animate-in fade-in">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Successfully Imported {importResult.count} Contacts!
            </h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              All parsed contacts have been written to the Neon PostgreSQL database
              {selectedCampaignId
                ? ` and enrolled in campaign "${campaigns.find(c => c.id === selectedCampaignId)?.name || 'Campaign'}".`
                : '.'}
            </p>
            <div className="pt-2">
              <Button size="sm" onClick={handleClose}>
                Done & Return to Directory
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* File Dropzone */}
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-100/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  Drag and drop your contacts CSV here, or <span className="text-indigo-600 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Supported columns: name, phone/mobile, email, city, intent/metadata
                </p>
              </div>
            ) : (
              /* Selected File Header */
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{file.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} total rows parsed
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetState}
                  leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-500" />}
                  className="text-rose-600 hover:bg-rose-50 text-xs"
                >
                  Choose Different File
                </Button>
              </div>
            )}

            {/* Error Banner */}
            {parseError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Parsing Summary & Campaign Assignment */}
            {parsedRows.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Validation Metrics */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-700 font-semibold">{validCount} Valid Contacts</span>
                    </div>
                    {invalidCount > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{invalidCount} Skipped</span>
                      </div>
                    )}
                  </div>

                  {/* Campaign Target */}
                  <div>
                    <Select
                      value={selectedCampaignId}
                      onChange={e => setSelectedCampaignId(e.target.value)}
                      options={[
                        { value: '', label: 'Unassigned Pool (Do not enroll now)' },
                        ...campaigns.map(c => ({ value: c.id, label: `Assign to: ${c.name}` })),
                      ]}
                    />
                  </div>
                </div>

                {/* Live Preview Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                      Live Data Preview (First {Math.min(5, parsedRows.length)} Rows)
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">E.164 Auto-Normalized</span>
                  </div>

                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Normalized Phone</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Metadata Attributes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedRows.slice(0, 5).map(row => (
                          <tr key={row.id} className={row.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/30'}>
                            <td className="px-4 py-2.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  <Check className="h-3 w-3" />
                                  Valid
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded"
                                  title={row.validationError}
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  Error
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{row.name}</td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-800">
                              {row.isValid ? formatPhoneNumber(row.normalizedPhone) : row.phone}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 text-[11px]">{row.email || '—'}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(row.metadata)
                                  .filter(([k]) => k !== 'importSource' && k !== 'importedAt')
                                  .slice(0, 2)
                                  .map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                    >
                                      {k}: {String(v)}
                                    </span>
                                  ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

