import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';

interface Advertisement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  position: string;
  lock_duration: number;
}

interface AdDisplayProps {
  position: 'sidebar' | 'chat_top' | 'chat_bottom' | 'modal';
}

const AdDisplay = ({ position }: AdDisplayProps) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [lockedAds, setLockedAds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAds();

    const interval = setInterval(() => {
      if (ads.length > 1) {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [ads.length]);

  const loadAds = async () => {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('position', position)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setAds(data);
      if (position === 'modal' && data.length > 0) {
        setShowModal(true);
      }
    }
  };

  const handleAdClick = (ad: Advertisement) => {
    if (ad.link_url) {
      window.open(ad.link_url, '_blank');
    }
  };

  const handleCloseModal = (adId: string, lockDuration: number) => {
    if (lockDuration > 0) {
      setLockedAds(new Set([...lockedAds, adId]));
      setTimeout(() => {
        setLockedAds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(adId);
          return newSet;
        });
      }, lockDuration * 1000);
    }
    setShowModal(false);
  };

  if (ads.length === 0) return null;

  const currentAd = ads[currentAdIndex];
  if (!currentAd) return null;

  if (position === 'modal') {
    const isLocked = lockedAds.has(currentAd.id);

    return (
      <Dialog open={showModal && !isLocked} onOpenChange={(open) => !open && handleCloseModal(currentAd.id, currentAd.lock_duration)}>
        <DialogContent className="max-w-2xl">
          <div className="relative">
            {currentAd.lock_duration > 0 && (
              <div className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                ⏱️ {currentAd.lock_duration}s
              </div>
            )}
            {currentAd.image_url && (
              <img src={currentAd.image_url} alt={currentAd.title} className="w-full h-64 object-cover rounded-lg mb-4" />
            )}
            <h3 className="text-2xl font-bold mb-3">{currentAd.title}</h3>
            <p className="text-muted-foreground mb-4">{currentAd.content}</p>
            {currentAd.link_url && (
              <Button className="w-full gradient-primary" onClick={() => handleAdClick(currentAd)}>
                اطلاعات بیشتر
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer group ${
        position === 'sidebar' ? 'mx-2 my-4' : 'mb-4'
      }`}
      onClick={() => handleAdClick(currentAd)}
    >
      {currentAd.image_url && (
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={currentAd.image_url}
            alt={currentAd.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}
      <div className="p-4 bg-card">
        <h3 className="font-bold text-lg mb-2">{currentAd.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{currentAd.content}</p>
      </div>
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {ads.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentAdIndex ? 'bg-primary w-6' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdDisplay;