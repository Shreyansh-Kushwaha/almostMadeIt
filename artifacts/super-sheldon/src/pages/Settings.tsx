import { useEffect, useState } from "react";
import {
  useGetMe,
  useUpdateMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AvatarPicker from "@/components/AvatarPicker";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setSubject(user.subject);
    }
  }, [user]);

  const updateMutation = useUpdateMe({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: () => {
        toast.error("Could not save changes");
      },
    },
  });

  if (isLoading || !user) {
    return <Skeleton className="h-64 w-full max-w-2xl" />;
  }

  const dirty = name !== user.name || subject !== user.subject;

  // Defer opening to next tick — without this, the click event that opens the
  // dialog keeps bubbling to document, and Radix's outside-click handler treats
  // it as a "click outside the dialog" and closes it ~half a second later.
  const openPicker = () => {
    setTimeout(() => setPickerOpen(true), 0);
  };

  const handleSave = () => {
    updateMutation.mutate(
      { data: { name, subject } },
      {
        onSuccess: () => toast.success("Profile updated"),
      },
    );
  };

  const handleAvatarPick = (avatarUrl: string | null) => {
    updateMutation.mutate(
      { data: { avatarUrl } },
      {
        onSuccess: () => {
          toast.success(avatarUrl ? "Avatar updated" : "Avatar removed");
          setPickerOpen(false);
        },
      },
    );
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={openPicker}
              data-testid="button-open-avatar-picker"
              className="relative group rounded-full"
            >
              <Avatar className="w-20 h-20 ring-2 ring-primary/30 transition-all group-hover:ring-primary/60">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                <Pencil className="w-4 h-4 mr-1" /> Change
              </span>
            </button>
            <div>
              <Button variant="outline" onClick={openPicker}>
                Choose from gallery
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1.5">30 graphic avatars to pick from</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="settings-name">Full Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-settings-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" defaultValue={user.email} disabled className="bg-muted" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-subject">Subject</Label>
              <Input
                id="settings-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                data-testid="input-settings-subject"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>

      <AvatarPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentUrl={user.avatarUrl}
        isSaving={updateMutation.isPending}
        onSelect={handleAvatarPick}
      />
    </div>
  );
}
