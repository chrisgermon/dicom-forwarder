import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Video, Upload, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function VideoLibrary() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['kb-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_videos')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVideo || !videoTitle) {
        throw new Error('Please provide a video file and title');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to upload videos');

      // Upload video to storage
      const fileExt = selectedVideo.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kb-videos')
        .upload(fileName, selectedVideo, {
          contentType: selectedVideo.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('kb-videos')
        .getPublicUrl(fileName);

      // Create database entry
      const { error: dbError } = await supabase
        .from('kb_videos')
        .insert({
          title: videoTitle,
          description: videoDescription,
          video_url: publicUrl,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Video uploaded successfully',
      });
      setUploadDialogOpen(false);
      setSelectedVideo(null);
      setVideoTitle('');
      setVideoDescription('');
      queryClient.invalidateQueries({ queryKey: ['kb-videos'] });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const video = videos.find(v => v.id === videoId);
      if (!video) throw new Error('Video not found');

      // Delete from storage
      const fileName = video.video_url.split('/').slice(-2).join('/');
      await supabase.storage
        .from('kb-videos')
        .remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from('kb_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Video deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['kb-videos'] });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
    },
  });

  const handleUpload = async () => {
    setUploading(true);
    try {
      await uploadMutation.mutateAsync();
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Invalid File',
          description: 'Please select a video file',
          variant: 'destructive',
        });
        return;
      }
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Video file must be less than 100MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedVideo(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6" />
            Video Library
          </h2>
          <p className="text-muted-foreground">How-to videos and tutorials</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Video
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading videos...</div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No videos uploaded yet. Click "Upload Video" to add your first how-to video.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <video
                  src={video.video_url}
                  className="w-full h-full object-cover"
                  poster={video.thumbnail_url}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => {
                      const videoElement = document.createElement('video');
                      videoElement.src = video.video_url;
                      videoElement.controls = true;
                      videoElement.className = 'w-full h-full';
                      
                      const dialog = document.createElement('dialog');
                      dialog.className = 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center max-w-5xl mx-auto';
                      dialog.appendChild(videoElement);
                      dialog.onclick = () => {
                        dialog.close();
                        document.body.removeChild(dialog);
                      };
                      
                      document.body.appendChild(dialog);
                      dialog.showModal();
                      videoElement.play();
                    }}
                  >
                    <Play className="h-8 w-8" />
                  </Button>
                </div>
                {video.views > 0 && (
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    {video.views} views
                  </Badge>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{video.title}</CardTitle>
              </CardHeader>
              {video.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.description}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(video.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload How-To Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-file">Video File (Max 100MB)</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
              />
              {selectedVideo && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedVideo.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="video-title">Title *</Label>
              <Input
                id="video-title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g., How to Reset Your Password"
              />
            </div>
            <div>
              <Label htmlFor="video-description">Description</Label>
              <Textarea
                id="video-description"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Brief description of what this video covers..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedVideo || !videoTitle}
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
