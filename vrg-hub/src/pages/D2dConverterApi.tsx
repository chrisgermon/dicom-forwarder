import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { CheckCircle, Upload, Users, Send, ArrowLeft, Loader2, AlertCircle, FileText, HelpCircle, ChevronDown, ChevronUp, Search, X, History } from "lucide-react";
import { CompletedStudiesDialog } from "@/components/d2d/CompletedStudiesDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface PatientData {
  patient_name: string;
  patient_id: string;
  patient_birth_date: string;
  patient_sex: string;
  study_description: string;
  accession_number: string;
  referring_physician: string;
  procedure_description?: string;
}

// Worksite options removed - now queries all patients directly

const PACS_DESTINATION = {
  name: 'VRG PACS',
  ae_title: 'AURVCMOD1',
  host: '10.17.1.21',
  port: 5000,
  calling_ae_title: 'D2D_SCU'
};

// Worklist connection config
const WORKLIST_CONFIG = {
  host: '10.17.1.21',
  port: 5010,
  calling_ae: 'D2DSERVER'
};

// D2D API Configuration - Use Edge Function proxy to avoid CORS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const D2D_PROXY_URL = `${SUPABASE_URL}/functions/v1/d2d-proxy`;

const makeD2dRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${D2D_PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });
  return response;
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // Handle YYYYMMDD format
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    return `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
  }
  // Handle YYYY-MM-DD format
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const D2dConverterApi: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [worklistItems, setWorklistItems] = useState<PatientData[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompletedStudiesDialog, setShowCompletedStudiesDialog] = useState(false);

  // Filter worklist items based on search query
  const filteredWorklistItems = worklistItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.patient_name.toLowerCase().includes(query) ||
      item.patient_id.toLowerCase().includes(query) ||
      (item.procedure_description || '').toLowerCase().includes(query) ||
      (item.accession_number || '').toLowerCase().includes(query)
    );
  });

  // Auto-query worklist on mount
  React.useEffect(() => {
    if (!initialLoadDone) {
      queryWorklist();
      setInitialLoadDone(true);
    }
  }, [initialLoadDone]);

  const reset = () => {
    setCurrentStep(1);
    setSelectedPatient(null);
    setManualEntry(false);
    setFile(null);
    setFileId('');
    setError(null);
    queryWorklist();
  };

  const queryWorklist = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query all patients directly via proxy
      const response = await makeD2dRequest('/api/worklist/query-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: WORKLIST_CONFIG.host,
          port: WORKLIST_CONFIG.port,
          calling_ae: WORKLIST_CONFIG.calling_ae
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Worklist query failed');
      }

      const data = await response.json();
      // Map the response to our PatientData interface
      const mappedItems = (data.items || []).map((item: any) => ({
        patient_name: item.patient_name || '',
        patient_id: item.patient_id || '',
        patient_birth_date: item.patient_birth_date || '',
        patient_sex: item.patient_sex || '',
        study_description: item.procedure_description || '',
        accession_number: item.accession_number || '',
        referring_physician: '',
        procedure_description: item.procedure_description || '',
        modality: item.modality || '',
        scheduled_date: item.scheduled_date || '',
        worklist_ae_title: item.worklist_ae_title || ''
      }));
      setWorklistItems(mappedItems);
      if (mappedItems.length > 0) {
        toast.success(`Found ${mappedItems.length} patients`);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to query worklist');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (selectedFile: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Upload via proxy
      const response = await makeD2dRequest('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setFileId(data.file_id);
      setFile(selectedFile);
      setCurrentStep(3);
      toast.success('File uploaded successfully');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const convertAndSend = async () => {
    if (!selectedPatient || !fileId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Use the combined convert endpoint with send_immediately via proxy
      const response = await makeD2dRequest('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          metadata: {
            patient_name: selectedPatient.patient_name,
            patient_id: selectedPatient.patient_id,
            patient_birth_date: selectedPatient.patient_birth_date,
            patient_sex: selectedPatient.patient_sex,
            study_description: selectedPatient.study_description || 'Document Conversion',
            series_description: 'Imported Document',
            accession_number: selectedPatient.accession_number,
            referring_physician: selectedPatient.referring_physician || '',
            modality: 'OT'
          },
          destination: PACS_DESTINATION,
          send_immediately: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Conversion/send failed');
      }

      const data = await response.json();
      console.log('Convert response:', data);

      setCurrentStep(4);
      toast.success('Document converted and sent to PACS successfully!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to convert and send');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: PatientData) => {
    setSelectedPatient(patient);
    setManualEntry(false);
    setCurrentStep(2);
  };

  const handleManualEntry = () => {
    setSelectedPatient({
      patient_name: '',
      patient_id: '',
      patient_birth_date: '',
      patient_sex: '',
      study_description: '',
      accession_number: '',
      referring_physician: ''
    });
    setManualEntry(true);
    setCurrentStep(2);
  };

  const handleSelectFromCompletedStudies = (patient: PatientData) => {
    setSelectedPatient(patient);
    setManualEntry(false);
    setCurrentStep(2);
  };

  const updatePatientField = (field: keyof PatientData, value: string) => {
    if (selectedPatient) {
      setSelectedPatient({ ...selectedPatient, [field]: value });
    }
  };

  const canProceedToUpload = selectedPatient && 
    selectedPatient.patient_name && 
    selectedPatient.patient_id;

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Documents to DICOM (D2D)
          </h1>
          <p className="text-muted-foreground mt-2">
            Convert documents and images to DICOM format and send to PACS
          </p>
        </div>

        {/* User Guide */}
        <Collapsible open={showGuide} onOpenChange={setShowGuide} className="mb-6">
          <Card className="border-primary/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    How to Use D2D Converter
                  </span>
                  {showGuide ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300 mb-2">
                      <Users className="h-4 w-4" />
                      Step 1: Find Patient
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Patients are auto-loaded from the worklist</li>
                      <li>• Click on a patient row to select them</li>
                      <li>• Or click "Enter Manually" to type details</li>
                      <li>• Required: Patient Name & ID</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 font-semibold text-purple-700 dark:text-purple-300 mb-2">
                      <Upload className="h-4 w-4" />
                      Step 2: Upload Image
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Drag & drop or click to upload</li>
                      <li>• Supports: PDF, JPG, PNG</li>
                      <li>• Max file size: 50MB</li>
                      <li>• One file per conversion</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-300 mb-2">
                      <Send className="h-4 w-4" />
                      Step 3: Review & Send
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Review patient details & file</li>
                      <li>• Click "Convert & Send to PACS"</li>
                      <li>• Document is converted to DICOM</li>
                      <li>• Automatically sent to VRG PACS</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">💡 Tips</h4>
                  <ul className="text-sm text-muted-foreground grid md:grid-cols-2 gap-2">
                    <li>• <strong>Patient Name format:</strong> Use LAST^FIRST (e.g., SMITH^JOHN)</li>
                    <li>• <strong>Accession Number:</strong> Links the document to an existing study</li>
                    <li>• <strong>Study Description:</strong> Helps identify the document in PACS</li>
                    <li>• <strong>Refresh:</strong> Click "Refresh List" to reload the worklist</li>
                  </ul>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8 px-4">
          {[
            { num: 1, label: 'Find Patient', icon: Users },
            { num: 2, label: 'Upload Image', icon: Upload },
            { num: 3, label: 'Review & Send', icon: Send },
          ].map((step, idx) => {
            const status = getStepStatus(step.num);
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                    ${status === 'current' ? 'bg-primary text-primary-foreground' : ''}
                    ${status === 'upcoming' ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {status === 'completed' ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${status === 'current' ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`w-24 h-0.5 mx-2 ${step.num < currentStep ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        )}

        {/* Step 1: Patient Selection */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Step 1: Select Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={queryWorklist} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    Refresh List
                  </Button>
                  <Button variant="secondary" onClick={handleManualEntry}>
                    Enter Manually
                  </Button>
                  <Button variant="outline" onClick={() => setShowCompletedStudiesDialog(true)}>
                    <History className="h-4 w-4 mr-2" />
                    Completed Studies
                  </Button>
                </div>
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, procedure..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading patients...</span>
                </div>
              ) : worklistItems.length > 0 ? (
                <>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredWorklistItems.length} of {worklistItems.length} patients
                    </p>
                  )}
                  {filteredWorklistItems.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky top-0 bg-background">Patient Name</TableHead>
                            <TableHead className="sticky top-0 bg-background">ID</TableHead>
                            <TableHead className="sticky top-0 bg-background">DOB</TableHead>
                            <TableHead className="sticky top-0 bg-background">Procedure</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredWorklistItems.map((item, idx) => (
                            <TableRow
                              key={idx}
                              className="cursor-pointer hover:bg-primary/5"
                              onClick={() => handlePatientSelect(item)}
                            >
                              <TableCell className="font-medium">{item.patient_name}</TableCell>
                              <TableCell>{item.patient_id}</TableCell>
                              <TableCell>{formatDate(item.patient_birth_date)}</TableCell>
                              <TableCell>{item.procedure_description || item.study_description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No patients match "{searchQuery}"</p>
                      <Button variant="link" size="sm" onClick={() => setSearchQuery('')}>
                        Clear search
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No patients found.</p>
                  <Button variant="link" onClick={handleManualEntry} className="mt-2">
                    Enter patient details manually
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Image (with optional manual entry form) */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Step 2: {manualEntry ? 'Enter Patient Details & Upload' : 'Upload Image'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patient Selection
              </Button>

              {/* Manual Entry Form */}
              {manualEntry && (
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <h3 className="font-medium">Patient Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Patient Name (LAST^FIRST) *</Label>
                      <Input
                        value={selectedPatient?.patient_name || ''}
                        onChange={(e) => updatePatientField('patient_name', e.target.value)}
                        placeholder="DOE^JOHN"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Patient ID (MRN) *</Label>
                      <Input
                        value={selectedPatient?.patient_id || ''}
                        onChange={(e) => updatePatientField('patient_id', e.target.value)}
                        placeholder="MRN123456"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={selectedPatient?.patient_birth_date || ''}
                        onChange={(e) => updatePatientField('patient_birth_date', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Sex</Label>
                      <Select
                        value={selectedPatient?.patient_sex || ''}
                        onValueChange={(value) => updatePatientField('patient_sex', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Study Description</Label>
                      <Input
                        value={selectedPatient?.study_description || ''}
                        onChange={(e) => updatePatientField('study_description', e.target.value)}
                        placeholder="e.g., Abdominal Ultrasound"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Accession Number</Label>
                      <Input
                        value={selectedPatient?.accession_number || ''}
                        onChange={(e) => updatePatientField('accession_number', e.target.value)}
                        placeholder="Optional"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Referring Physician</Label>
                      <Input
                        value={selectedPatient?.referring_physician || ''}
                        onChange={(e) => updatePatientField('referring_physician', e.target.value)}
                        placeholder="Optional"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Summary (if from worklist) */}
              {!manualEntry && selectedPatient && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h3 className="font-medium mb-2">Selected Patient</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedPatient.patient_name}</p>
                    <p><span className="text-muted-foreground">ID:</span> {selectedPatient.patient_id}</p>
                    <p><span className="text-muted-foreground">DOB:</span> {formatDate(selectedPatient.patient_birth_date)}</p>
                    <p><span className="text-muted-foreground">Procedure:</span> {selectedPatient.procedure_description || selectedPatient.study_description}</p>
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div>
                <Label className="mb-2 block">Upload Document (PDF, JPG, PNG)</Label>
                {canProceedToUpload ? (
                  <FileDropzone
                    onFilesSelected={(files) => files[0] && uploadFile(files[0])}
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSize={50}
                    label="Drop your document here"
                    description="PDF, JPG, or PNG files up to 50MB"
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Please enter Patient Name and Patient ID first</p>
                  </div>
                )}
              </div>

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Uploading file...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review and Send */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Step 3: Review and Send to PACS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-3">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedPatient?.patient_name}</p>
                    <p><span className="text-muted-foreground">ID:</span> {selectedPatient?.patient_id}</p>
                    <p><span className="text-muted-foreground">DOB:</span> {formatDate(selectedPatient?.patient_birth_date)}</p>
                    <p><span className="text-muted-foreground">Sex:</span> {selectedPatient?.patient_sex || 'N/A'}</p>
                    <p className="col-span-2"><span className="text-muted-foreground">Study:</span> {selectedPatient?.study_description || 'Document'}</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-3">File Information</h3>
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{file?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-3">PACS Destination</h3>
                  <div className="text-sm">
                    <p><span className="text-muted-foreground">AE Title:</span> {PACS_DESTINATION.ae_title}</p>
                    <p><span className="text-muted-foreground">Address:</span> {PACS_DESTINATION.host}:{PACS_DESTINATION.port}</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={convertAndSend} 
                disabled={loading} 
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting and Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Convert and Send to PACS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {currentStep === 4 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Success!</h2>
                <p className="text-muted-foreground mb-6">
                  Document has been converted and sent to PACS for{' '}
                  <span className="font-medium text-foreground">{selectedPatient?.patient_name}</span>
                </p>
                <Button onClick={reset} size="lg">
                  <Upload className="h-4 w-4 mr-2" />
                  Send Another Document
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completed Studies Search Dialog */}
      <CompletedStudiesDialog
        open={showCompletedStudiesDialog}
        onOpenChange={setShowCompletedStudiesDialog}
        onSelectPatient={handleSelectFromCompletedStudies}
      />
    </div>
  );
};

export default D2dConverterApi;
