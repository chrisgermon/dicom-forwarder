import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Heart, MapPin, Award, Clock } from "lucide-react";

interface VisionRadiologyBrandProps {
  titleText?: string;
}

export const VisionRadiologyBrandVideo: React.FC<VisionRadiologyBrandProps> = ({
  titleText = "Excellence In Radiology",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timing (25 seconds total at 30fps = 750 frames)
  const scene1Duration = fps * 4; // 4 seconds - Opening
  const scene2Duration = fps * 12; // 12 seconds - Services showcase
  const scene3Duration = fps * 5; // 5 seconds - Key differentiators

  // Scene 1: Opening (0-4s)
  const scene1Opacity = interpolate(
    frame,
    [0, 20, scene1Duration - 20, scene1Duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scene1Scale = interpolate(
    frame,
    [0, 40],
    [0.9, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 2: Services (4-16s)
  const scene2Start = scene1Duration;
  const scene2Opacity = interpolate(
    frame,
    [scene2Start, scene2Start + 20, scene2Start + scene2Duration - 20, scene2Start + scene2Duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 3: Differentiators (16-21s)
  const scene3Start = scene1Duration + scene2Duration;
  const scene3Opacity = interpolate(
    frame,
    [scene3Start, scene3Start + 20, scene3Start + scene3Duration - 20, scene3Start + scene3Duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 4: Call to action (21-25s)
  const scene4Start = scene1Duration + scene2Duration + scene3Duration;
  const scene4Opacity = interpolate(
    frame,
    [scene4Start, scene4Start + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scene4Scale = interpolate(
    frame,
    [scene4Start, scene4Start + 30],
    [0.95, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Vision Radiology brand color
  const vrgBlue = "#11B2E2";

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
      {/* Subtle background gradient */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at 50% 50%, rgba(17, 178, 226, 0.05) 0%, transparent 70%)`,
        }}
      />

      {/* Scene 1: Opening with tagline */}
      {frame < scene1Duration && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: scene1Opacity,
          }}
        >
          <div
            style={{
              transform: `scale(${scene1Scale})`,
              textAlign: "center",
              maxWidth: 1400,
              padding: 80,
            }}
          >
            {/* Logo/Heart Icon */}
            <div
              style={{
                marginBottom: 60,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: vrgBlue,
                  borderRadius: "50%",
                  padding: 50,
                  boxShadow: `0 20px 60px ${vrgBlue}40`,
                }}
              >
                <Heart size={100} color="white" strokeWidth={2} fill="white" />
              </div>
            </div>

            <h1
              style={{
                fontSize: 110,
                fontWeight: 700,
                color: "#1a1a1a",
                margin: 0,
                marginBottom: 30,
                fontFamily: "Inter, sans-serif",
                letterSpacing: "-3px",
              }}
            >
              Vision Radiology
            </h1>
            <div
              style={{
                height: 6,
                width: 200,
                background: vrgBlue,
                margin: "0 auto 30px",
                borderRadius: 3,
              }}
            />
            <p
              style={{
                fontSize: 48,
                color: "#666",
                margin: 0,
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                fontStyle: "italic",
              }}
            >
              {titleText}
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* Scene 2: Services Showcase */}
      {frame >= scene2Start && frame < scene2Start + scene2Duration && (
        <AbsoluteFill
          style={{
            opacity: scene2Opacity,
            padding: 80,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "center",
            }}
          >
            <h2
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: 80,
                fontFamily: "Inter, sans-serif",
                textAlign: "center",
              }}
            >
              Comprehensive Imaging Services
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 50,
                maxWidth: 1600,
                margin: "0 auto",
              }}
            >
              <ServiceCard
                title="MRI & CT Scanning"
                description="Advanced imaging with subspecialist reporting"
                icon="🧠"
                color={vrgBlue}
                frame={frame - scene2Start}
                delay={0}
              />
              <ServiceCard
                title="Ultrasound"
                description="General and women's imaging services"
                icon="📊"
                color={vrgBlue}
                frame={frame - scene2Start}
                delay={20}
              />
              <ServiceCard
                title="X-Ray & Mammography"
                description="Digital imaging and breast screening"
                icon="⚕️"
                color={vrgBlue}
                frame={frame - scene2Start}
                delay={40}
              />
              <ServiceCard
                title="Interventional"
                description="Minimally invasive procedures"
                icon="🎯"
                color={vrgBlue}
                frame={frame - scene2Start}
                delay={60}
              />
              <ServiceCard
                title="EOS Imaging"
                description="Low-dose full body imaging"
                icon="🦴"
                color={vrgBlue}
                frame={frame - scene2Start}
                delay={80}
              />
              <ServiceCard
                title="Cardiac Imaging"
                description="CT calcium scoring & cardiac CT"
                icon="❤️"
                color={vrgBlue}
                frame={frame - scene2Start}
                delay={100}
              />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Scene 3: Key Differentiators */}
      {frame >= scene3Start && frame < scene3Start + scene3Duration && (
        <AbsoluteFill
          style={{
            opacity: scene3Opacity,
            padding: 80,
            backgroundColor: "#f8f9fa",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "center",
            }}
          >
            <h2
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: 80,
                fontFamily: "Inter, sans-serif",
                textAlign: "center",
              }}
            >
              Why Choose Vision Radiology?
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 60,
                maxWidth: 1600,
                margin: "0 auto",
              }}
            >
              <DifferentiatorCard
                icon={<MapPin size={70} color={vrgBlue} strokeWidth={2} />}
                title="24 Clinics"
                description="Across Melbourne & Regional Victoria"
                frame={frame - scene3Start}
                delay={0}
              />
              <DifferentiatorCard
                icon={<Award size={70} color={vrgBlue} strokeWidth={2} />}
                title="Locally Owned"
                description="Independent, not corporate"
                frame={frame - scene3Start}
                delay={15}
              />
              <DifferentiatorCard
                icon={<Clock size={70} color={vrgBlue} strokeWidth={2} />}
                title="Fast Turnaround"
                description="Reports within 48-72 hours"
                frame={frame - scene3Start}
                delay={30}
              />
            </div>

            <div
              style={{
                marginTop: 60,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "20px 50px",
                  backgroundColor: vrgBlue,
                  color: "white",
                  borderRadius: 50,
                  fontSize: 36,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  opacity: interpolate(
                    frame - scene3Start,
                    [60, 80],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  ),
                }}
              >
                ✓ Bulk Billing Available
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Scene 4: Call to Action */}
      {frame >= scene4Start && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: scene4Opacity,
            background: `linear-gradient(135deg, ${vrgBlue} 0%, #0891b2 100%)`,
          }}
        >
          <div
            style={{
              textAlign: "center",
              transform: `scale(${scene4Scale})`,
            }}
          >
            <h2
              style={{
                fontSize: 90,
                fontWeight: 700,
                color: "white",
                marginBottom: 40,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Book Your Appointment Today
            </h2>
            <p
              style={{
                fontSize: 44,
                color: "rgba(255,255,255,0.9)",
                marginBottom: 60,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Appointments within 48-72 hours
            </p>
            <div
              style={{
                display: "inline-block",
                padding: "28px 70px",
                background: "white",
                borderRadius: 20,
                fontSize: 42,
                fontWeight: 700,
                color: vrgBlue,
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
              }}
            >
              visionradiology.com.au
            </div>
            <div
              style={{
                marginTop: 50,
                fontSize: 32,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              📱 Download our mobile app today
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Service Card Component
interface ServiceCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  frame: number;
  delay: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
  icon,
  color,
  frame,
  delay,
}) => {
  const opacity = interpolate(
    frame,
    [delay, delay + 25],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    frame,
    [delay, delay + 35],
    [60, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        background: "white",
        borderRadius: 20,
        padding: 35,
        border: `3px solid ${color}20`,
        textAlign: "center",
        boxShadow: `0 10px 30px ${color}15`,
      }}
    >
      <div
        style={{
          fontSize: 60,
          marginBottom: 20,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#1a1a1a",
          marginBottom: 12,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 18,
          color: "#666",
          lineHeight: 1.5,
          fontFamily: "Inter, sans-serif",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
};

// Differentiator Card Component
interface DifferentiatorCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  frame: number;
  delay: number;
}

const DifferentiatorCard: React.FC<DifferentiatorCardProps> = ({
  icon,
  title,
  description,
  frame,
  delay,
}) => {
  const opacity = interpolate(
    frame,
    [delay, delay + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(
    frame,
    [delay, delay + 25],
    [0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        background: "white",
        borderRadius: 20,
        padding: 40,
        textAlign: "center",
        boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "#1a1a1a",
          marginBottom: 12,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 20,
          color: "#666",
          lineHeight: 1.5,
          fontFamily: "Inter, sans-serif",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
};
