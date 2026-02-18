import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Brain, Zap, Award } from "lucide-react";

export interface MRIPromoProps {
  titleText: string;
  subtitleText: string;
}

export const MRIPromoVideo: React.FC<MRIPromoProps> = ({
  titleText,
  subtitleText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timing
  const scene1Duration = fps * 3; // 3 seconds
  const scene2Duration = fps * 8; // 8 seconds

  // Scene 1: Opening with logo and title (0-3s)
  const scene1Opacity = interpolate(
    frame,
    [0, 20, scene1Duration - 20, scene1Duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scene1Scale = interpolate(
    frame,
    [0, 30],
    [0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 2: Features showcase (3-11s)
  const scene2Start = scene1Duration;
  const scene2Opacity = interpolate(
    frame,
    [scene2Start, scene2Start + 20, scene2Start + scene2Duration - 20, scene2Start + scene2Duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 3: Call to action (11-15s)
  const scene3Start = scene1Duration + scene2Duration;
  const scene3Opacity = interpolate(
    frame,
    [scene3Start, scene3Start + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scene3Scale = interpolate(
    frame,
    [scene3Start, scene3Start + 30],
    [0.9, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Pulse animation for icons
  const pulse = Math.sin((frame / fps) * Math.PI * 2) * 0.1 + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Background gradient overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
        }}
      />

      {/* Scene 1: Opening */}
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
            }}
          >
            {/* Brain Icon */}
            <div
              style={{
                marginBottom: 40,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  borderRadius: "50%",
                  padding: 40,
                  transform: `scale(${pulse})`,
                }}
              >
                <Brain size={120} color="white" strokeWidth={1.5} />
              </div>
            </div>

            <h1
              style={{
                fontSize: 96,
                fontWeight: 700,
                color: "white",
                margin: 0,
                marginBottom: 20,
                fontFamily: "Inter, sans-serif",
                letterSpacing: "-2px",
              }}
            >
              {titleText}
            </h1>
            <p
              style={{
                fontSize: 36,
                color: "#94a3b8",
                margin: 0,
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
              }}
            >
              {subtitleText}
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* Scene 2: Features */}
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
                fontSize: 72,
                fontWeight: 700,
                color: "white",
                marginBottom: 80,
                fontFamily: "Inter, sans-serif",
                textAlign: "center",
              }}
            >
              Why Choose Our MRI Services?
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
              {/* Feature 1 */}
              <FeatureCard
                icon={<Zap size={64} color="#3b82f6" strokeWidth={2} />}
                title="Fast Results"
                description="Same-day reporting by expert radiologists"
                frame={frame - scene2Start}
                delay={0}
              />

              {/* Feature 2 */}
              <FeatureCard
                icon={<Brain size={64} color="#6366f1" strokeWidth={2} />}
                title="Advanced Technology"
                description="3T MRI scanner with exceptional image quality"
                frame={frame - scene2Start}
                delay={15}
              />

              {/* Feature 3 */}
              <FeatureCard
                icon={<Award size={64} color="#8b5cf6" strokeWidth={2} />}
                title="Expert Radiologists"
                description="Subspecialist reporting for accurate diagnosis"
                frame={frame - scene2Start}
                delay={30}
              />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Scene 3: Call to Action */}
      {frame >= scene3Start && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: scene3Opacity,
          }}
        >
          <div
            style={{
              textAlign: "center",
              transform: `scale(${scene3Scale})`,
            }}
          >
            <h2
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: "white",
                marginBottom: 40,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Book Your MRI Today
            </h2>
            <p
              style={{
                fontSize: 48,
                color: "#94a3b8",
                marginBottom: 60,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Vision Radiology Group
            </p>
            <div
              style={{
                display: "inline-block",
                padding: "24px 60px",
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                borderRadius: 16,
                fontSize: 36,
                fontWeight: 600,
                color: "white",
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)",
              }}
            >
              www.visionradiology.com.au
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  frame: number;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
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

  const translateY = interpolate(
    frame,
    [delay, delay + 30],
    [50, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: 24,
        padding: 40,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        textAlign: "center",
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
          fontWeight: 600,
          color: "white",
          marginBottom: 16,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 20,
          color: "#94a3b8",
          lineHeight: 1.6,
          fontFamily: "Inter, sans-serif",
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
};
