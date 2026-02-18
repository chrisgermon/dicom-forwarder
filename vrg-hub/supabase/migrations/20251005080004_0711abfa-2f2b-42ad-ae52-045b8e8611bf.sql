-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'news_article', 'hardware_request', 'marketing_request', 'user_account_request'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID, -- ID of the related item (article, request, etc)
  reference_url TEXT, -- Link to the item
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- Create table to track which news articles users have viewed
CREATE TABLE IF NOT EXISTS public.news_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(article_id, user_id)
);

-- Enable RLS
ALTER TABLE public.news_article_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own article views"
  ON public.news_article_views
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own article views"
  ON public.news_article_views
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to create notifications for new published news articles
CREATE OR REPLACE FUNCTION notify_new_article()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Only create notifications when article is published for the first time
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status != 'published') THEN
    -- Create notification for all users in the same company
    FOR user_record IN 
      SELECT DISTINCT p.user_id, p.company_id
      FROM public.profiles p
      WHERE p.company_id = NEW.company_id
        AND p.user_id != NEW.author_id -- Don't notify the author
    LOOP
      INSERT INTO public.notifications (
        user_id,
        company_id,
        type,
        title,
        message,
        reference_id,
        reference_url
      ) VALUES (
        user_record.user_id,
        user_record.company_id,
        'news_article',
        'New Article Published',
        'New article: ' || NEW.title,
        NEW.id,
        '/news/view/' || NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new articles
CREATE TRIGGER notify_new_article_trigger
  AFTER INSERT OR UPDATE ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_article();

-- Function to create notifications for hardware request status changes
CREATE OR REPLACE FUNCTION notify_hardware_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the requester
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.user_id,
      NEW.company_id,
      'hardware_request',
      'Request Status Updated',
      'Your hardware request "' || NEW.title || '" is now ' || NEW.status,
      NEW.id,
      '/requests?request=' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for hardware request updates
CREATE TRIGGER notify_hardware_request_status_trigger
  AFTER UPDATE ON public.hardware_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_hardware_request_status();

-- Function to create notifications for marketing request status changes
CREATE OR REPLACE FUNCTION notify_marketing_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the requester
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.user_id,
      NEW.company_id,
      'marketing_request',
      'Marketing Request Status Updated',
      'Your marketing request "' || NEW.title || '" is now ' || NEW.status,
      NEW.id,
      '/requests?request=' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for marketing request updates
CREATE TRIGGER notify_marketing_request_status_trigger
  AFTER UPDATE ON public.marketing_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_marketing_request_status();

-- Function to create notifications for user account request status changes
CREATE OR REPLACE FUNCTION notify_user_account_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the requester
    INSERT INTO public.notifications (
      user_id,
      company_id,
      type,
      title,
      message,
      reference_id,
      reference_url
    ) VALUES (
      NEW.requested_by,
      NEW.company_id,
      'user_account_request',
      'User Account Request Status Updated',
      'Your user account request for ' || NEW.requested_for_name || ' is now ' || NEW.status,
      NEW.id,
      '/user-accounts?request=' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for user account request updates
CREATE TRIGGER notify_user_account_request_status_trigger
  AFTER UPDATE ON public.user_account_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_account_request_status();