import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Camera, User, Phone, Eye, Lock, Shield, GitBranch, UserCog } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageCropDialog } from '@/components/profile/ImageCropDialog';

interface ExtendedProfile {
  id: string; user_id: string; name: string; email: string; department: string | null;
  display_name: string | null; profile_image_url: string | null; mobile_number: string | null;
  register_number: string | null; is_mobile_visible: boolean; reporting_manager_id: string | null;
}

export default function AccountSettingsPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [isMobileVisible, setIsMobileVisible] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['account-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      if (error) throw error;
      const p = data as ExtendedProfile;
      setDisplayName(p.display_name || p.name || '');
      setMobileNumber(p.mobile_number || '');
      setRegisterNumber(p.register_number || '');
      setIsMobileVisible(p.is_mobile_visible ?? true);
      return p;
    },
    enabled: !!user,
  });

  const defaultAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const { data: managerName } = useQuery({
    queryKey: ['reporting-manager', profile?.reporting_manager_id],
    queryFn: async () => {
      if (!profile?.reporting_manager_id) return null;
      const { data } = await supabase.from('profiles').select('name').eq('id', profile.reporting_manager_id).single();
      return data?.name || null;
    },
    enabled: !!profile?.reporting_manager_id,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({
        display_name: displayName || null, mobile_number: mobileNumber || null,
        register_number: registerNumber || null, is_mobile_visible: isMobileVisible,
      }).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['account-profile'] }); toast.success('Profile updated successfully'); },
    onError: () => toast.error('Failed to update profile'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    setIsCropping(true);
    try {
      const path = `${user!.id}/avatar.png`;
      const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, blob, { upsert: true, contentType: 'image/png' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ profile_image_url: publicUrl }).eq('user_id', user!.id);
      if (updateError) throw updateError;
      queryClient.invalidateQueries({ queryKey: ['account-profile'] });
      toast.success('Profile image updated');
      setCropImageSrc(null);
    } catch { toast.error('Failed to upload image'); } finally { setIsCropping(false); }
  };

  const handleSetDefaultAvatar = async () => {
    if (!defaultAvatarUrl) return;
    setUploading(true);
    try {
      const { error } = await supabase.from('profiles').update({ profile_image_url: defaultAvatarUrl }).eq('user_id', user!.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['account-profile'] });
      toast.success('Profile image set to your account avatar');
    } catch { toast.error('Failed to set default avatar'); } finally { setUploading(false); }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setNewPassword(''); setConfirmPassword('');
    } catch { toast.error('Failed to update password'); }
  };

  if (isLoading) {
    return (<DashboardLayout><div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  const currentAvatar = profile?.profile_image_url || defaultAvatarUrl;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <PageHeader title="Account Settings" subtitle="Manage your profile and preferences" icon={<UserCog className="h-5 w-5 text-primary" />} />

        <GlassCard>
          <div className="flex items-center gap-2 mb-4"><Camera className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold font-display">Profile Picture</h3></div>
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              <AvatarImage src={currentAvatar || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">{(profile?.display_name || profile?.name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Upload & Crop
                </Button>
                {defaultAvatarUrl && !profile?.profile_image_url && (
                  <Button variant="secondary" className="rounded-xl" onClick={handleSetDefaultAvatar} disabled={uploading}>Use Account Avatar</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5MB. Image will be cropped to a square.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4"><User className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold font-display">Profile Information</h3></div>
          <p className="text-sm text-muted-foreground mb-4">Update your display name and details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Real Name (read-only)</Label><Input value={profile?.name || ''} disabled /></div>
            <div className="space-y-2"><Label>Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How you want to be shown" /></div>
            <div className="space-y-2"><Label>Email (read-only)</Label><Input value={profile?.email || ''} disabled /></div>
            <div className="space-y-2"><Label>Department (read-only)</Label><Input value={profile?.department || 'Not assigned'} disabled /></div>
            {role === 'STUDENT' && (<div className="space-y-2"><Label>Register Number</Label><Input value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} placeholder="Your student register number" /></div>)}
          </div>
          <Button className="mt-4 rounded-xl" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Profile
          </Button>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4"><Phone className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold font-display">Mobile Number</h3></div>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Mobile Number</Label><Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="+91 98765 43210" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={isMobileVisible} onCheckedChange={setIsMobileVisible} id="mobile-visibility" />
              <Label htmlFor="mobile-visibility" className="flex items-center gap-2"><Eye className="h-4 w-4" />Show mobile number to other users</Label>
            </div>
            <Button className="rounded-xl" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>Save</Button>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4"><Shield className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold font-display">Role & Hierarchy</h3></div>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Your Role</span><span className="font-medium">{role || 'N/A'}</span></div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2"><GitBranch className="h-4 w-4" /> Reporting Manager</span>
              <span className="font-medium">{managerName || 'None assigned'}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4"><Lock className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold font-display">Change Password</h3></div>
          <div className="space-y-4">
            <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" /></div>
            <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
            <Button className="rounded-xl" onClick={handlePasswordChange} disabled={!newPassword || !confirmPassword}>Update Password</Button>
          </div>
        </GlassCard>
      </div>

      {cropImageSrc && (
        <ImageCropDialog open={!!cropImageSrc} imageSrc={cropImageSrc} onClose={() => setCropImageSrc(null)} onCropComplete={handleCropComplete} saving={isCropping} />
      )}
    </DashboardLayout>
  );
}
