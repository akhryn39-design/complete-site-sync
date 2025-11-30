import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatModeToggleProps {
  mode: 'ai' | 'search';
  onModeChange: (mode: 'ai' | 'search') => void;
}

export const ChatModeToggle = ({ mode, onModeChange }: ChatModeToggleProps) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      <Button
        variant={mode === 'ai' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('ai')}
        className={cn(
          "gap-1.5 transition-all",
          mode === 'ai' && "shadow-sm"
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-xs">هوش مصنوعی</span>
      </Button>
      <Button
        variant={mode === 'search' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('search')}
        className={cn(
          "gap-1.5 transition-all",
          mode === 'search' && "shadow-sm"
        )}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs">جستجوی منابع</span>
      </Button>
    </div>
  );
};
