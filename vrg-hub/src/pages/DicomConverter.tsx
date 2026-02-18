import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { ExternalLink, FileText, Upload, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const D2D_URL = "https://d2d.visionradiology.com.au";

export default function DicomConverter() {
  return (
    <PageContainer maxWidth="full" className="h-[calc(100vh-4rem)] p-0">
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4 bg-background border-b">
          <div className="flex items-center justify-between mb-4">
            <PageHeader
              title="Document to DICOM Converter"
              description="Convert PDF, JPG, and PNG documents to DICOM format and send to PACS"
            />
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Live
            </Badge>
          </div>

          <Alert className="mb-4">
            <AlertDescription>
              This tool converts documents to DICOM format and can send them directly to your PACS system. The application is hosted in Azure with secure VNet connectivity to Vision Radiology infrastructure.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Step 1
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Upload PDF, JPG, or PNG files</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Step 2
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Enter patient metadata</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Step 3
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Configure DICOM destination</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Step 4
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Convert and send to PACS</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(D2D_URL, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Window
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const iframe = document.getElementById('d2d-iframe') as HTMLIFrameElement;
                if (iframe) {
                  iframe.src = iframe.src; // Reload iframe
                }
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 relative bg-muted/20">
          <iframe
            id="d2d-iframe"
            src={D2D_URL}
            className="absolute inset-0 w-full h-full border-0"
            title="Document to DICOM Converter"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </PageContainer>
  );
}
