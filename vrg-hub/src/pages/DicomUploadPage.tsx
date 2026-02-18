import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { DicomUpload } from "@/components/d2d/DicomUpload";
import { Card } from "@/components/ui/card";

export default function DicomUploadPage() {
  return (
    <PageContainer maxWidth="xl" className="py-6">
      <PageHeader
        title="DICOM / External Imaging Upload"
        description="Upload DICOM files from external sources (CDs, USBs, or downloaded from other PACS systems) and send them directly to your PACS"
      />

      <Card className="p-4 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💿</div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Supported Formats</h3>
            <p className="text-sm text-muted-foreground">
              Supports CT, MR, US, CR, DX, Mammography, PET, NM, XA, RF, Encapsulated PDF, and more.
              Files are validated before upload to ensure DICOM compliance.
            </p>
          </div>
        </div>
      </Card>

      <DicomUpload />
    </PageContainer>
  );
}
