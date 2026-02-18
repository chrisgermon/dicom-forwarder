// Using Deno.serve instead of deprecated import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      console.error('Azure OAuth error:', error, errorDescription);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=${encodeURIComponent(errorDescription || error)}`
        }
      });
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/azure-login-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information');
    }

    const userInfo = await userResponse.json();
    const email = userInfo.mail || userInfo.userPrincipalName;
    const fullName = userInfo.displayName;

    if (!email) {
      throw new Error('No email found in Microsoft account');
    }

    console.log('User authenticated via Azure:', { email, fullName });

    // Get tenant ID from access token for Office 365 connection
    const tokenParts = access_token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    const tenantId = payload.tid;

    // Extract domain from email
    const emailDomain = email.split('@')[1];
    
    // Initialize Supabase client with service role for domain validation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if domain is registered
    const { data: domainData, error: domainError } = await supabaseAdmin
      .from('company_domains')
      .select('domain, is_active')
      .eq('domain', emailDomain)
      .eq('is_active', true)
      .maybeSingle();

    if (domainError) {
      console.error('Error checking domain:', domainError);
      throw new Error('Failed to validate email domain');
    }

    if (!domainData) {
      console.warn('Unregistered domain attempted login:', emailDomain);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=${encodeURIComponent('Your email domain is not registered. Please contact your administrator.')}`
        }
      });
    }

    // Check if user exists by querying profiles table first (more reliable)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
      console.log('Existing user found via profile:', userId);
      
      // Update user metadata to mark as azure login
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: fullName,
          azure_login: true
        }
      });
    } else {
      // Try to create new user
      const randomPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          azure_login: true
        }
      });

      if (createError) {
        // If user exists error, try to find them via profiles
        if (createError.message?.includes('already been registered')) {
          console.log('User exists but not found in profiles, searching...');
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          
          if (existingUser) {
            userId = existingUser.id;
            console.log('Found existing user:', userId);
          } else {
            console.error('User exists but cannot be found:', createError);
            throw new Error('Failed to locate existing user account');
          }
        } else {
          console.error('Error creating user:', createError);
          throw new Error('Failed to create user account');
        }
      } else if (!newUser.user) {
        throw new Error('Failed to create user account');
      } else {
        userId = newUser.user.id;
        console.log('New user created:', userId);
      }
    }

    // Store Office 365 connection tokens for SharePoint access
    if (refresh_token && expires_in) {
      const expiresAt = new Date(Date.now() + expires_in * 1000);
      
      // Check if Office 365 connection already exists for this user
      const { data: existingConnection } = await supabaseAdmin
        .from('office365_connections')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingConnection) {
        // Update existing connection
        await supabaseAdmin
          .from('office365_connections')
          .update({
            access_token,
            refresh_token,
            expires_at: expiresAt.toISOString(),
            tenant_id: tenantId,
            company_id: tenantId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConnection.id);
        console.log('Updated Office 365 connection for user:', userId);
      } else {
        // Create new Office 365 connection
        await supabaseAdmin
          .from('office365_connections')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            company_id: tenantId,
            access_token,
            refresh_token,
            expires_at: expiresAt.toISOString(),
          });
        console.log('Created Office 365 connection for user:', userId);
      }
    } else {
      console.warn('No refresh token received - user will need to reconnect Office 365 manually');
    }

    // Always redirect to custom domain, never to lovable.app
    const redirectDomain = 'https://hub.visionradiology.com.au';

    console.log('Using redirect domain:', redirectDomain);
    
    // Generate a magic link token with redirect to custom domain
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${redirectDomain}/auth`
      }
    });

    if (magicLinkError || !magicLinkData) {
      console.error('Error generating magic link:', magicLinkError);
      throw new Error('Failed to generate login link');
    }

    // Redirect user to Supabase verification link directly so session is established
    const actionLink = magicLinkData.properties.action_link;
    if (!actionLink) {
      throw new Error('No action_link returned for magic link');
    }

    // Force redirect_to to our custom domain regardless of project Site URL
    const verifyUrl = new URL(actionLink);
    verifyUrl.searchParams.set('redirect_to', `${redirectDomain}/auth`);

    console.log('Redirecting to Supabase verify link:', verifyUrl.toString());

    return new Response(null, {
      status: 302,
      headers: {
        'Location': verifyUrl.toString()
      }
    });

  } catch (error) {
    console.error('Azure callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/?error=${encodeURIComponent(errorMessage)}`
      }
    });
  }
});