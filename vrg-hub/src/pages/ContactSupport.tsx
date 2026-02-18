import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageSquare, Mail, MonitorPlay, Linkedin, Ticket, Paperclip, X, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

const ticketSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    required_error: "Please select a priority",
  }),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000, "Description must be less than 2000 characters"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

const ContactSupport = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      priority: "medium",
      description: "",
    },
  });

  // Auto-fill email and name when user is logged in
  useEffect(() => {
    if (user || profile) {
      const userEmail = user?.email || profile?.email || "";
      const userName = profile?.full_name || "";
      
      if (userEmail) {
        form.setValue("email", userEmail);
      }
      if (userName) {
        form.setValue("name", userName);
      }
    }
  }, [user, profile, form]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large (max 20MB)`;
    }
    return null;
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    const currentCount = attachments.length;
    
    if (currentCount + filesArray.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `You can only attach up to ${MAX_FILES} files`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    filesArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "File validation errors",
        description: errors.join(", "),
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleFiles(files);
      toast({
        title: "Files pasted",
        description: `${files.length} file(s) attached from clipboard`,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const onSubmit = (data: TicketFormData) => {
    console.log("Ticket submission (prototype):", { ...data, attachments });
    toast({
      title: "Ticket Submitted",
      description: "Your support ticket has been received. We'll get back to you soon!",
    });
    form.reset();
    setAttachments([]);
    setDialogOpen(false);
  };

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">IT Support Contact Information</h1>
          <p className="text-lg text-muted-foreground">
            You manage your business, we manage your technology.
          </p>
          
          {/* Submit Ticket Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-card">
                <Ticket className="mr-2 h-5 w-5" />
                Submit Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit a Support Ticket</DialogTitle>
                <DialogDescription>
                  Fill out the form below and our support team will get back to you as soon as possible.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="john@example.com" 
                              {...field}
                              disabled={!!(user || profile)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="0412 345 678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject *</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of the issue" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            ref={textareaRef}
                            placeholder="Please provide detailed information about your issue... (You can paste images here)"
                            className="min-h-[150px] resize-none"
                            onPaste={handlePaste}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Tip: You can paste images directly into this field
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* File Attachments */}
                  <div className="space-y-3">
                    <Label>Attachments (Optional)</Label>
                    
                    {/* Drag & Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                        transition-colors
                        ${isDragging 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted-foreground/25 hover:border-primary/50'
                        }
                      `}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFiles(e.target.files);
                          }
                        }}
                      />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag & drop files here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max {MAX_FILES} files, 20MB each
                      </p>
                    </div>

                    {/* Attached Files List */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {attachments.length} file(s) attached
                        </p>
                        <div className="space-y-2">
                          {attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                className="flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {/* Phone Support */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle>Phone Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="w-full text-lg"
              >
                <a href="tel:+61383305755">
                  (03) 8330 5755
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>WhatsApp</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                <a 
                  href="https://wa.me/61492877412" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Start a Live Support Chat
                </a>
              </Button>
              <p className="text-center text-muted-foreground">0492 877 412</p>
            </CardContent>
          </Card>

          {/* Email Support */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Email Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                <a href="mailto:support@crowdit.com.au">
                  support@crowdit.com.au
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Remote Session */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MonitorPlay className="h-5 w-5 text-primary" />
                <CardTitle>Join a Support Session</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                asChild 
                size="lg" 
                className="w-full"
              >
                <a 
                  href="https://crowdit.screenconnect.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Join Session
                </a>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Start a remote session with a technician
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Social Links */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Connect With Us</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center">
              <Button 
                asChild 
                variant="outline" 
                size="lg"
              >
                <a 
                  href="https://www.linkedin.com/company/crowditservices/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Linkedin className="h-5 w-5" />
                  LinkedIn
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
    </PageContainer>
  );
};

export default ContactSupport;
