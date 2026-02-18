import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
// Input available if needed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCode, Download, Printer, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface QRCodeGeneratorProps {
  fileUrl: string;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * QR Code Generator Component
 * Generates QR codes for file URLs - useful for equipment manuals, safety posters, etc.
 * Medical staff can scan QR codes on equipment to quickly access manuals and protocols
 */
export function QRCodeGenerator({
  fileUrl,
  fileName,
  open,
  onOpenChange,
}: QRCodeGeneratorProps) {
  const [qrSize, setQrSize] = useState<string>("256");
  const [copied, setCopied] = useState(false);

  // Generate QR code using Google Charts API (free, no signup needed)
  // Alternative: use a library like qrcode.react for offline generation
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(fileUrl)}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_${fileName.replace(/\.[^/.]+$/, '')}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${fileName}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                margin: 0;
              }
              .qr-container {
                text-align: center;
                border: 2px solid #333;
                padding: 30px;
                border-radius: 8px;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 20px;
                color: #333;
              }
              img {
                margin: 20px 0;
              }
              .url {
                font-size: 12px;
                color: #666;
                word-break: break-all;
                margin-top: 20px;
              }
              .instructions {
                margin-top: 30px;
                padding: 20px;
                background: #f5f5f5;
                border-radius: 8px;
                font-size: 14px;
              }
              @media print {
                body {
                  padding: 20px;
                }
                .instructions {
                  page-break-before: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h1>${fileName}</h1>
              <img src="${qrCodeUrl}" alt="QR Code" />
              <div class="url">${fileUrl}</div>
            </div>
            <div class="instructions">
              <strong>How to use:</strong><br/>
              1. Scan this QR code with your smartphone camera<br/>
              2. Tap the notification to open the document<br/>
              3. View the document or download for offline access
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      toast.success('URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Generate QR Code
          </DialogTitle>
          <DialogDescription>
            Create a QR code for quick access to this file. Perfect for equipment manuals,
            safety protocols, or any document that needs to be quickly accessible on mobile devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code Preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white border-2 border-border rounded-lg">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-full h-auto"
                style={{ maxWidth: `${qrSize}px` }}
              />
            </div>

            {/* File Name */}
            <div className="text-center">
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-1 break-all max-w-md">
                {fileUrl}
              </p>
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-2">
            <Label htmlFor="qr-size">QR Code Size</Label>
            <Select value={qrSize} onValueChange={setQrSize}>
              <SelectTrigger id="qr-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="128">Small (128x128)</SelectItem>
                <SelectItem value="256">Medium (256x256)</SelectItem>
                <SelectItem value="512">Large (512x512)</SelectItem>
                <SelectItem value="1024">Extra Large (1024x1024)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose larger sizes for printing posters or labels
            </p>
          </div>

          {/* Use Cases */}
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <p className="text-sm font-medium mb-2">Common Use Cases:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Post QR codes on medical equipment linking to operation manuals</li>
              <li>• Add to safety posters for quick access to protocols</li>
              <li>• Include in training materials for easy document access</li>
              <li>• Share with external partners for file collaboration</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopyUrl}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex-1"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * QR Code Button Component
 * Trigger button for the QR code generator
 */
interface QRCodeButtonProps {
  fileUrl: string;
  fileName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function QRCodeButton({
  fileUrl,
  fileName,
  variant = "ghost",
  size = "sm",
  className,
}: QRCodeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <QrCode className="h-4 w-4 mr-2" />
        QR Code
      </Button>
      <QRCodeGenerator
        fileUrl={fileUrl}
        fileName={fileName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
