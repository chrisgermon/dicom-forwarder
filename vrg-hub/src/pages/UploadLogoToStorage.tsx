import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle, Upload } from "lucide-react";

export default function UploadLogoToStorage() {
  const [status, setStatus] = useState<"uploading" | "success" | "error">("uploading");
  const [message, setMessage] = useState("Uploading logo to storage...");

  useEffect(() => {
    const uploadLogo = async () => {
      try {
        // Fetch the logo file from public directory
        const response = await fetch("/vision-radiology-email-logo.png");
        const blob = await response.blob();
        
        // Upload to Supabase storage
        const { error } = await supabase.storage
          .from("company-assets")
          .upload("VR22004_Logo_Update.png", blob, {
            contentType: "image/png",
            upsert: true,
          });

        if (error) throw error;

        setStatus("success");
        setMessage("Logo uploaded successfully to company-assets bucket!");
      } catch (error) {
        console.error("Upload error:", error);
        setStatus("error");
        setMessage(`Upload failed: ${error.message}`);
      }
    };

    uploadLogo();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        {status === "uploading" && (
          <>
            <Upload className="w-16 h-16 mx-auto mb-4 animate-pulse text-primary" />
            <h2 className="text-xl font-semibold mb-2">Uploading Logo</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2 text-green-600">Upload Successful!</h2>
            <p className="text-muted-foreground mb-4">{message}</p>
            <p className="text-sm text-muted-foreground">
              You can now close this page and test your emails.
            </p>
          </>
        )}
        
        {status === "error" && (
          <>
            <h2 className="text-xl font-semibold mb-2 text-destructive">Upload Failed</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
      </Card>
    </div>
  );
}
