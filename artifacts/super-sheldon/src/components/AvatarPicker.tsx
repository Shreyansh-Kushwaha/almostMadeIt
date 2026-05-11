import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Loader2, Trash2 } from "lucide-react";

// 30 graphic avatars via DiceBear (SVG, free, deterministic). Mixed styles so
// the picker has visual variety: 10 robot-style, 10 emoji-face, 10 illustrated.
const SEEDS = [
  "Atlas", "Nova", "Cosmo", "Pixel", "Echo", "Vega", "Orion", "Zephyr", "Lyra", "Sage",
  "Coco", "Mango", "Pepper", "Hazel", "Olive", "Berry", "Maple", "Sunny", "Luna", "Rio",
  "Aria", "Kai", "Mira", "Noah", "Leo", "Iris", "Jett", "Vera", "Ezra", "Wren",
];
const STYLES = ["bottts-neutral", "fun-emoji", "lorelei"] as const;

const AVATAR_URLS: string[] = SEEDS.map((seed, i) => {
  const style = STYLES[Math.floor(i / 10)];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
});

interface AvatarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl?: string | null;
  isSaving?: boolean;
  onSelect: (url: string | null) => void;
}

export default function AvatarPicker({ open, onOpenChange, currentUrl, isSaving, onSelect }: AvatarPickerProps) {
  const [picked, setPicked] = useState<string | null>(currentUrl ?? null);

  const handleSave = () => {
    onSelect(picked);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick your avatar</DialogTitle>
          <DialogDescription>
            Choose from 30 graphic avatars. Changes are saved to your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-[420px] overflow-y-auto p-1">
          {AVATAR_URLS.map((url) => {
            const isPicked = picked === url;
            return (
              <motion.button
                key={url}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setPicked(url)}
                data-testid={`button-avatar-${url}`}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors bg-card/50 ${
                  isPicked ? "border-primary ring-2 ring-primary/40" : "border-white/10 hover:border-primary/40"
                }`}
              >
                <img src={url} alt="avatar option" className="w-full h-full object-cover" loading="lazy" />
                {isPicked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center"
                  >
                    <Check className="w-3 h-3" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPicked(null)}
            disabled={isSaving}
            className="text-muted-foreground hover:text-destructive"
            data-testid="button-avatar-clear"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || picked === currentUrl} data-testid="button-avatar-save">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save avatar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
