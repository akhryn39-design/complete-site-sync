import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header to verify the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if calling user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: callingUser.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, searchQuery } = await req.json();
    console.log('Admin action:', action, 'userId:', userId, 'searchQuery:', searchQuery);

    switch (action) {
      case 'listUsers': {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;

        // Get roles for all users
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, role');

        // Get profiles
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, avatar_url, created_at');

        // Enrich users with profile and role data
        let enrichedUsers = users.map(user => {
          const profile = profiles?.find(p => p.id === user.id);
          const userRole = roles?.find(r => r.user_id === user.id);
          return {
            id: user.id,
            email: user.email,
            full_name: profile?.full_name || 'بدون نام',
            avatar_url: profile?.avatar_url,
            role: userRole?.role || 'user',
            created_at: profile?.created_at || user.created_at,
            last_sign_in: user.last_sign_in_at
          };
        });

        // Filter by search query if provided
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          enrichedUsers = enrichedUsers.filter(u => 
            u.full_name?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.role?.toLowerCase().includes(query)
          );
        }

        return new Response(JSON.stringify({ users: enrichedUsers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'deleteUser': {
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (userId === callingUser.id) {
          return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete user role first
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Delete user profile
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

        // Delete the user from auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'updateRole': {
        if (!userId) {
          return new Response(JSON.stringify({ error: 'userId is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { role } = await req.json();
        
        // Delete existing role
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Insert new role if not 'user' (default)
        if (role && role !== 'user') {
          const { error } = await supabaseAdmin
            .from('user_roles')
            .insert([{ user_id: userId, role }]);
          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getAdminStats': {
        // Get counts for admin dashboard
        const { count: totalUsers } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { data: adminRoles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('role', 'admin');

        const { data: modRoles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('role', 'moderator');

        return new Response(JSON.stringify({
          totalUsers: totalUsers || 0,
          admins: adminRoles?.length || 0,
          moderators: modRoles?.length || 0,
          regularUsers: (totalUsers || 0) - (adminRoles?.length || 0) - (modRoles?.length || 0)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Error in admin-users function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});