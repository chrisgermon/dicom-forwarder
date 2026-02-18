import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (user?.id && "serviceWorker" in navigator) {
      checkSubscription();
    }
  }, [user?.id]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      logger.error("Error checking push subscription", error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      logger.error("Error requesting notification permission", error);
      return false;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user?.id) return false;

    setLoading(true);

    try {
      // Request permission first
      const granted = await requestPermission();
      if (!granted) {
        toast.error("Notification permission denied");
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment or generate
      // For now, we'll use a placeholder - in production, this should come from server
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        logger.warn("VAPID public key not configured. Push notifications require server-side setup.");
        toast.info("Push notifications require additional server setup.");
        return false;
      }

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      // Convert subscription to JSON
      const subscriptionJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        keys: subscriptionJson.keys,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
        is_active: true,
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;
    } catch (error) {
      logger.error("Error subscribing to push", error);
      toast.error("Failed to enable push notifications");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!user?.id) return false;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      logger.error("Error unsubscribing from push", error);
      toast.error("Failed to disable push notifications");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    permission,
    isSubscribed,
    loading,
    isSupported: "Notification" in window && "serviceWorker" in navigator,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

