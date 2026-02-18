import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function QRRedirect() {
  const { shortCode } = useParams();
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const trackAndRedirect = async () => {
      if (!shortCode) {
        setNotFound(true);
        return;
      }

      try {
        // Fetch QR code details - no auth required
        const { data: qrCode, error } = await supabase
          .from('qr_codes')
          .select('id, target_url, is_active')
          .eq('short_code', shortCode)
          .maybeSingle();

        if (error || !qrCode) {
          setNotFound(true);
          return;
        }

        if (!qrCode.is_active) {
          setNotFound(true);
          return;
        }

        // Detect device type from user agent
        const userAgent = navigator.userAgent;
        let deviceType = 'Desktop';
        if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
          deviceType = 'Mobile';
        } else if (/Tablet|iPad/i.test(userAgent)) {
          deviceType = 'Tablet';
        }

        // Record the scan (fire and forget - don't wait)
        supabase
          .from('qr_code_scans')
          .insert({
            qr_code_id: qrCode.id,
            user_agent: userAgent,
            device_type: deviceType,
            referrer: document.referrer || null,
          })
          .then(() => {
            console.log('QR scan recorded');
          });

        // Redirect to target URL
        setTargetUrl(qrCode.target_url);
      } catch (err) {
        console.error('Error processing QR redirect:', err);
        setNotFound(true);
      }
    };

    trackAndRedirect();
  }, [shortCode]);

  // If we have the target URL, redirect
  useEffect(() => {
    if (targetUrl) {
      // Use window.location.replace for immediate redirect without browser history
      console.log('Redirecting to:', targetUrl);
      window.location.replace(targetUrl);
    }
  }, [targetUrl]);

  if (notFound) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
