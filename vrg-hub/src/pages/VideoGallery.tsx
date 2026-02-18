import { Player } from "@remotion/player";
import { MRIPromoVideo } from "@/remotion/compositions/MRIPromoVideo";
import { VisionRadiologyBrandVideo } from "@/remotion/compositions/VisionRadiologyBrandVideo";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Play, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function VideoGallery() {
  const handleShare = (videoName: string) => {
    toast.success(`${videoName} share link copied to clipboard!`);
  };

  const handleDownload = (videoName: string) => {
    toast.info(`${videoName} download feature coming soon!`);
  };

  return (
    <PageContainer maxWidth="2xl" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Video Gallery</h1>
        <p className="text-lg text-muted-foreground">
          Professional promotional videos for Vision Radiology Group
        </p>
      </div>

      {/* Main Videos Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vision Radiology Brand Video */}
        <Card className="shadow-card hover:shadow-elevated transition-all">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Vision Radiology Brand
                  <Badge variant="success">New</Badge>
                </CardTitle>
                <CardDescription>
                  Complete brand overview and services showcase
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare("Vision Radiology Brand")}
                  title="Share video"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDownload("Vision Radiology Brand")}
                  title="Download video"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <Player
                component={VisionRadiologyBrandVideo}
                durationInFrames={750}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                controls
                loop
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                }}
                inputProps={{
                  titleText: "Excellence In Radiology",
                  subtitleText: "Your trusted partner in diagnostic imaging",
                }}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <span className="font-medium">25 seconds</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolution:</span>{" "}
                  <span className="font-medium">1920x1080 HD</span>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Highlights:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Comprehensive imaging services
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    24 clinics across Victoria
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Locally owned and operated
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MRI Promo Video */}
        <Card className="shadow-card hover:shadow-elevated transition-all">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  MRI Promotion
                  <Badge variant="success">New</Badge>
                </CardTitle>
                <CardDescription>
                  Advanced MRI imaging services showcase
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare("MRI Promotion")}
                  title="Share video"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDownload("MRI Promotion")}
                  title="Download video"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <Player
                component={MRIPromoVideo}
                durationInFrames={450}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                controls
                loop
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                }}
                inputProps={{
                  titleText: "Advanced MRI Imaging",
                  subtitleText: "State-of-the-art technology for precise diagnostics",
                }}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <span className="font-medium">15 seconds</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolution:</span>{" "}
                  <span className="font-medium">1920x1080 HD</span>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Highlights:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Fast same-day results
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    3T MRI scanner technology
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Expert subspecialist reporting
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Built with Remotion</CardTitle>
              <CardDescription>Programmatically generated video content</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://www.remotion.dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Play className="h-4 w-4 mr-2" />
                Learn More
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            These videos were created programmatically using React components with Remotion, allowing for
            dynamic content generation, easy customization, and version control of video content.
          </p>
        </CardContent>
      </Card>

      {/* Coming Soon Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>More Videos Coming Soon</CardTitle>
          <CardDescription>
            Additional promotional videos for other modalities and services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["CT Scan", "Ultrasound", "X-Ray", "Mammography"].map((modality) => (
              <div
                key={modality}
                className="aspect-video rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground"
              >
                {modality} Video
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
