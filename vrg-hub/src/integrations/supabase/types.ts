export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          company_name: string
          created_at: string | null
          foreground_color: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          updated_at: string | null
          use_custom_colors: boolean | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          company_name?: string
          created_at?: string | null
          foreground_color?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
          use_custom_colors?: boolean | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          company_name?: string
          created_at?: string | null
          foreground_color?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
          use_custom_colors?: boolean | null
        }
        Relationships: []
      }
      assignment_history: {
        Row: {
          assigned_by: string
          created_at: string | null
          from_user_id: string | null
          id: string
          reason: string | null
          ticket_id: string
          to_user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          reason?: string | null
          ticket_id: string
          to_user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          reason?: string | null
          ticket_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_history_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          browser_info: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          message: string
          page_url: string | null
          subject: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          browser_info?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message: string
          page_url?: string | null
          subject?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          browser_info?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message?: string
          page_url?: string | null
          subject?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      business_listings: {
        Row: {
          created_at: string
          id: string
          last_verified_at: string | null
          listing_url: string | null
          location_id: string
          notes: string | null
          platform: string
          status: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_verified_at?: string | null
          listing_url?: string | null
          location_id: string
          notes?: string | null
          platform: string
          status?: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_verified_at?: string | null
          listing_url?: string | null
          location_id?: string
          notes?: string | null
          platform?: string
          status?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_listings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_listings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_report_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          last_used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_completions: {
        Row: {
          checklist_date: string
          completed_at: string | null
          completed_by: string | null
          completion_percentage: number | null
          created_at: string | null
          id: string
          location_id: string | null
          started_at: string | null
          started_by: string | null
          status: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          checklist_date: string
          completed_at?: string | null
          completed_by?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          checklist_date?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          started_at?: string | null
          started_by?: string | null
          status?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_completions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_completions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_item_completions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          completion_id: string
          created_at: string | null
          id: string
          initials: string | null
          item_id: string
          notes: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          completion_id: string
          created_at?: string | null
          id?: string
          initials?: string | null
          item_id: string
          notes?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          completion_id?: string
          created_at?: string | null
          id?: string
          initials?: string | null
          item_id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_completions_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "checklist_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_completions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          allow_na: boolean | null
          created_at: string | null
          day_restriction: string[] | null
          id: string
          instructions: string | null
          is_required: boolean | null
          sort_order: number
          task_description: string
          template_id: string
          time_slot: string | null
          updated_at: string | null
        }
        Insert: {
          allow_na?: boolean | null
          created_at?: string | null
          day_restriction?: string[] | null
          id?: string
          instructions?: string | null
          is_required?: boolean | null
          sort_order?: number
          task_description: string
          template_id: string
          time_slot?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_na?: boolean | null
          created_at?: string | null
          day_restriction?: string[] | null
          id?: string
          instructions?: string | null
          is_required?: boolean | null
          sort_order?: number
          task_description?: string
          template_id?: string
          time_slot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          brand_id: string | null
          checklist_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          checklist_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          checklist_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_directory: {
        Row: {
          address: string | null
          clinic_code: string | null
          clinic_key: number
          clinic_name: string
          clinic_phone: string | null
          id: number
          postcode: string | null
          referrer_count: number | null
          search_vector: unknown
          state: string | null
          suburb: string | null
          synced_at: string | null
        }
        Insert: {
          address?: string | null
          clinic_code?: string | null
          clinic_key: number
          clinic_name: string
          clinic_phone?: string | null
          id?: number
          postcode?: string | null
          referrer_count?: number | null
          search_vector?: unknown
          state?: string | null
          suburb?: string | null
          synced_at?: string | null
        }
        Update: {
          address?: string | null
          clinic_code?: string | null
          clinic_key?: number
          clinic_name?: string
          clinic_phone?: string | null
          id?: number
          postcode?: string | null
          referrer_count?: number | null
          search_vector?: unknown
          state?: string | null
          suburb?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      clinic_practice_managers: {
        Row: {
          clinic_key: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          clinic_key: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          clinic_key?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clinic_setup_activity: {
        Row: {
          action: string
          checklist_id: string
          created_at: string
          id: string
          item_id: string | null
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          checklist_id: string
          created_at?: string
          id?: string
          item_id?: string | null
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          checklist_id?: string
          created_at?: string
          id?: string
          item_id?: string | null
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_setup_activity_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "clinic_setup_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_setup_activity_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "clinic_setup_items"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_setup_checklists: {
        Row: {
          brand_id: string | null
          clinic_name: string
          created_at: string
          created_by: string
          go_live_date: string | null
          id: string
          lease_handover_date: string | null
          location_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          clinic_name: string
          created_at?: string
          created_by: string
          go_live_date?: string | null
          id?: string
          lease_handover_date?: string | null
          location_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          clinic_name?: string
          created_at?: string
          created_by?: string
          go_live_date?: string | null
          id?: string
          lease_handover_date?: string | null
          location_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_setup_checklists_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_setup_checklists_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_setup_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          field_name: string
          field_options: Json | null
          field_type: string
          field_value: string | null
          id: string
          is_completed: boolean | null
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          section_id: string
          sort_order: number
          unlock_reason: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          field_value?: string | null
          id?: string
          is_completed?: boolean | null
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          section_id: string
          sort_order?: number
          unlock_reason?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          field_value?: string | null
          id?: string
          is_completed?: boolean | null
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          section_id?: string
          sort_order?: number
          unlock_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_setup_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_setup_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "clinic_setup_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_setup_permissions: {
        Row: {
          checklist_id: string
          created_at: string
          granted_by: string
          id: string
          permission_level: string
          user_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          granted_by: string
          id?: string
          permission_level?: string
          user_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          granted_by?: string
          id?: string
          permission_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_setup_permissions_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "clinic_setup_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_setup_sections: {
        Row: {
          checklist_id: string
          created_at: string
          id: string
          section_name: string
          section_owner: string | null
          section_owner_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          id?: string
          section_name: string
          section_owner?: string | null
          section_owner_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          id?: string
          section_name?: string
          section_owner?: string | null
          section_owner_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_setup_sections_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "clinic_setup_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_setup_sections_section_owner_id_fkey"
            columns: ["section_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          created_by: string | null
          gateway: string | null
          id: string
          ip_range: string | null
          location_name: string
          notes: string | null
          site_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gateway?: string | null
          id?: string
          ip_range?: string | null
          location_name: string
          notes?: string | null
          site_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gateway?: string | null
          id?: string
          ip_range?: string | null
          location_name?: string
          notes?: string | null
          site_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          updated_at: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      company_home_pages: {
        Row: {
          company_id: string
          created_at: string
          id: string
          layout_config: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          layout_config?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          layout_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      cpd_attendance: {
        Row: {
          attendance_date: string
          attendance_mode: string | null
          category_id: string | null
          cpd_hours_claimed: number
          created_at: string | null
          created_by: string | null
          custom_meeting_name: string | null
          duration_hours: number
          id: string
          is_custom: boolean | null
          meeting_id: string | null
          notes: string | null
          organisation: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendance_date: string
          attendance_mode?: string | null
          category_id?: string | null
          cpd_hours_claimed: number
          created_at?: string | null
          created_by?: string | null
          custom_meeting_name?: string | null
          duration_hours: number
          id?: string
          is_custom?: boolean | null
          meeting_id?: string | null
          notes?: string | null
          organisation?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendance_date?: string
          attendance_mode?: string | null
          category_id?: string | null
          cpd_hours_claimed?: number
          created_at?: string | null
          created_by?: string | null
          custom_meeting_name?: string | null
          duration_hours?: number
          id?: string
          is_custom?: boolean | null
          meeting_id?: string | null
          notes?: string | null
          organisation?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpd_attendance_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cpd_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpd_attendance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpd_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "cpd_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpd_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cpd_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cpd_meetings: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          default_duration_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          location: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_duration_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_duration_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cpd_meetings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpd_meetings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cpd_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpd_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pages: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_published: boolean | null
          slug: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      department_assignments: {
        Row: {
          assignee_ids: string[]
          brand_id: string | null
          created_at: string | null
          department: string
          id: string
          updated_at: string | null
        }
        Insert: {
          assignee_ids?: string[]
          brand_id?: string | null
          created_at?: string | null
          department: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          assignee_ids?: string[]
          brand_id?: string | null
          created_at?: string | null
          department?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      department_section_templates: {
        Row: {
          created_at: string
          department_name: string
          id: string
          is_active: boolean
          requires_brand_location: boolean | null
          sections: Json
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_name: string
          id?: string
          is_active?: boolean
          requires_brand_location?: boolean | null
          sections?: Json
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_name?: string
          id?: string
          is_active?: boolean
          requires_brand_location?: boolean | null
          sections?: Json
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dicom_servers: {
        Row: {
          ae_title: string | null
          clinic_id: string
          created_at: string
          function: string | null
          id: string
          ip_address: string
          name: string
          notes: string | null
          port: number | null
          updated_at: string
        }
        Insert: {
          ae_title?: string | null
          clinic_id: string
          created_at?: string
          function?: string | null
          id?: string
          ip_address: string
          name: string
          notes?: string | null
          port?: number | null
          updated_at?: string
        }
        Update: {
          ae_title?: string | null
          clinic_id?: string
          created_at?: string
          function?: string | null
          id?: string
          ip_address?: string
          name?: string
          notes?: string | null
          port?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dicom_servers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_categories: {
        Row: {
          brand_id: string
          category_type: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          category_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          category_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_categories_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_clinics: {
        Row: {
          address: string
          brand_id: string
          category_id: string | null
          created_at: string | null
          extensions: Json | null
          fax: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string
          region: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          brand_id: string
          category_id?: string | null
          created_at?: string | null
          extensions?: Json | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone: string
          region: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          brand_id?: string
          category_id?: string | null
          created_at?: string | null
          extensions?: Json | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string
          region?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directory_clinics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_clinics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "directory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_contacts: {
        Row: {
          brand_id: string
          category_id: string | null
          contact_type: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          category_id?: string | null
          contact_type: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          category_id?: string | null
          contact_type?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directory_contacts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_contacts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "directory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          marketing_request_id: string | null
          metadata: Json | null
          recipient_email: string
          request_id: string | null
          sent_at: string | null
          status: string
          subject: string
          user_account_request_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          marketing_request_id?: string | null
          metadata?: Json | null
          recipient_email: string
          request_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          user_account_request_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          marketing_request_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          request_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          user_account_request_id?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          recipient_user_id: string
          sent_at: string | null
          subject: string
          ticket_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          recipient_user_id: string
          sent_at?: string | null
          subject: string
          ticket_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          recipient_user_id?: string
          sent_at?: string | null
          subject?: string
          ticket_id?: string | null
        }
        Relationships: []
      }
      engagement_scores: {
        Row: {
          brand_id: string | null
          created_at: string | null
          department: string | null
          id: string
          location_id: string | null
          metrics: Json | null
          period_end: string
          period_start: string
          response_rate: number | null
          score: number | null
          total_responses: number | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          location_id?: string | null
          metrics?: Json | null
          period_end: string
          period_start: string
          response_rate?: number | null
          score?: number | null
          total_responses?: number | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          location_id?: string | null
          metrics?: Json | null
          period_end?: string
          period_start?: string
          response_rate?: number | null
          score?: number | null
          total_responses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_scores_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_scores_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_checks: {
        Row: {
          check_date: string
          checked_by: string | null
          created_at: string | null
          equipment_name: string
          id: string
          initials: string | null
          location_id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          check_date: string
          checked_by?: string | null
          created_at?: string | null
          equipment_name: string
          id?: string
          initials?: string | null
          location_id: string
          notes?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          check_date?: string
          checked_by?: string | null
          created_at?: string | null
          equipment_name?: string
          id?: string
          initials?: string | null
          location_id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_checks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_policies: {
        Row: {
          applies_to_department_id: string | null
          applies_to_request_type_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          levels: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          applies_to_department_id?: string | null
          applies_to_request_type_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          levels: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          applies_to_department_id?: string | null
          applies_to_request_type_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          levels?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_policies_applies_to_department_id_fkey"
            columns: ["applies_to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_policies_applies_to_request_type_id_fkey"
            columns: ["applies_to_request_type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      external_providers: {
        Row: {
          brand_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          url: string | null
        }
        Insert: {
          brand_id: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          brand_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_providers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      file_activity: {
        Row: {
          action: string
          created_at: string
          file_id: string | null
          folder_id: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_activity_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_activity_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_documents: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          is_active: boolean
          mime_type: string
          name: string
          size: number
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          is_active?: boolean
          mime_type: string
          name: string
          size: number
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          is_active?: boolean
          mime_type?: string
          name?: string
          size?: number
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_folders: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          file_id: string | null
          folder_id: string | null
          id: string
          permission: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          permission: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          permission?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          form_type: Database["public"]["Enums"]["form_type_enum"]
          id: string
          is_active: boolean
          name: string
          settings: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          form_type?: Database["public"]["Enums"]["form_type_enum"]
          id?: string
          is_active?: boolean
          name: string
          settings?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          form_type?: Database["public"]["Enums"]["form_type_enum"]
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hardware_catalog: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          manufacturer: string | null
          model_number: string | null
          name: string
          price: number | null
          specifications: Json | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer?: string | null
          model_number?: string | null
          name: string
          price?: number | null
          specifications?: Json | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer?: string | null
          model_number?: string | null
          name?: string
          price?: number | null
          specifications?: Json | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hardware_requests: {
        Row: {
          admin_approval_notes: string | null
          admin_approved_at: string | null
          admin_id: string | null
          assigned_group_id: string | null
          assigned_to: string | null
          brand_id: string | null
          business_justification: string
          cc_emails: string[] | null
          clinic_name: string | null
          created_at: string | null
          currency: string | null
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          description: string | null
          expected_delivery_date: string | null
          id: string
          location_id: string | null
          manager_approval_notes: string | null
          manager_approved_at: string | null
          manager_id: string | null
          priority: string
          request_number: number | null
          status: string
          title: string
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          brand_id?: string | null
          business_justification: string
          cc_emails?: string[] | null
          clinic_name?: string | null
          created_at?: string | null
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id?: string | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: string
          request_number?: number | null
          status?: string
          title: string
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          brand_id?: string | null
          business_justification?: string
          cc_emails?: string[] | null
          clinic_name?: string | null
          created_at?: string | null
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id?: string | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: string
          request_number?: number | null
          status?: string
          title?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hardware_requests_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "request_handler_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hardware_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hardware_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_shortcut_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          internal_route: string | null
          link_type: string
          link_url: string | null
          sharepoint_path: string | null
          shortcut_key: string
          shortcut_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          internal_route?: string | null
          link_type: string
          link_url?: string | null
          sharepoint_path?: string | null
          shortcut_key: string
          shortcut_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          internal_route?: string | null
          link_type?: string
          link_url?: string | null
          sharepoint_path?: string | null
          shortcut_key?: string
          shortcut_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hr_document_mappings: {
        Row: {
          category: string
          created_at: string | null
          document_key: string
          file_path: string
          id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          document_key: string
          file_path: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          document_key?: string
          file_path?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          assigned_group_id: string | null
          assigned_to: string | null
          brand_id: string | null
          clinic: string | null
          created_at: string
          further_comments: string | null
          id: string
          incident_date: string
          incident_description: string
          incident_involves: string
          incident_time: string
          incident_type: string
          location_id: string | null
          modality_area: string
          persons_involved: string
          reporter_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_group_id?: string | null
          assigned_to?: string | null
          brand_id?: string | null
          clinic?: string | null
          created_at?: string
          further_comments?: string | null
          id?: string
          incident_date: string
          incident_description: string
          incident_involves: string
          incident_time: string
          incident_type: string
          location_id?: string | null
          modality_area: string
          persons_involved: string
          reporter_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_group_id?: string | null
          assigned_to?: string | null
          brand_id?: string | null
          clinic?: string | null
          created_at?: string
          further_comments?: string | null
          id?: string
          incident_date?: string
          incident_description?: string
          incident_involves?: string
          incident_time?: string
          incident_type?: string
          location_id?: string | null
          modality_area?: string
          persons_involved?: string
          reporter_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "request_handler_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      kb_pages: {
        Row: {
          author_id: string
          category_id: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string | null
          subcategory_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_pages_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "kb_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_videos: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_published: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          video_url: string
          views: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_published?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_url: string
          views?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_published?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base_pages: {
        Row: {
          active: boolean
          category_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          brand_id: string
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          sort_order: number | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          brand_id: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          sort_order?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          sort_order?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      mailchimp_campaign_assignments: {
        Row: {
          brand_id: string | null
          campaign_id: string
          created_at: string | null
          id: string
          location_id: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          campaign_id: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string
          created_at?: string | null
          id?: string
          location_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mailchimp_campaign_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailchimp_campaign_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_group_id: string | null
          assigned_to: string | null
          attachments: Json | null
          brand_id: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          location_id: string | null
          metadata: Json | null
          priority: string
          request_type: string
          status: string
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          brand_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          priority?: string
          request_type: string
          status?: string
          target_audience?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          brand_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          priority?: string
          request_type?: string
          status?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_requests_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "request_handler_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_configurations: {
        Row: {
          created_at: string | null
          custom_heading_label: string | null
          custom_icon: string | null
          custom_label: string | null
          heading_id: string | null
          id: string
          is_visible: boolean | null
          item_key: string
          item_type: string
          role: Database["public"]["Enums"]["app_role"]
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_heading_label?: string | null
          custom_icon?: string | null
          custom_label?: string | null
          heading_id?: string | null
          id?: string
          is_visible?: boolean | null
          item_key: string
          item_type?: string
          role: Database["public"]["Enums"]["app_role"]
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_heading_label?: string | null
          custom_icon?: string | null
          custom_label?: string | null
          heading_id?: string | null
          id?: string
          is_visible?: boolean | null
          item_key?: string
          item_type?: string
          role?: Database["public"]["Enums"]["app_role"]
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_configurations_heading_id_fkey"
            columns: ["heading_id"]
            isOneToOne: false
            referencedRelation: "menu_headings"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_headings: {
        Row: {
          created_at: string | null
          heading_key: string
          id: string
          is_active: boolean | null
          label: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          heading_key: string
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          heading_key?: string
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      mlo_activities: {
        Row: {
          activity_type: string
          clinic_key: number | null
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          referrer_key: number | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          clinic_key?: number | null
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          referrer_key?: number | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          clinic_key?: number | null
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          referrer_key?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      mlo_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          location_id: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location_id: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          location_id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlo_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mlo_calendar_sync: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          last_modified: string | null
          mlo_visit_id: string | null
          outlook_event_id: string
          sync_status: string
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          last_modified?: string | null
          mlo_visit_id?: string | null
          outlook_event_id: string
          sync_status?: string
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          last_modified?: string | null
          mlo_visit_id?: string | null
          outlook_event_id?: string
          sync_status?: string
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlo_calendar_sync_mlo_visit_id_fkey"
            columns: ["mlo_visit_id"]
            isOneToOne: false
            referencedRelation: "mlo_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      mlo_communications: {
        Row: {
          attachments: Json | null
          clinic_key: number | null
          communication_type: string
          contact_id: string | null
          created_at: string
          detailed_notes: string | null
          direction: string
          duration_minutes: number | null
          follow_up_completed: boolean | null
          follow_up_date: string | null
          id: string
          outcome: string | null
          referrer_key: number | null
          subject: string | null
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          clinic_key?: number | null
          communication_type: string
          contact_id?: string | null
          created_at?: string
          detailed_notes?: string | null
          direction: string
          duration_minutes?: number | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          outcome?: string | null
          referrer_key?: number | null
          subject?: string | null
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          clinic_key?: number | null
          communication_type?: string
          contact_id?: string | null
          created_at?: string
          detailed_notes?: string | null
          direction?: string
          duration_minutes?: number | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          id?: string
          outcome?: string | null
          referrer_key?: number | null
          subject?: string | null
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlo_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "mlo_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      mlo_contacts: {
        Row: {
          birthday: string | null
          clinic_key: number | null
          contact_type: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          interests: string[] | null
          is_active: boolean | null
          is_key_decision_maker: boolean | null
          last_contacted_at: string | null
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method: string | null
          referrer_key: number | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          clinic_key?: number | null
          contact_type: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          interests?: string[] | null
          is_active?: boolean | null
          is_key_decision_maker?: boolean | null
          last_contacted_at?: string | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          referrer_key?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          clinic_key?: number | null
          contact_type?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          interests?: string[] | null
          is_active?: boolean | null
          is_key_decision_maker?: boolean | null
          last_contacted_at?: string | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          referrer_key?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mlo_modality_target_audit: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          location_id: string
          modality_type_id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          period_end: string
          period_start: string
          target_id: string
          target_period: string
          target_referrals: number
          target_revenue: number | null
          target_scans: number
          user_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          location_id: string
          modality_type_id: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          period_end: string
          period_start: string
          target_id: string
          target_period: string
          target_referrals?: number
          target_revenue?: number | null
          target_scans?: number
          user_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          location_id?: string
          modality_type_id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          period_end?: string
          period_start?: string
          target_id?: string
          target_period?: string
          target_referrals?: number
          target_revenue?: number | null
          target_scans?: number
          user_id?: string
        }
        Relationships: []
      }
      mlo_modality_targets: {
        Row: {
          created_at: string | null
          id: string
          is_current: boolean
          location_id: string
          modality_type_id: string
          notes: string | null
          period_end: string
          period_start: string
          set_by: string | null
          superseded_at: string | null
          superseded_by: string | null
          target_period: string
          target_referrals: number | null
          target_revenue: number | null
          target_scans: number | null
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_current?: boolean
          location_id: string
          modality_type_id: string
          notes?: string | null
          period_end: string
          period_start: string
          set_by?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          target_period: string
          target_referrals?: number | null
          target_revenue?: number | null
          target_scans?: number | null
          updated_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_current?: boolean
          location_id?: string
          modality_type_id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          set_by?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          target_period?: string
          target_referrals?: number | null
          target_revenue?: number | null
          target_scans?: number | null
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mlo_modality_targets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_modality_targets_modality_type_id_fkey"
            columns: ["modality_type_id"]
            isOneToOne: false
            referencedRelation: "modality_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_modality_targets_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_modality_targets_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "mlo_modality_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_modality_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mlo_outlook_events: {
        Row: {
          body_preview: string | null
          created_at: string
          end_datetime: string | null
          id: string
          last_modified: string | null
          location: string | null
          outlook_event_id: string
          start_datetime: string | null
          subject: string | null
          synced_at: string
          updated_at: string
          user_id: string
          web_link: string | null
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          end_datetime?: string | null
          id?: string
          last_modified?: string | null
          location?: string | null
          outlook_event_id: string
          start_datetime?: string | null
          subject?: string | null
          synced_at?: string
          updated_at?: string
          user_id: string
          web_link?: string | null
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          end_datetime?: string | null
          id?: string
          last_modified?: string | null
          location?: string | null
          outlook_event_id?: string
          start_datetime?: string | null
          subject?: string | null
          synced_at?: string
          updated_at?: string
          user_id?: string
          web_link?: string | null
        }
        Relationships: []
      }
      mlo_performance_shared_links: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          share_token: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          share_token: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          share_token?: string
        }
        Relationships: []
      }
      mlo_pipeline: {
        Row: {
          actual_close_date: string | null
          clinic_key: number | null
          competitor: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          expected_close_date: string | null
          expected_monthly_referrals: number | null
          expected_revenue: number | null
          id: string
          loss_reason: string | null
          next_action: string | null
          next_action_date: string | null
          opportunity_name: string
          probability: number | null
          referrer_key: number | null
          stage: string
          tags: string[] | null
          updated_at: string
          user_id: string
          win_reason: string | null
        }
        Insert: {
          actual_close_date?: string | null
          clinic_key?: number | null
          competitor?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          expected_monthly_referrals?: number | null
          expected_revenue?: number | null
          id?: string
          loss_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          opportunity_name: string
          probability?: number | null
          referrer_key?: number | null
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          win_reason?: string | null
        }
        Update: {
          actual_close_date?: string | null
          clinic_key?: number | null
          competitor?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          expected_monthly_referrals?: number | null
          expected_revenue?: number | null
          id?: string
          loss_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          opportunity_name?: string
          probability?: number | null
          referrer_key?: number | null
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          win_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mlo_pipeline_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "mlo_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      mlo_relationship_scores: {
        Row: {
          calculated_at: string
          clinic_key: number | null
          created_at: string
          days_since_last_contact: number | null
          engagement_score: number | null
          id: string
          last_visit_date: string | null
          notes: string | null
          overall_score: number | null
          referral_trend: string | null
          referrer_key: number | null
          risk_level: string | null
          satisfaction_score: number | null
          total_referrals_ytd: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          clinic_key?: number | null
          created_at?: string
          days_since_last_contact?: number | null
          engagement_score?: number | null
          id?: string
          last_visit_date?: string | null
          notes?: string | null
          overall_score?: number | null
          referral_trend?: string | null
          referrer_key?: number | null
          risk_level?: string | null
          satisfaction_score?: number | null
          total_referrals_ytd?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          clinic_key?: number | null
          created_at?: string
          days_since_last_contact?: number | null
          engagement_score?: number | null
          id?: string
          last_visit_date?: string | null
          notes?: string | null
          overall_score?: number | null
          referral_trend?: string | null
          referrer_key?: number | null
          risk_level?: string | null
          satisfaction_score?: number | null
          total_referrals_ytd?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mlo_targets: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          period_end: string
          period_start: string
          set_by: string | null
          target_new_referrers: number | null
          target_period: string
          target_revenue: number | null
          target_visits: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          period_end: string
          period_start: string
          set_by?: string | null
          target_new_referrers?: number | null
          target_period: string
          target_revenue?: number | null
          target_visits?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          period_end?: string
          period_start?: string
          set_by?: string | null
          target_new_referrers?: number | null
          target_period?: string
          target_revenue?: number | null
          target_visits?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlo_targets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_targets_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mlo_tasks: {
        Row: {
          assigned_to: string | null
          clinic_key: number | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: string
          recurrence: string | null
          referrer_key: number | null
          reminder_date: string | null
          status: string
          tags: string[] | null
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          clinic_key?: number | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          recurrence?: string | null
          referrer_key?: number | null
          reminder_date?: string | null
          status?: string
          tags?: string[] | null
          task_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          clinic_key?: number | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          recurrence?: string | null
          referrer_key?: number | null
          reminder_date?: string | null
          status?: string
          tags?: string[] | null
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlo_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "mlo_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      mlo_visits: {
        Row: {
          brand_id: string | null
          clinic_key: number | null
          contact_name: string | null
          contact_role: string | null
          created_at: string | null
          follow_up_completed: boolean | null
          follow_up_date: string | null
          follow_up_location: string | null
          follow_up_notes: string | null
          follow_up_time: string | null
          id: string
          location_id: string | null
          notes: string | null
          outcome: string | null
          purpose: string | null
          referrer_key: number | null
          updated_at: string | null
          user_id: string
          visit_date: string
          visit_time: string | null
          visit_type: string
        }
        Insert: {
          brand_id?: string | null
          clinic_key?: number | null
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          follow_up_location?: string | null
          follow_up_notes?: string | null
          follow_up_time?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          outcome?: string | null
          purpose?: string | null
          referrer_key?: number | null
          updated_at?: string | null
          user_id: string
          visit_date: string
          visit_time?: string | null
          visit_type: string
        }
        Update: {
          brand_id?: string | null
          clinic_key?: number | null
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string | null
          follow_up_completed?: boolean | null
          follow_up_date?: string | null
          follow_up_location?: string | null
          follow_up_notes?: string | null
          follow_up_time?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          outcome?: string | null
          purpose?: string | null
          referrer_key?: number | null
          updated_at?: string | null
          user_id?: string
          visit_date?: string
          visit_time?: string | null
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlo_visits_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_visits_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlo_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modalities: {
        Row: {
          ae_title: string | null
          brand_id: string | null
          clinic_id: string
          created_at: string
          id: string
          ip_address: string
          location_id: string | null
          modality_type: string | null
          name: string
          notes: string | null
          port: number | null
          updated_at: string
          worklist_ae_title: string | null
          worklist_ip_address: string | null
          worklist_port: number | null
        }
        Insert: {
          ae_title?: string | null
          brand_id?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          ip_address: string
          location_id?: string | null
          modality_type?: string | null
          name: string
          notes?: string | null
          port?: number | null
          updated_at?: string
          worklist_ae_title?: string | null
          worklist_ip_address?: string | null
          worklist_port?: number | null
        }
        Update: {
          ae_title?: string | null
          brand_id?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          ip_address?: string
          location_id?: string | null
          modality_type?: string | null
          name?: string
          notes?: string | null
          port?: number | null
          updated_at?: string
          worklist_ae_title?: string | null
          worklist_ip_address?: string | null
          worklist_port?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modalities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modalities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modalities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      modality_department_pages: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          gradient: string | null
          icon: string | null
          id: string
          page_key: string
          page_type: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          gradient?: string | null
          icon?: string | null
          id?: string
          page_key: string
          page_type: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          gradient?: string | null
          icon?: string | null
          id?: string
          page_key?: string
          page_type?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      modality_types: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          author_id: string
          brand_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          brand_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          brand_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_assignments: {
        Row: {
          assigned_at: string
          brand_id: string | null
          contributor_id: string
          created_at: string
          cycle_id: string
          department: string
          id: string
          is_required: boolean | null
          location_id: string | null
          section: string | null
          status: string
          submitted_at: string | null
          template_id: string | null
          topic: string | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          assigned_at?: string
          brand_id?: string | null
          contributor_id: string
          created_at?: string
          cycle_id: string
          department: string
          id?: string
          is_required?: boolean | null
          location_id?: string | null
          section?: string | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          topic?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          assigned_at?: string
          brand_id?: string | null
          contributor_id?: string
          created_at?: string
          cycle_id?: string
          department?: string
          id?: string
          is_required?: boolean | null
          location_id?: string | null
          section?: string | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
          topic?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_assignments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "newsletter_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          month: number
          name: string
          notes: string | null
          owner_id: string | null
          owner_reminder_sent: boolean | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          month: number
          name: string
          notes?: string | null
          owner_id?: string | null
          owner_reminder_sent?: boolean | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          month?: number
          name?: string
          notes?: string | null
          owner_id?: string | null
          owner_reminder_sent?: boolean | null
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_cycles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_reminder_logs: {
        Row: {
          channel: string
          created_at: string
          cycle_id: string
          department: string
          id: string
          metadata: Json | null
          sent_at: string
          type: string
          user_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          cycle_id: string
          department: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          type: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          cycle_id?: string
          department?: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_reminder_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "newsletter_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_submissions: {
        Row: {
          assignment_id: string
          attachments: Json | null
          brand_id: string | null
          clinic_updates: Json | null
          content: string
          contributor_id: string
          created_at: string
          cycle_id: string
          department: string
          id: string
          images: Json | null
          location_id: string | null
          no_update_this_month: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section: string | null
          sections_data: Json | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attachments?: Json | null
          brand_id?: string | null
          clinic_updates?: Json | null
          content: string
          contributor_id: string
          created_at?: string
          cycle_id: string
          department: string
          id?: string
          images?: Json | null
          location_id?: string | null
          no_update_this_month?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string | null
          sections_data?: Json | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attachments?: Json | null
          brand_id?: string | null
          clinic_updates?: Json | null
          content?: string
          contributor_id?: string
          created_at?: string
          cycle_id?: string
          department?: string
          id?: string
          images?: Json | null
          location_id?: string | null
          no_update_this_month?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string | null
          sections_data?: Json | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "newsletter_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_submissions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_submissions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "newsletter_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_submissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_templates: {
        Row: {
          body_template: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          subject_template: string | null
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          subject_template?: string | null
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          subject_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          event_type: string
          id: string
          in_app_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          event_type: string
          id?: string
          in_app_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          event_type?: string
          id?: string
          in_app_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          reference_url: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_url?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_url?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifyre_fax_campaigns: {
        Row: {
          brand_id: string | null
          campaign_id: string
          campaign_name: string | null
          contact_group_id: string | null
          contact_group_name: string | null
          created_at: string
          delivered_count: number | null
          document_path: string | null
          failed_count: number | null
          id: string
          location_id: string | null
          metadata: Json | null
          pending_count: number | null
          sent_at: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          campaign_id: string
          campaign_name?: string | null
          contact_group_id?: string | null
          contact_group_name?: string | null
          created_at?: string
          delivered_count?: number | null
          document_path?: string | null
          failed_count?: number | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          pending_count?: number | null
          sent_at?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string
          campaign_name?: string | null
          contact_group_id?: string | null
          contact_group_name?: string | null
          created_at?: string
          delivered_count?: number | null
          document_path?: string | null
          failed_count?: number | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          pending_count?: number | null
          sent_at?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifyre_fax_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifyre_fax_campaigns_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifyre_fax_logs: {
        Row: {
          campaign_id: string | null
          cost_cents: number | null
          created_at: string
          delivered_at: string | null
          document_id: string | null
          document_path: string | null
          document_url: string | null
          duration_seconds: number | null
          error_message: string | null
          failed_at: string | null
          id: string
          notifyre_fax_id: string | null
          pages_sent: number | null
          recipient_name: string | null
          recipient_number: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string
          delivered_at?: string | null
          document_id?: string | null
          document_path?: string | null
          document_url?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          notifyre_fax_id?: string | null
          pages_sent?: number | null
          recipient_name?: string | null
          recipient_number: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string
          delivered_at?: string | null
          document_id?: string | null
          document_path?: string | null
          document_url?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          notifyre_fax_id?: string | null
          pages_sent?: number | null
          recipient_name?: string | null
          recipient_number?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifyre_fax_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notifyre_fax_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      notifyre_sync_history: {
        Row: {
          campaigns_synced: number
          created_at: string
          error_message: string | null
          faxes_synced: number
          from_date: string
          id: string
          status: string
          synced_by: string | null
          to_date: string
        }
        Insert: {
          campaigns_synced?: number
          created_at?: string
          error_message?: string | null
          faxes_synced?: number
          from_date: string
          id?: string
          status?: string
          synced_by?: string | null
          to_date: string
        }
        Update: {
          campaigns_synced?: number
          created_at?: string
          error_message?: string | null
          faxes_synced?: number
          from_date?: string
          id?: string
          status?: string
          synced_by?: string | null
          to_date?: string
        }
        Relationships: []
      }
      office365_connections: {
        Row: {
          access_token: string
          company_id: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      office365_sync_jobs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          mailboxes_synced: number | null
          progress: Json | null
          started_at: string
          started_by: string | null
          status: string
          updated_at: string
          users_created: number | null
          users_synced: number | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mailboxes_synced?: number | null
          progress?: Json | null
          started_at?: string
          started_by?: string | null
          status?: string
          updated_at?: string
          users_created?: number | null
          users_synced?: number | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mailboxes_synced?: number | null
          progress?: Json | null
          started_at?: string
          started_by?: string | null
          status?: string
          updated_at?: string
          users_created?: number | null
          users_synced?: number | null
        }
        Relationships: []
      }
      offline_form_drafts: {
        Row: {
          created_at: string | null
          device_id: string | null
          form_data: Json
          form_type: string
          id: string
          synced_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          form_data: Json
          form_type: string
          id?: string
          synced_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          synced_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      onboarding_journeys: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          id: string
          manager_id: string | null
          mentor_id: string | null
          notes: string | null
          start_date: string
          status: string | null
          target_completion_date: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          manager_id?: string | null
          mentor_id?: string | null
          notes?: string | null
          start_date?: string
          status?: string | null
          target_completion_date?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          id?: string
          manager_id?: string | null
          mentor_id?: string | null
          notes?: string | null
          start_date?: string
          status?: string | null
          target_completion_date?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_journeys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_milestones: {
        Row: {
          completed_at: string | null
          created_at: string | null
          employee_feedback: string | null
          id: string
          journey_id: string
          manager_notes: string | null
          milestone_type: string
          scheduled_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          employee_feedback?: string | null
          id?: string
          journey_id: string
          manager_notes?: string | null
          milestone_type: string
          scheduled_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          employee_feedback?: string | null
          id?: string
          journey_id?: string
          manager_notes?: string | null
          milestone_type?: string
          scheduled_date?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_milestones_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "onboarding_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_task_completions: {
        Row: {
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          journey_id: string
          notes: string | null
          sort_order: number | null
          template_item_id: string | null
          title: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          journey_id: string
          notes?: string | null
          sort_order?: number | null
          template_item_id?: string | null
          title: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          journey_id?: string
          notes?: string | null
          sort_order?: number | null
          template_item_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_task_completions_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "onboarding_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_task_completions_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          due_days: number | null
          id: string
          is_required: boolean | null
          sort_order: number | null
          template_id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          template_id: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          brand_id: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      page_modules: {
        Row: {
          column_span: number
          content: Json
          created_at: string
          id: string
          module_type: string
          page_id: string
          row_index: number
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          column_span?: number
          content?: Json
          created_at?: string
          id?: string
          module_type: string
          page_id: string
          row_index?: number
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          column_span?: number
          content?: Json
          created_at?: string
          id?: string
          module_type?: string
          page_id?: string
          row_index?: number
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_modules_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "modality_department_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_user_assignments: {
        Row: {
          applied_at: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          location_ids: string[] | null
          role_ids: string[] | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          location_ids?: string[] | null
          role_ids?: string[] | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          location_ids?: string[] | null
          role_ids?: string[] | null
        }
        Relationships: []
      }
      print_brands: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          imported_from_o365: boolean | null
          is_active: boolean | null
          last_login: string | null
          location: string | null
          location_id: string | null
          phone: string | null
          sms_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          brand_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          imported_from_o365?: boolean | null
          is_active?: boolean | null
          last_login?: string | null
          location?: string | null
          location_id?: string | null
          phone?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          brand_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          imported_from_o365?: boolean | null
          is_active?: boolean | null
          last_login?: string | null
          location?: string | null
          location_id?: string | null
          phone?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          endpoint: string
          id: string
          is_active: boolean | null
          keys: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          keys: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          keys?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_code_scans: {
        Row: {
          city: string | null
          country: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          qr_code_id: string
          referrer: string | null
          scanned_at: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          qr_code_id: string
          referrer?: string | null
          scanned_at?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          qr_code_id?: string
          referrer?: string | null
          scanned_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_code_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          short_code: string
          target_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          short_code: string
          target_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          short_code?: string
          target_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_links: {
        Row: {
          company_id: string | null
          created_at: string | null
          icon: string | null
          id: string
          position: number | null
          title: string
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          position?: number | null
          title: string
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          position?: number | null
          title?: string
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rbac_audit_log: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          created_at: string | null
          effect: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          effect: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          effect?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rbac_user_permissions: {
        Row: {
          created_at: string | null
          effect: string
          id: string
          permission_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          effect: string
          id?: string
          permission_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          effect?: string
          id?: string
          permission_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_user_roles: {
        Row: {
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrer_directory: {
        Row: {
          address: string | null
          clinic_key: number | null
          clinic_name: string | null
          clinic_phone: string | null
          email: string | null
          first_name: string | null
          id: number
          nearest_location_id: string | null
          phone: string | null
          postcode: string | null
          provider_number: string | null
          referrer_code: string | null
          referrer_key: number
          referrer_name: string
          search_vector: unknown
          specialities: string | null
          state: string | null
          suburb: string | null
          surname: string | null
          synced_at: string | null
        }
        Insert: {
          address?: string | null
          clinic_key?: number | null
          clinic_name?: string | null
          clinic_phone?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          nearest_location_id?: string | null
          phone?: string | null
          postcode?: string | null
          provider_number?: string | null
          referrer_code?: string | null
          referrer_key: number
          referrer_name: string
          search_vector?: unknown
          specialities?: string | null
          state?: string | null
          suburb?: string | null
          surname?: string | null
          synced_at?: string | null
        }
        Update: {
          address?: string | null
          clinic_key?: number | null
          clinic_name?: string | null
          clinic_phone?: string | null
          email?: string | null
          first_name?: string | null
          id?: number
          nearest_location_id?: string | null
          phone?: string | null
          postcode?: string | null
          provider_number?: string | null
          referrer_code?: string | null
          referrer_key?: number
          referrer_name?: string
          search_vector?: unknown
          specialities?: string | null
          state?: string | null
          suburb?: string | null
          surname?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrer_directory_nearest_location_id_fkey"
            columns: ["nearest_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      referrer_sync_history: {
        Row: {
          clinic_count: number | null
          completed_at: string | null
          error_message: string | null
          id: number
          referrer_count: number | null
          started_at: string | null
          status: string | null
          sync_type: string | null
        }
        Insert: {
          clinic_count?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: number
          referrer_count?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Update: {
          clinic_count?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: number
          referrer_count?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Relationships: []
      }
      reminder_advance_notice_options: {
        Row: {
          created_at: string | null
          days: number
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days: number
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days?: number
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reminder_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          reminder_id: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          reminder_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          reminder_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_attachments_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      reminder_notifications: {
        Row: {
          days_before: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          recipient: string | null
          reminder_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          days_before?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          recipient?: string | null
          reminder_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          days_before?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipient?: string | null
          reminder_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_notifications_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          advance_notice_days: number[] | null
          cc_emails: string[] | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          last_notification_sent: string | null
          metadata: Json | null
          notification_channels: Json
          phone_number: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          reminder_date: string
          reminder_type: string
          repeat_until_complete: boolean | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advance_notice_days?: number[] | null
          cc_emails?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          last_notification_sent?: string | null
          metadata?: Json | null
          notification_channels?: Json
          phone_number?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          reminder_date: string
          reminder_type: string
          repeat_until_complete?: boolean | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advance_notice_days?: number[] | null
          cc_emails?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          last_notification_sent?: string | null
          metadata?: Json | null
          notification_channels?: Json
          phone_number?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          reminder_date?: string
          reminder_type?: string
          repeat_until_complete?: boolean | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      request_activity: {
        Row: {
          activity_type: string
          comment: string | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          new_value: string | null
          old_value: string | null
          request_id: string
          request_type: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          new_value?: string | null
          old_value?: string | null
          request_id: string
          request_type?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          new_value?: string | null
          old_value?: string | null
          request_id?: string
          request_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      request_attachments: {
        Row: {
          attachment_type: string
          content_type: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          request_id: string
          uploaded_by: string
        }
        Insert: {
          attachment_type: string
          content_type?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          request_id: string
          uploaded_by: string
        }
        Update: {
          attachment_type?: string
          content_type?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          request_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_categories: {
        Row: {
          assigned_to: string | null
          assigned_user_ids: string[] | null
          cc_emails: string[] | null
          created_at: string | null
          description: string | null
          form_required: boolean | null
          form_template_id: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          request_type_id: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_user_ids?: string[] | null
          cc_emails?: string[] | null
          created_at?: string | null
          description?: string | null
          form_required?: boolean | null
          form_template_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          request_type_id: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_user_ids?: string[] | null
          cc_emails?: string[] | null
          created_at?: string | null
          description?: string | null
          form_required?: boolean | null
          form_template_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          request_type_id?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_categories_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_categories_request_type_id_fkey"
            columns: ["request_type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      request_comments: {
        Row: {
          attachments: string[] | null
          author_email: string
          author_name: string
          content: string
          content_html: string | null
          created_at: string
          email_message_id: string | null
          id: string
          is_internal: boolean | null
          request_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          author_email: string
          author_name: string
          content: string
          content_html?: string | null
          created_at?: string
          email_message_id?: string | null
          id?: string
          is_internal?: boolean | null
          request_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          author_email?: string
          author_name?: string
          content?: string
          content_html?: string | null
          created_at?: string
          email_message_id?: string | null
          id?: string
          is_internal?: boolean | null
          request_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      request_handler_group_members: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_handler_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "request_handler_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_handler_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_handler_groups: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_handler_groups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          model_number: string | null
          name: string
          quantity: number
          request_id: string
          specifications: Json | null
          total_price: number | null
          unit_price: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_number?: string | null
          name: string
          quantity?: number
          request_id: string
          specifications?: Json | null
          total_price?: number | null
          unit_price?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_number?: string | null
          name?: string
          quantity?: number
          request_id?: string
          specifications?: Json | null
          total_price?: number | null
          unit_price?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_notification_assignments: {
        Row: {
          assignee_ids: string[]
          created_at: string
          department: string | null
          id: string
          notification_level: string
          request_type: string
          updated_at: string
        }
        Insert: {
          assignee_ids?: string[]
          created_at?: string
          department?: string | null
          id?: string
          notification_level?: string
          request_type: string
          updated_at?: string
        }
        Update: {
          assignee_ids?: string[]
          created_at?: string
          department?: string | null
          id?: string
          notification_level?: string
          request_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      request_status_history: {
        Row: {
          changed_by: string
          created_at: string | null
          id: string
          notes: string | null
          request_id: string
          status: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id: string
          status: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_types: {
        Row: {
          cc_emails: string[] | null
          created_at: string | null
          department_id: string | null
          description: string | null
          form_template_id: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          cc_emails?: string[] | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          form_template_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          cc_emails?: string[] | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          form_template_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_types_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_types_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_cache: {
        Row: {
          cached_at: string
          created_at: string
          file_name: string
          id: string
          roster_type: string
          updated_at: string
          web_url: string
        }
        Insert: {
          cached_at?: string
          created_at?: string
          file_name: string
          id?: string
          roster_type: string
          updated_at?: string
          web_url: string
        }
        Update: {
          cached_at?: string
          created_at?: string
          file_name?: string
          id?: string
          roster_type?: string
          updated_at?: string
          web_url?: string
        }
        Relationships: []
      }
      roster_files: {
        Row: {
          brand_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          roster_type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          roster_type: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          roster_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_files_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          created_at: string | null
          default_assignee_user_id: string | null
          id: string
          is_active: boolean | null
          json_rules: Json | null
          priority: number | null
          request_type_id: string
          skills: string[] | null
          strategy: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_assignee_user_id?: string | null
          id?: string
          is_active?: boolean | null
          json_rules?: Json | null
          priority?: number | null
          request_type_id: string
          skills?: string[] | null
          strategy: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_assignee_user_id?: string | null
          id?: string
          is_active?: boolean | null
          json_rules?: Json | null
          priority?: number | null
          request_type_id?: string
          skills?: string[] | null
          strategy?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_request_type_id_fkey"
            columns: ["request_type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          id: string
          name: string
          query: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          query: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          query?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_campaign_reports: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          recipient_email: string
          time_of_day: string
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          recipient_email: string
          time_of_day?: string
          timeframe: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          recipient_email?: string
          time_of_day?: string
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shareable_modality_links: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: string | null
          encrypted_token: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          modality_id: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          encrypted_token: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          modality_id: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          encrypted_token?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          modality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareable_modality_links_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_clinic_links: {
        Row: {
          access_count: number | null
          clinic_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          share_token: string
        }
        Insert: {
          access_count?: number | null
          clinic_id: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          share_token: string
        }
        Update: {
          access_count?: number | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_clinic_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      sharepoint_cache: {
        Row: {
          cached_at: string
          child_count: number | null
          company_id: string
          created_at: string
          created_by: string | null
          created_datetime: string | null
          download_url: string | null
          expires_at: string
          file_type: string | null
          id: string
          item_id: string
          item_type: string
          last_modified_by: string | null
          last_modified_datetime: string | null
          metadata: Json | null
          name: string
          parent_path: string
          permissions: Json | null
          size: number | null
          updated_at: string
          web_url: string | null
        }
        Insert: {
          cached_at?: string
          child_count?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          created_datetime?: string | null
          download_url?: string | null
          expires_at?: string
          file_type?: string | null
          id?: string
          item_id: string
          item_type: string
          last_modified_by?: string | null
          last_modified_datetime?: string | null
          metadata?: Json | null
          name: string
          parent_path: string
          permissions?: Json | null
          size?: number | null
          updated_at?: string
          web_url?: string | null
        }
        Update: {
          cached_at?: string
          child_count?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_datetime?: string | null
          download_url?: string | null
          expires_at?: string
          file_type?: string | null
          id?: string
          item_id?: string
          item_type?: string
          last_modified_by?: string | null
          last_modified_datetime?: string | null
          metadata?: Json | null
          name?: string
          parent_path?: string
          permissions?: Json | null
          size?: number | null
          updated_at?: string
          web_url?: string | null
        }
        Relationships: []
      }
      sharepoint_configurations: {
        Row: {
          company_id: string
          configured_by: string | null
          created_at: string | null
          folder_path: string | null
          id: string
          is_active: boolean | null
          site_id: string | null
          site_name: string | null
          site_url: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          configured_by?: string | null
          created_at?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          site_id?: string | null
          site_name?: string | null
          site_url?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          configured_by?: string | null
          created_at?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          site_id?: string | null
          site_name?: string | null
          site_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sharepoint_favorites: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_name: string
          item_path: string
          item_type: string
          item_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_name: string
          item_path: string
          item_type: string
          item_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_path?: string
          item_type?: string
          item_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sharepoint_recent_items: {
        Row: {
          id: string
          item_id: string
          item_name: string
          item_path: string
          item_type: string
          item_url: string | null
          last_accessed_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          item_name: string
          item_path: string
          item_type: string
          item_url?: string | null
          last_accessed_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          item_name?: string
          item_path?: string
          item_type?: string
          item_url?: string | null
          last_accessed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          answer_choice: string | null
          answer_choices: string[] | null
          answer_scale: number | null
          answer_text: string | null
          answered_at: string | null
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer_choice?: string | null
          answer_choices?: string[] | null
          answer_scale?: number | null
          answer_text?: string | null
          answered_at?: string | null
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer_choice?: string | null
          answer_choices?: string[] | null
          answer_scale?: number | null
          answer_text?: string | null
          answered_at?: string | null
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          options: Json | null
          question_text: string
          question_type: string
          scale_labels: Json | null
          scale_max: number | null
          scale_min: number | null
          sort_order: number | null
          survey_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_text: string
          question_type: string
          scale_labels?: Json | null
          scale_max?: number | null
          scale_min?: number | null
          sort_order?: number | null
          survey_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_text?: string
          question_type?: string
          scale_labels?: Json | null
          scale_max?: number | null
          scale_min?: number | null
          sort_order?: number | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          anonymous_id: string | null
          id: string
          is_complete: boolean | null
          submitted_at: string | null
          survey_id: string
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          id?: string
          is_complete?: boolean | null
          submitted_at?: string | null
          survey_id: string
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          id?: string
          is_complete?: boolean | null
          submitted_at?: string | null
          survey_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          is_anonymous: boolean | null
          starts_at: string | null
          survey_type: string
          target_audience: string | null
          target_filter: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          starts_at?: string | null
          survey_type: string
          target_audience?: string | null
          target_filter?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_anonymous?: boolean | null
          starts_at?: string | null
          survey_type?: string
          target_audience?: string | null
          target_filter?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      synced_office365_mailboxes: {
        Row: {
          company_id: string
          created_at: string | null
          email_address: string
          id: string
          mailbox_name: string
          mailbox_type: string | null
          members: Json | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email_address: string
          id?: string
          mailbox_name: string
          mailbox_type?: string | null
          members?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email_address?: string
          id?: string
          mailbox_name?: string
          mailbox_type?: string | null
          members?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      synced_office365_users: {
        Row: {
          assigned_licenses: Json | null
          business_phones: Json | null
          company_id: string
          created_at: string | null
          department: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          mail: string | null
          member_of: Json | null
          mobile_phone: string | null
          office_location: string | null
          synced_at: string | null
          updated_at: string | null
          user_principal_name: string
        }
        Insert: {
          assigned_licenses?: Json | null
          business_phones?: Json | null
          company_id: string
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          mail?: string | null
          member_of?: Json | null
          mobile_phone?: string | null
          office_location?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_principal_name: string
        }
        Update: {
          assigned_licenses?: Json | null
          business_phones?: Json | null
          company_id?: string
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          mail?: string | null
          member_of?: Json | null
          mobile_phone?: string | null
          office_location?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_principal_name?: string
        }
        Relationships: []
      }
      system_banners: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          message: string
          show_on_pages: string[] | null
          start_date: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          message: string
          show_on_pages?: string[] | null
          start_date?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          message?: string
          show_on_pages?: string[] | null
          start_date?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_statuses: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          message: string | null
          sort_order: number | null
          status: string
          system_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          message?: string | null
          sort_order?: number | null
          status: string
          system_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          message?: string | null
          sort_order?: number | null
          status?: string
          system_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          out_of_office_from: string | null
          out_of_office_to: string | null
          role_in_team: string | null
          skills: string[] | null
          team_id: string
          timezone: string | null
          updated_at: string | null
          user_id: string
          workload_capacity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          out_of_office_from?: string | null
          out_of_office_to?: string | null
          role_in_team?: string | null
          skills?: string[] | null
          team_id: string
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          workload_capacity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          out_of_office_from?: string | null
          out_of_office_to?: string | null
          role_in_team?: string | null
          skills?: string[] | null
          team_id?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          workload_capacity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_metrics: {
        Row: {
          avg_resolution_days: number | null
          checklist_completion_rate: number | null
          created_at: string | null
          id: string
          manager_id: string
          metric_date: string
          metrics_data: Json | null
          open_requests: number | null
          overdue_items: number | null
          pending_approvals: number | null
          team_size: number | null
        }
        Insert: {
          avg_resolution_days?: number | null
          checklist_completion_rate?: number | null
          created_at?: string | null
          id?: string
          manager_id: string
          metric_date?: string
          metrics_data?: Json | null
          open_requests?: number | null
          overdue_items?: number | null
          pending_approvals?: number | null
          team_size?: number | null
        }
        Update: {
          avg_resolution_days?: number | null
          checklist_completion_rate?: number | null
          created_at?: string | null
          id?: string
          manager_id?: string
          metric_date?: string
          metrics_data?: Json | null
          open_requests?: number | null
          overdue_items?: number | null
          pending_approvals?: number | null
          team_size?: number | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string | null
          id: string
          ticket_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string | null
          id?: string
          ticket_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string | null
          id?: string
          ticket_id?: string
        }
        Relationships: []
      }
      ticket_events: {
        Row: {
          actor_user_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          ticket_id: string
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          ticket_id: string
          type: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          ticket_id?: string
          type?: string
        }
        Relationships: []
      }
      ticket_watchers: {
        Row: {
          added_by_user_id: string | null
          created_at: string | null
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          added_by_user_id?: string | null
          created_at?: string | null
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          added_by_user_id?: string | null
          created_at?: string | null
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          admin_approval_notes: string | null
          admin_approved_at: string | null
          admin_id: string | null
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          approver_id: string | null
          assigned_group_id: string | null
          assigned_to: string | null
          attachments: Json | null
          brand_id: string | null
          business_justification: string | null
          category_id: string | null
          cc_emails: string[] | null
          clinic_name: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          deadline: string | null
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          declined_reason: string | null
          department_id: string | null
          description: string | null
          expected_delivery_date: string | null
          form_template_id: string | null
          id: string
          location_id: string | null
          manager_approval_notes: string | null
          manager_approved_at: string | null
          manager_id: string | null
          metadata: Json | null
          priority: string
          request_number: number
          request_type_id: string | null
          source: string | null
          status: string
          title: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          brand_id?: string | null
          business_justification?: string | null
          category_id?: string | null
          cc_emails?: string[] | null
          clinic_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          declined_reason?: string | null
          department_id?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          form_template_id?: string | null
          id?: string
          location_id?: string | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          metadata?: Json | null
          priority?: string
          request_number?: never
          request_type_id?: string | null
          source?: string | null
          status?: string
          title: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_id?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          brand_id?: string | null
          business_justification?: string | null
          category_id?: string | null
          cc_emails?: string[] | null
          clinic_name?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          declined_reason?: string | null
          department_id?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          form_template_id?: string | null
          id?: string
          location_id?: string | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          metadata?: Json | null
          priority?: string
          request_number?: never
          request_type_id?: string | null
          source?: string | null
          status?: string
          title?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tickets_department"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "request_handler_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "request_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_request_type_id_fkey"
            columns: ["request_type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      toner_requests: {
        Row: {
          assigned_to: string | null
          brand_id: string | null
          colors_required: string[] | null
          completed_at: string | null
          created_at: string
          description: string | null
          eta_delivery: string | null
          id: string
          location_id: string | null
          predicted_toner_models: string | null
          printer_model: string | null
          priority: string
          quantity: number
          site: string | null
          status: string
          title: string
          toner_type: string | null
          tracking_link: string | null
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          brand_id?: string | null
          colors_required?: string[] | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          eta_delivery?: string | null
          id?: string
          location_id?: string | null
          predicted_toner_models?: string | null
          printer_model?: string | null
          priority?: string
          quantity?: number
          site?: string | null
          status?: string
          title: string
          toner_type?: string | null
          tracking_link?: string | null
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          brand_id?: string | null
          colors_required?: string[] | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          eta_delivery?: string | null
          id?: string
          location_id?: string | null
          predicted_toner_models?: string | null
          printer_model?: string | null
          priority?: string
          quantity?: number
          site?: string | null
          status?: string
          title?: string
          toner_type?: string | null
          tracking_link?: string | null
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toner_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toner_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          brand_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          brand_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          brand_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_prefs: {
        Row: {
          channel: string | null
          created_at: string | null
          digest: string | null
          events: Json | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          digest?: string | null
          events?: Json | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          digest?: string | null
          events?: Json | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_ticket_to_team: { Args: { ticket_id: string }; Returns: string }
      calculate_completion_percentage: {
        Args: { p_completion_id: string }
        Returns: undefined
      }
      clean_expired_sharepoint_cache: { Args: never; Returns: undefined }
      generate_short_code: { Args: never; Returns: string }
      get_department_handler_group: {
        Args: { _department_id: string }
        Returns: string
      }
      get_request_approver: {
        Args: {
          p_brand_id: string
          p_location_id: string
          p_request_type_id: string
        }
        Returns: string
      }
      has_rbac_role: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: never; Returns: boolean }
      is_cycle_deadline_passed: {
        Args: { p_cycle_id: string }
        Returns: boolean
      }
      is_handler_for_department: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
      is_in_handler_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_mlo_manager: { Args: { _user_id: string }; Returns: boolean }
      truncate_clinic_directory: { Args: never; Returns: undefined }
      truncate_referrer_directory: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "requester"
        | "manager"
        | "marketing_manager"
        | "tenant_admin"
        | "super_admin"
        | "marketing"
      form_type_enum:
        | "hardware_request"
        | "department_request"
        | "toner_request"
        | "user_account_request"
        | "general"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "requester",
        "manager",
        "marketing_manager",
        "tenant_admin",
        "super_admin",
        "marketing",
      ],
      form_type_enum: [
        "hardware_request",
        "department_request",
        "toner_request",
        "user_account_request",
        "general",
      ],
    },
  },
} as const
