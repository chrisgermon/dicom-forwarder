import { Scan, Activity, Heart, Brain, Microscope, Bone } from "lucide-react";

const modalities = [
  { name: "General X-Ray", icon: Scan, href: "#" },
  { name: "CT", icon: Activity, href: "#" },
  { name: "Ultrasound", icon: Heart, href: "#" },
  { name: "MRI", icon: Brain, href: "#" },
  { name: "Mammography", icon: Microscope, href: "#" },
  { name: "EOS", icon: Bone, href: "#" },
];

export function ModalityCardsRow() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {modalities.map((modality) => (
        <a
          key={modality.name}
          href={modality.href}
          className="group flex flex-col items-center justify-center p-6 bg-card rounded-xl border border-border/50 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-200"
        >
          <div className="p-3 rounded-full bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
            <modality.icon className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-foreground text-center">
            {modality.name}
          </span>
        </a>
      ))}
    </div>
  );
}
