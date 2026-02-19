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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      _encryption_keys: {
        Row: {
          id: string
          key_name: string
          key_value: string
        }
        Insert: {
          id?: string
          key_name: string
          key_value: string
        }
        Update: {
          id?: string
          key_name?: string
          key_value?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          permissions: Json
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          permissions?: Json
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          billing_info: Json | null
          business_id: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contract_status: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          billing_info?: Json | null
          business_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_status?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          billing_info?: Json | null
          business_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_status?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_attribute_links: {
        Row: {
          attribute_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          attribute_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          attribute_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_attribute_links_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "company_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_attribute_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_attribute_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      company_attributes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_contracts: {
        Row: {
          company_id: string
          contract_status: string
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          notes: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          company_id: string
          contract_status?: string
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          notes?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          contract_status?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          notes?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          company_id: string
          created_at: string
          document_type_id: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          notes: string | null
          signature_method: string | null
          signed_at: string | null
          signed_by: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type_id: string
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          notes?: string | null
          signature_method?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          notes?: string | null
          signature_method?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      company_shared_attachment_links: {
        Row: {
          company_id: string
          created_at: string
          id: string
          shared_attachment_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          shared_attachment_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          shared_attachment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_shared_attachment_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_shared_attachment_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_shared_attachment_links_shared_attachment_id_fkey"
            columns: ["shared_attachment_id"]
            isOneToOne: false
            referencedRelation: "shared_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      device_links: {
        Row: {
          created_at: string | null
          id: string
          source_device_id: string
          target_device_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_device_id: string
          target_device_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_device_id?: string
          target_device_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_links_source_device_id_fkey"
            columns: ["source_device_id"]
            isOneToOne: false
            referencedRelation: "hardware_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_links_target_device_id_fkey"
            columns: ["target_device_id"]
            isOneToOne: false
            referencedRelation: "hardware_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_types: {
        Row: {
          created_at: string | null
          display_name: string
          has_sim: boolean | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          has_sim?: boolean | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          has_sim?: boolean | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          name: string
          scope: string | null
          validity_period_months: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          name: string
          scope?: string | null
          validity_period_months?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          name?: string
          scope?: string | null
          validity_period_months?: number | null
        }
        Relationships: []
      }
      driver_attribute_links: {
        Row: {
          attribute_id: string
          created_at: string | null
          driver_id: string
          id: string
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          driver_id: string
          id?: string
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          driver_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_attribute_links_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "driver_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_attribute_links_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_attribute_links_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_attributes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          created_at: string | null
          document_type_id: string
          driver_id: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          uploaded_by: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          document_type_id: string
          driver_id: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          document_type_id?: string
          driver_id?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_shared_attachment_links: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          shared_attachment_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          shared_attachment_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          shared_attachment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_shared_attachment_links_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_shared_attachment_links_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_shared_attachment_links_shared_attachment_id_fkey"
            columns: ["shared_attachment_id"]
            isOneToOne: false
            referencedRelation: "shared_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          city: string | null
          company_id: string | null
          created_at: string
          driver_license_valid_until: string | null
          driver_number: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          province: string | null
          ssn_encrypted: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          created_at?: string
          driver_license_valid_until?: string | null
          driver_number: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          province?: string | null
          ssn_encrypted?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_id?: string | null
          created_at?: string
          driver_license_valid_until?: string | null
          driver_number?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          province?: string | null
          ssn_encrypted?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hardware_devices: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          device_type: string
          id: string
          serial_number: string
          sim_number: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          device_type: string
          id?: string
          serial_number: string
          sim_number?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          device_type?: string
          id?: string
          serial_number?: string
          sim_number?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hardware_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hardware_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hardware_devices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          created_at: string
          id: string
          name: string
          province: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          province?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          province?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          driver_license_valid_until: string | null
          driver_number: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_license_valid_until?: string | null
          driver_number?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_license_valid_until?: string | null
          driver_number?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quality_incidents: {
        Row: {
          action_taken: string | null
          created_at: string
          created_by: string
          description: string
          driver_id: string | null
          id: string
          incident_date: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          source: string | null
          status: Database["public"]["Enums"]["incident_status"]
          updated_at: string
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          created_by: string
          description: string
          driver_id?: string | null
          id?: string
          incident_date?: string
          incident_type: Database["public"]["Enums"]["incident_type"]
          source?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          created_by?: string
          description?: string
          driver_id?: string | null
          id?: string
          incident_date?: string
          incident_type?: Database["public"]["Enums"]["incident_type"]
          source?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_incidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_incidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_page_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          page_key: string
          role_id: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_key: string
          role_id: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_key?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_page_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          name: string
          scope: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_type?: string
          id?: string
          name: string
          scope?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          name?: string
          scope?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      ssn_view_logs: {
        Row: {
          driver_id: string
          id: string
          viewed_at: string
          viewed_by: string
        }
        Insert: {
          driver_id: string
          id?: string
          viewed_at?: string
          viewed_by: string
        }
        Update: {
          driver_id?: string
          id?: string
          viewed_at?: string
          viewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssn_view_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssn_view_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_todos: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_attribute_links: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          vehicle_id: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          vehicle_id: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_attribute_links_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "vehicle_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_attribute_links_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_attributes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      vehicle_fleet_links: {
        Row: {
          created_at: string
          fleet_id: string
          id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          fleet_id: string
          id?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          fleet_id?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fleet_links_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fleet_links_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          brand: string
          city: string | null
          co2_emissions: number | null
          company_id: string | null
          created_at: string
          fuel_type: string | null
          id: string
          meter_serial_number: string | null
          model: string
          payment_terminal_id: string | null
          registration_number: string
          status: string
          updated_at: string
          vehicle_number: string
          year_model: number | null
        }
        Insert: {
          assigned_driver_id?: string | null
          brand: string
          city?: string | null
          co2_emissions?: number | null
          company_id?: string | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          meter_serial_number?: string | null
          model: string
          payment_terminal_id?: string | null
          registration_number: string
          status?: string
          updated_at?: string
          vehicle_number: string
          year_model?: number | null
        }
        Update: {
          assigned_driver_id?: string | null
          brand?: string
          city?: string | null
          co2_emissions?: number | null
          company_id?: string | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          meter_serial_number?: string | null
          model?: string
          payment_terminal_id?: string | null
          registration_number?: string
          status?: string
          updated_at?: string
          vehicle_number?: string
          year_model?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      companies_safe: {
        Row: {
          address: string | null
          contract_status: string | null
          created_at: string | null
          id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contract_status?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contract_status?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drivers_safe: {
        Row: {
          city: string | null
          company_id: string | null
          created_at: string | null
          driver_license_valid_until: string | null
          driver_number: string | null
          email: string | null
          full_name: string | null
          id: string | null
          notes: string | null
          phone: string | null
          province: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          driver_license_valid_until?: string | null
          driver_number?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          notes?: string | null
          phone?: string | null
          province?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          driver_license_valid_until?: string | null
          driver_number?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          notes?: string | null
          phone?: string | null
          province?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrypt_ssn: { Args: { encrypted: string }; Returns: string }
      encrypt_ssn: { Args: { plaintext: string }; Returns: string }
      get_driver_ssn: { Args: { p_driver_id: string }; Returns: string }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_page_permission: {
        Args: { _page_key: string; _user_id: string }
        Returns: {
          can_edit: boolean
          can_view: boolean
        }[]
      }
      has_any_role:
        | {
            Args: {
              _roles: Database["public"]["Enums"]["app_role"][]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _roles: string[]; _user_id: string }; Returns: boolean }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      hash_api_key: { Args: { plain_key: string }; Returns: string }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      touch_api_key: { Args: { p_key_hash: string }; Returns: undefined }
      validate_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          api_key_id: string
          company_id: string
          permissions: Json
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "driver"
        | "system_admin"
        | "contract_manager"
        | "hardware_ops"
        | "support"
      incident_status: "new" | "investigating" | "resolved" | "closed"
      incident_type:
        | "customer_complaint"
        | "service_quality"
        | "vehicle_condition"
        | "driver_behavior"
        | "safety_issue"
        | "billing_issue"
        | "other"
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
        "admin",
        "manager",
        "driver",
        "system_admin",
        "contract_manager",
        "hardware_ops",
        "support",
      ],
      incident_status: ["new", "investigating", "resolved", "closed"],
      incident_type: [
        "customer_complaint",
        "service_quality",
        "vehicle_condition",
        "driver_behavior",
        "safety_issue",
        "billing_issue",
        "other",
      ],
    },
  },
} as const
