import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAILimits = () => {
  const [remainingMessages, setRemainingMessages] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkLimits();
  }, []);

  const checkLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (adminCheck) {
        setIsAdmin(true);
        setRemainingMessages(999); // Admins have unlimited
        setLoading(false);
        return;
      }

      // Get or create daily limit record
      const today = new Date().toISOString().split('T')[0];
      
      let { data: limitData, error: fetchError } = await supabase
        .from('user_daily_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create new record
        const { data: newLimit, error: insertError } = await supabase
          .from('user_daily_limits')
          .insert({
            user_id: user.id,
            messages_today: 0,
            last_reset_date: today
          })
          .select()
          .single();

        if (insertError) throw insertError;
        limitData = newLimit;
      } else if (fetchError) {
        throw fetchError;
      }

      // Check if we need to reset (new day)
      if (limitData && limitData.last_reset_date !== today) {
        const { data: updatedLimit, error: updateError } = await supabase
          .from('user_daily_limits')
          .update({
            messages_today: 0,
            last_reset_date: today
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        limitData = updatedLimit;
      }

      const remaining = Math.max(0, 10 - (limitData?.messages_today || 0));
      setRemainingMessages(remaining);
    } catch (error) {
      console.error('Error checking AI limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    if (isAdmin) return true; // Admins bypass limit

    if (remainingMessages <= 0) {
      toast.error('محدودیت روزانه شما تمام شده است. فردا دوباره تلاش کنید.');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: currentLimit } = await supabase
        .from('user_daily_limits')
        .select('messages_today')
        .eq('user_id', user.id)
        .single();

      const newCount = (currentLimit?.messages_today || 0) + 1;

      const { error } = await supabase
        .from('user_daily_limits')
        .update({
          messages_today: newCount
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setRemainingMessages(prev => Math.max(0, prev - 1));
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  };

  return {
    remainingMessages,
    loading,
    isAdmin,
    canSendMessage: isAdmin || remainingMessages > 0,
    incrementUsage,
    refreshLimits: checkLimits
  };
};
