import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Sliders,
  Briefcase,
  Phone,
  Calendar,
  Building2,
  Award,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select } from '../../components/common/Select';
import { leadService } from '../../services/leadService';
import { Campaign } from '../../types';
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

interface ColumnMapping {
  name: string;
  phone: string;
  email: string;
  appliedRole: string;
  portalExperience: string;
  portalNoticePeriod: string;
  portalWorkMode: string;
  portalExpectedCtc: string;
}

export const LeadCsvImportModal: React.FC<LeadCsvImportModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvLines, setCsvLines] = useState<string[][]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    phone: '',
    email: '',
    appliedRole: '',
    portalExperience: '',
    portalNoticePeriod: '',
    portalWorkMode: '',
    portalExpectedCtc: '',
  });
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setFile(null);
    setCsvLines([]);
    setRawHeaders([]);
    setMapping({
      name: '',
      phone: '',
      email: '',
      appliedRole: '',
      portalExperience: '',
      portalNoticePeriod: '',
      portalWorkMode: '',
      portalExpectedCtc: '',
    });
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

  // Helper: split a CSV line respecting quotes
  const splitCsvLine = (row: string): string[] => {
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

  // Process raw CSV text
  const processCsvText = (text: string) => {
    const lines = text
      .split(/\r\n|\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      throw new Error('CSV file must contain a header row and at least one contact row.');
    }

    const headers = splitCsvLine(lines[0]);
    const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const findMatch = (keywords: string[]) => {
      const idx = lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));
      return idx !== -1 ? headers[idx] : '';
    };

    const initialMapping: ColumnMapping = {
      name: findMatch(['name', 'candidate', 'applicant', 'fullname', 'lead']),
      phone: findMatch(['phone', 'mobile', 'contact', 'cell', 'number']),
      email: findMatch(['email', 'mail']),
      appliedRole: findMatch(['role', 'position', 'job', 'designation']),
      portalExperience: findMatch(['experience', 'exp', 'years']),
      portalNoticePeriod: findMatch(['notice', 'joining', 'period']),
      portalWorkMode: findMatch(['location', 'city', 'mode', 'pune']),
      portalExpectedCtc: findMatch(['ctc', 'salary', 'compensation']),
    };

    const dataRows = lines.slice(1).map(l => splitCsvLine(l)).filter(r => r.some(c => c !== ''));

    setRawHeaders(headers);
    setMapping(initialMapping);
    setCsvLines(dataRows);
  };

  // Re-calculate parsedRows whenever mapping or csvLines changes
  useEffect(() => {
    if (csvLines.length === 0 || rawHeaders.length === 0) return;

    const nameIdx = rawHeaders.indexOf(mapping.name);
    const phoneIdx = rawHeaders.indexOf(mapping.phone);
    const emailIdx = rawHeaders.indexOf(mapping.email);
    const roleIdx = rawHeaders.indexOf(mapping.appliedRole);
    const expIdx = rawHeaders.indexOf(mapping.portalExperience);
    const noticeIdx = rawHeaders.indexOf(mapping.portalNoticePeriod);
    const modeIdx = rawHeaders.indexOf(mapping.portalWorkMode);
    const ctcIdx = rawHeaders.indexOf(mapping.portalExpectedCtc);

    const rows: ParsedLeadRow[] = csvLines.map((cols, i) => {
      const rawName = nameIdx !== -1 ? cols[nameIdx] || '' : `Candidate #${i + 1}`;
      const rawPhone = phoneIdx !== -1 ? cols[phoneIdx] || '' : '';
      const rawEmail = emailIdx !== -1 ? cols[emailIdx] || '' : undefined;

      // Extract structured candidate metadata
      const metadata: Record<string, any> = {
        importSource: 'Candidate CSV Upload',
        importedAt: new Date().toISOString(),
      };

      if (roleIdx !== -1 && cols[roleIdx]) {
        metadata.applied_role = cols[roleIdx];
        metadata.role = cols[roleIdx];
      }
      if (expIdx !== -1 && cols[expIdx]) {
        metadata.portal_experience = cols[expIdx];
        metadata.experience = cols[expIdx];
      }
      if (noticeIdx !== -1 && cols[noticeIdx]) {
        metadata.portal_notice_period = cols[noticeIdx];
        metadata.notice_period = cols[noticeIdx];
      }
      if (modeIdx !== -1 && cols[modeIdx]) {
        metadata.portal_work_mode = cols[modeIdx];
        metadata.city = cols[modeIdx];
      }
      if (ctcIdx !== -1 && cols[ctcIdx]) {
        metadata.portal_expected_ctc = cols[ctcIdx];
      }

      // Preserve unmapped fields in metadata
      rawHeaders.forEach((h, idx) => {
        if (![nameIdx, phoneIdx, emailIdx, roleIdx, expIdx, noticeIdx, modeIdx, ctcIdx].includes(idx) && cols[idx]) {
          metadata[h] = cols[idx];
        }
      });

      // Phone Normalization for Indian & E.164 numbers
      const digitsOnly = rawPhone.replace(/\D/g, '');
      let normalizedPhone = rawPhone;
      let isValid = true;
      let validationError: string | undefined = undefined;

      if (!rawName.trim()) {
        isValid = false;
        validationError = 'Missing candidate name';
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

      return {
        id: `row_${i + 1}`,
        name: rawName,
        phone: rawPhone,
        normalizedPhone,
        email: rawEmail || undefined,
        metadata,
        isValid,
        validationError,
      };
    });

    setParsedRows(rows);
  }, [csvLines, rawHeaders, mapping]);

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
        processCsvText(text);
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
    const sampleCsv = `name,phone,email,applied_role,portal_experience,portal_notice_period,portal_work_mode,portal_expected_ctc
Pranav L,+919922935920,pranav@fluid.live,Full Stack Engineer,2 Years,30 Days,Pune Hybrid,8 LPA
Ananya Verma,+919820011223,ananya@example.in,Product Designer,3.5 Years,Immediate,Pune Hybrid,12 LPA
Rohan Kulkarni,+919876543210,rohan@example.in,Backend Engineer,4 Years,60 Days,Pune Hybrid,14 LPA
Pooja Reddy,+919845012345,pooja@example.in,QA Automation Lead,5 Years,15 Days,Pune Hybrid,16 LPA
Vikram Malhotra,+919811098765,vikram@example.in,DevOps Engineer,3 Years,45 Days,Pune Hybrid,11 LPA`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fluid_live_candidate_template.csv');
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

  const headerOptions = useMemo(() => [
    { value: '', label: '-- Not Mapped --' },
    ...rawHeaders.map(h => ({ value: h, label: h })),
  ], [rawHeaders]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Candidate Applications (CSV)"
      description="Upload candidate rosters, map application attributes to the verification schema, and normalize phone numbers."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={handleDownloadSample} leftIcon={<Download className="h-4 w-4 text-slate-500" />}>
            Candidate Template
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Import {validCount} Candidates
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
              Successfully Imported {importResult.count} Candidates!
            </h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              All parsed applicants have been written to the Neon PostgreSQL database
              {selectedCampaignId
                ? ` and enrolled in campaign "${campaigns.find(c => c.id === selectedCampaignId)?.name || 'Campaign'}".`
                : ' and are ready for outbound verification calls.'}
            </p>
            <div className="pt-2">
              <Button size="sm" onClick={handleClose}>
                Done & Return to Candidates
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
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
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
                <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">
                  Drag and drop your candidate applications CSV, or <span className="text-blue-600 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Supported columns: candidate name, phone, role, experience, notice period, location
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

            {/* Step 2: Interactive Column Mapping Section */}
            {rawHeaders.length > 0 && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Candidate Attribute Column Mapper</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Match CSV headers to Candidate Schema</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Candidate Name <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={mapping.name}
                      onChange={e => setMapping({ ...mapping, name: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={mapping.phone}
                      onChange={e => setMapping({ ...mapping, phone: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Role Applied
                    </label>
                    <Select
                      value={mapping.appliedRole}
                      onChange={e => setMapping({ ...mapping, appliedRole: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Notice Period
                    </label>
                    <Select
                      value={mapping.portalNoticePeriod}
                      onChange={e => setMapping({ ...mapping, portalNoticePeriod: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Total Experience
                    </label>
                    <Select
                      value={mapping.portalExperience}
                      onChange={e => setMapping({ ...mapping, portalExperience: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Location / Mode
                    </label>
                    <Select
                      value={mapping.portalWorkMode}
                      onChange={e => setMapping({ ...mapping, portalWorkMode: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Expected CTC
                    </label>
                    <Select
                      value={mapping.portalExpectedCtc}
                      onChange={e => setMapping({ ...mapping, portalExpectedCtc: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Email Address
                    </label>
                    <Select
                      value={mapping.email}
                      onChange={e => setMapping({ ...mapping, email: e.target.value })}
                      options={headerOptions}
                      className="text-xs"
                    />
                  </div>
                </div>
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
                      <span className="text-slate-700 font-semibold">{validCount} Valid Candidates</span>
                    </div>
                    {invalidCount > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{invalidCount} Invalid Skipped</span>
                      </div>
                    )}
                  </div>

                  {/* Campaign Target */}
                  <div>
                    <Select
                      value={selectedCampaignId}
                      onChange={e => setSelectedCampaignId(e.target.value)}
                      options={[
                        { value: '', label: 'Unassigned Pool (Do not enroll in campaign now)' },
                        ...campaigns.map(c => ({ value: c.id, label: `Assign to: ${c.name}` })),
                      ]}
                    />
                  </div>
                </div>

                {/* Live Preview Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                      Live Data Preview (First {Math.min(5, parsedRows.length)} Records)
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">Auto E.164 Normalization</span>
                  </div>

                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                        <tr>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Candidate</th>
                          <th className="px-4 py-2">Normalized Phone</th>
                          <th className="px-4 py-2">Role Applied</th>
                          <th className="px-4 py-2">Stated Facts</th>
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
                            <td className="px-4 py-2.5 text-slate-700 font-medium text-[11px]">
                              {row.metadata.applied_role || '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {row.metadata.portal_experience && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Exp: {row.metadata.portal_experience}
                                  </span>
                                )}
                                {row.metadata.portal_notice_period && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Notice: {row.metadata.portal_notice_period}
                                  </span>
                                )}
                                {row.metadata.portal_work_mode && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Mode: {row.metadata.portal_work_mode}
                                  </span>
                                )}
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
