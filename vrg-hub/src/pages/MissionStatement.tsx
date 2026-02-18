import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Target, Heart, Lightbulb, Users, Shield, Sparkles } from "lucide-react";

const values = [
  { icon: Sparkles, label: "Excellence", description: "We strive for excellence in everything we do" },
  { icon: Heart, label: "Compassion", description: "We treat every patient with care and respect" },
  { icon: Shield, label: "Integrity", description: "We act with honesty and transparency" },
  { icon: Lightbulb, label: "Innovation", description: "We embrace new technologies and continuous improvement" },
  { icon: Users, label: "Collaboration", description: "We work together as a team with our colleagues and partners" },
];

const missionPoints = [
  "Delivering high-quality diagnostic imaging services",
  "Maintaining state-of-the-art technology and equipment",
  "Employing highly skilled and compassionate staff",
  "Ensuring timely and accurate reporting",
  "Working collaboratively with referring clinicians",
  "Continuous improvement and innovation in our services",
];

export default function MissionStatement() {
  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Our Vision & Mission"
        description="Committed to excellence in diagnostic imaging"
      />

      <div className="space-y-8">
        {/* Vision Section */}
        <section className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 shrink-0">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-3">Our Vision</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To be recognised as the leading provider of quality diagnostic imaging services in Australia.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="rounded-xl bg-card border p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-6">
            To provide exceptional patient care through:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {missionPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg bg-muted/50 p-4"
              >
                <div className="rounded-full bg-primary/10 h-6 w-6 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">{index + 1}</span>
                </div>
                <span className="text-sm">{point}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Values Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Our Values</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => (
              <div
                key={value.label}
                className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                    <value.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{value.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
