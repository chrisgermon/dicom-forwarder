import { 
  Stethoscope, 
  Heart, 
  Brain, 
  Bone, 
  Eye, 
  Baby,
  Pill,
  Syringe,
  Activity,
  Scissors,
  Sparkles,
  Ear,
  Smile,
  Microscope,
  PersonStanding,
  Shield,
  Wind,
  Dna,
  Ribbon,
  LucideIcon,
  UserRound,
  Hand,
  Footprints
} from "lucide-react";

// Map specialities to icons based on keywords
const specialityIconMap: { keywords: string[]; icon: LucideIcon; color: string }[] = [
  { keywords: ["cardiology", "heart", "cardiac"], icon: Heart, color: "text-red-500" },
  { keywords: ["neurology", "neurosurgeon", "brain", "neuro"], icon: Brain, color: "text-purple-500" },
  { keywords: ["orthop", "bone", "musculoskeletal", "spine"], icon: Bone, color: "text-orange-500" },
  { keywords: ["ophthalmology", "eye", "vision", "optom"], icon: Eye, color: "text-blue-500" },
  { keywords: ["paediatric", "pediatric", "child"], icon: Baby, color: "text-pink-500" },
  { keywords: ["oncology", "cancer", "tumour", "tumor"], icon: Ribbon, color: "text-violet-500" },
  { keywords: ["psychiatry", "psychology", "mental"], icon: Brain, color: "text-indigo-500" },
  { keywords: ["surgery", "surgeon"], icon: Scissors, color: "text-slate-600" },
  { keywords: ["anaesth", "anesth"], icon: Syringe, color: "text-teal-500" },
  { keywords: ["dermatology", "skin", "plastic"], icon: Sparkles, color: "text-amber-500" },
  { keywords: ["ent", "otolaryngology", "ear", "nose", "throat"], icon: Ear, color: "text-cyan-500" },
  { keywords: ["dentist", "dental", "oral", "orthodontic"], icon: Smile, color: "text-sky-500" },
  { keywords: ["pathology", "laboratory", "haematology"], icon: Microscope, color: "text-emerald-600" },
  { keywords: ["radiology", "imaging", "mri", "ct", "x-ray", "ultrasound"], icon: Activity, color: "text-blue-600" },
  { keywords: ["respiratory", "thoracic", "lung", "pulmon"], icon: Wind, color: "text-cyan-600" },
  { keywords: ["endocrin", "diabetes", "thyroid", "hormone"], icon: Dna, color: "text-green-600" },
  { keywords: ["gastro", "hepat", "liver", "stomach", "bowel"], icon: Pill, color: "text-yellow-600" },
  { keywords: ["rheumatology", "arthritis", "autoimmune", "immunology", "allergy"], icon: Shield, color: "text-rose-500" },
  { keywords: ["physio", "rehabilitation", "rehab"], icon: PersonStanding, color: "text-green-500" },
  { keywords: ["urology", "kidney", "renal", "nephrology"], icon: Activity, color: "text-amber-600" },
  { keywords: ["obstetric", "gynaecology", "gynecology", "fertility", "midwif"], icon: Baby, color: "text-pink-600" },
  { keywords: ["podiatry", "foot", "feet"], icon: Footprints, color: "text-stone-500" },
  { keywords: ["chiropractic", "chiropractor", "osteo"], icon: Bone, color: "text-orange-600" },
  { keywords: ["hand", "occupational"], icon: Hand, color: "text-slate-500" },
  { keywords: ["sport", "exercise"], icon: Activity, color: "text-green-500" },
  { keywords: ["geriatric", "aged", "elderly"], icon: UserRound, color: "text-gray-500" },
];

// Default icon for general practitioners and unknown specialities
const defaultIcon = { icon: Stethoscope, color: "text-primary" };
const gpIcon = { icon: Stethoscope, color: "text-emerald-500" };

export function getSpecialityIcon(speciality: string | null | undefined): { icon: LucideIcon; color: string } {
  if (!speciality) return defaultIcon;
  
  const lowerSpeciality = speciality.toLowerCase();
  
  // Check for GP first (common case)
  if (lowerSpeciality.includes("general practitioner") || lowerSpeciality === "gp") {
    return gpIcon;
  }
  
  // Find matching speciality
  for (const mapping of specialityIconMap) {
    if (mapping.keywords.some(keyword => lowerSpeciality.includes(keyword))) {
      return { icon: mapping.icon, color: mapping.color };
    }
  }
  
  return defaultIcon;
}

// Get primary speciality from comma-separated list
export function getPrimarySpeciality(specialities: string | null | undefined): string | null {
  if (!specialities) return null;
  const parts = specialities.split(",").map(s => s.trim());
  return parts[0] || null;
}
