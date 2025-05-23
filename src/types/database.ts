export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          plan: 'free' | 'starter' | 'pro' | 'enterprise';
          settings: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          plan?: 'free' | 'starter' | 'pro' | 'enterprise';
          settings?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          plan?: 'free' | 'starter' | 'pro' | 'enterprise';
          settings?: Record<string, unknown>;
        };
      };
      users: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          name: string;
          role: 'admin' | 'member' | 'viewer';
          tenant_id: string;
          settings: Record<string, unknown>;
        };
        Insert: {
          id: string;
          created_at?: string;
          email: string;
          name: string;
          role?: 'admin' | 'member' | 'viewer';
          tenant_id: string;
          settings?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          email?: string;
          name?: string;
          role?: 'admin' | 'member' | 'viewer';
          tenant_id?: string;
          settings?: Record<string, unknown>;
        };
      };
      sites: {
        Row: {
          id: string;
          created_at: string;
          tenant_id: string;
          domain: string;
          name: string;
          ga4_property_id: string | null;
          gsc_property_url: string | null;
          settings: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          tenant_id: string;
          domain: string;
          name: string;
          ga4_property_id?: string | null;
          gsc_property_url?: string | null;
          settings?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          tenant_id?: string;
          domain?: string;
          name?: string;
          ga4_property_id?: string | null;
          gsc_property_url?: string | null;
          settings?: Record<string, unknown>;
        };
      };
      oauth_tokens: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          provider: 'google';
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scopes: string[];
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          provider: 'google';
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scopes: string[];
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          provider?: 'google';
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          scopes?: string[];
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
