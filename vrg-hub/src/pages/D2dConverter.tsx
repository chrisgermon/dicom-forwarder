import { Card } from "@/components/ui/card";
import { ExternalLink, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { DicomUpload } from "@/components/d2d/DicomUpload";
import { CompletedStudiesSearch } from "@/components/d2d/CompletedStudiesSearch";

// D2D public URL
const D2D_URL = "https://d2d.visionradiology.com.au";

// In development (Lovable preview), use proxy; in production, use direct URL
const useProxy = import.meta.env.DEV;
const d2dUrl = useProxy ? "/d2d/" : D2D_URL;

const D2dConverter = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("convert");

  useEffect(() => {
    // Check if D2D service is accessible
    fetch(d2dUrl, { mode: 'no-cors' })
      .then(() => {
        setIsAvailable(true);
        setIsLoading(false);
      })
      .catch(() => {
        setIsAvailable(false);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                📄 Documents to DICOM (D2D)
              </h1>
              <p className="text-muted-foreground">
                Convert documents and images to DICOM format and send to PACS
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href={d2dUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open D2D App
              </a>
            </Button>
          </div>
        </div>

        {isLoading && (
          <Card className="p-4 mb-4 bg-muted/50">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Checking D2D service availability...</p>
            </div>
          </Card>
        )}

        {!isLoading && isAvailable === false && (
          <Card className="p-4 mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Connection Issue</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Unable to connect to D2D service. The service may be starting up or temporarily unavailable.
                  Try clicking "Open D2D App" to access it directly.
                </p>
              </div>
            </div>
          </Card>
        )}

        {!isLoading && isAvailable && (
          <Card className="p-4 mb-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 dark:text-green-200">D2D service is available</p>
            </div>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="convert">📄 Document Conversion</TabsTrigger>
            <TabsTrigger value="upload">💿 DICOM Upload</TabsTrigger>
            <TabsTrigger value="completed">🔍 Completed Studies</TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-4">
            <Card className="overflow-hidden">
              <iframe
                src={d2dUrl}
                className="w-full h-[600px] border-0"
                title="D2D Converter"
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-2">📄 Convert Files</h3>
                <p className="text-sm text-muted-foreground">
                  Upload PDF, JPG, or PNG files and convert them to DICOM format with complete metadata control.
                </p>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-2">🏥 Worklist Query</h3>
                <p className="text-sm text-muted-foreground">
                  Query scheduled studies from the modality worklist and auto-populate patient demographics.
                </p>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-2">🚀 Send to PACS</h3>
                <p className="text-sm text-muted-foreground">
                  Send converted DICOM files directly to your PACS server with C-STORE protocol.
                </p>
              </Card>
            </div>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="text-2xl">ℹ️</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Quick Start</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Click "Query Worklist" to search for scheduled studies (optional)</li>
                    <li>2. Select a patient to auto-fill demographic data</li>
                    <li>3. Upload your document or image</li>
                    <li>4. Review and edit DICOM metadata</li>
                    <li>5. Convert and send to PACS</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💿</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">DICOM / External Imaging Upload</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload DICOM files from external sources (CDs, USBs, or downloaded from other PACS systems) 
                    and send them directly to your PACS. Supports CT, MR, US, CR, DX, Mammography, PET, NM, XA, RF, 
                    and more.
                  </p>
                </div>
              </div>
            </Card>

            <DicomUpload />
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card className="p-4 bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔍</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Completed Studies Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Search for completed studies in PACS by patient name, MRN, accession number, modality, 
                    or date range. Results include patient demographics, study details, and referring physician.
                  </p>
                </div>
              </div>
            </Card>

            <CompletedStudiesSearch />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default D2dConverter;
