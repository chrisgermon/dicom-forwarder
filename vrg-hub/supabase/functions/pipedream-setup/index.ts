import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowConfig {
  action: string;
  description: string;
  schedule: string;
  cron: string;
}

const WORKFLOWS: WorkflowConfig[] = [
  { action: 'newsletter-reminders', description: 'Send newsletter reminders', schedule: 'Daily at 9am AEST', cron: '0 23 * * *' },
  { action: 'process-scheduled-reports', description: 'Process scheduled reports', schedule: 'Every 15 minutes', cron: '*/15 * * * *' },
  { action: 'sync-campaigns', description: 'Sync marketing campaigns', schedule: 'Every 6 hours', cron: '0 */6 * * *' },
  { action: 'office365-sync', description: 'Sync Office 365 tokens', schedule: 'Every 30 minutes', cron: '*/30 * * * *' },
  { action: 'check-reminders', description: 'Check and send reminders', schedule: 'Every 5 minutes', cron: '*/5 * * * *' },
];

async function listWorkflows(apiKey: string, orgId: string): Promise<any[]> {
  const response = await fetch(`https://api.pipedream.com/v1/orgs/${orgId}/workflows`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list workflows: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function createWorkflow(
  apiKey: string,
  orgId: string,
  projectId: string,
  name: string,
  webhookUrl: string,
  action: string,
  cronExpression: string,
  cronSecret: string
): Promise<any> {
  // Using Pipedream REST API to create workflow
  // The API requires org_id and project_id at root level
  const workflowPayload = {
    org_id: orgId,
    project_id: projectId,
    settings: {
      name,
      auto_deploy: true,
    },
    triggers: [
      {
        component_key: 'timer-cron',
        props: {
          cron: {
            cron: cronExpression,
            timezone: 'Australia/Sydney',
          },
        },
      },
    ],
    steps: [
      {
        component_key: 'http-custom_request',
        props: {
          url: webhookUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': cronSecret,
          },
          body: JSON.stringify({ action }),
        },
      },
    ],
  };

  console.log('Creating workflow with payload:', JSON.stringify(workflowPayload, null, 2));

  const response = await fetch('https://api.pipedream.com/v1/workflows', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflowPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Workflow creation failed:', error);
    throw new Error(`Failed to create workflow: ${error}`);
  }

  const workflow = await response.json();
  console.log('Workflow created:', workflow);
  return workflow;
}

async function activateWorkflow(apiKey: string, workflowId: string): Promise<void> {
  const response = await fetch(`https://api.pipedream.com/v1/workflows/${workflowId}/state`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ active: true }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to activate workflow: ${error}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PIPEDREAM_API_KEY');
    const orgId = Deno.env.get('PIPEDREAM_ORG_ID');
    const projectId = Deno.env.get('PIPEDREAM_PROJECT_ID');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'PIPEDREAM_API_KEY not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'PIPEDREAM_ORG_ID not configured. Get this from Pipedream settings (starts with o_)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'PIPEDREAM_PROJECT_ID not configured. Get this from Pipedream project URL (starts with proj_)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cronSecret) {
      return new Response(
        JSON.stringify({ error: 'CRON_SECRET not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, actions } = await req.json();
    const webhookUrl = `${supabaseUrl}/functions/v1/pipedream-cron`;

    if (operation === 'list') {
      // List existing workflows
      const workflows = await listWorkflows(apiKey, orgId);
      return new Response(
        JSON.stringify({ workflows }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operation === 'setup') {
      // Create workflows for specified actions (or all if not specified)
      const actionsToSetup = actions || WORKFLOWS.map(w => w.action);
      const results: any[] = [];
      const errors: any[] = [];

      for (const action of actionsToSetup) {
        const workflowConfig = WORKFLOWS.find(w => w.action === action);
        if (!workflowConfig) {
          errors.push({ action, error: 'Unknown action' });
          continue;
        }

        try {
          const workflow = await createWorkflow(
            apiKey,
            orgId,
            projectId,
            `VRG Hub - ${workflowConfig.description}`,
            webhookUrl,
            action,
            workflowConfig.cron,
            cronSecret
          );

          // Try to activate the workflow
          try {
            const workflowId = workflow.data?.id || workflow.id;
            if (workflowId) {
              await activateWorkflow(apiKey, workflowId);
            }
          } catch (activateErr) {
            console.warn('Failed to activate workflow:', activateErr);
          }

          results.push({
            action,
            workflowId: workflow.data?.id || workflow.id,
            status: 'created',
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ action, error: errorMessage });
        }
      }

      return new Response(
        JSON.stringify({ results, errors, webhookUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operation === 'export') {
      // Export workflow configurations for manual import
      const configs = WORKFLOWS.map(w => ({
        name: `VRG Hub - ${w.description}`,
        description: `Automated ${w.description.toLowerCase()} - ${w.schedule}`,
        trigger: {
          type: 'schedule',
          cron: w.cron,
          timezone: 'Australia/Sydney',
        },
        httpRequest: {
          url: webhookUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': '{{CRON_SECRET}}',
          },
          body: { action: w.action },
        },
      }));

      return new Response(
        JSON.stringify({ configs, webhookUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid operation. Use: list, setup, or export' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error in pipedream-setup:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
