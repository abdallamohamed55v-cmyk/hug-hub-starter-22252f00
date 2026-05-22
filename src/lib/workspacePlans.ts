export type WorkspacePaidPlan = "starter" | "pro" | "elite" | "business";

export interface WorkspacePlanOption {
  id: WorkspacePaidPlan | "free";
  name: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  tagline: string;
  perks: string[];
  creditsLabel?: string;
}

export const WORKSPACE_PRODUCT_MAP: Record<WorkspacePaidPlan, { monthly: string; yearly: string }> = {
  starter: {
    monthly: "c3483e63-7dbd-4214-bec2-894926f5590a",
    yearly: "729d9b3d-1acc-4d58-8a39-49ab63330674",
  },
  pro: {
    monthly: "8da537b0-7192-46cd-b38a-bbe341febdf7",
    yearly: "bcbd0c61-a5bd-4934-872a-7413324a330c",
  },
  elite: {
    monthly: "d212d1e6-4958-4329-a1f4-5b460886fc9d",
    yearly: "0b8f0aa3-57a7-4dd5-9ab3-ce68cebec7f6",
  },
  business: {
    monthly: "1fb17ce3-5bb4-473e-8c67-e50a8ce927dd",
    yearly: "39752b51-d4cd-4a03-9718-bb2b95f71084",
  },
};

export const WORKSPACE_PLANS: WorkspacePlanOption[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    tagline: "مساحة مشتركة أساسية للبدء",
    creditsLabel: "بدون اشتراك",
    perks: ["3 أعضاء", "مهام أساسية", "استخدام شخصي أو فريق صغير"],
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 10,
    yearlyPrice: 99,
    tagline: "مطابقة لباقة الدفع Starter",
    creditsLabel: "80 MC / month",
    perks: ["All chat models", "50 images / month", "10 code builds / month"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 29,
    yearlyPrice: 249,
    tagline: "مطابقة لباقة الدفع Pro",
    creditsLabel: "280 MC / month",
    perks: ["All AI models", "200 images / month", "40 code builds / month"],
  },
  {
    id: "elite",
    name: "Elite",
    monthlyPrice: 49,
    yearlyPrice: 499,
    tagline: "مطابقة لباقة الدفع Elite",
    creditsLabel: "480 MC / month",
    perks: ["Priority speed", "500 images / month", "80 code builds / month"],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 149,
    yearlyPrice: 1299,
    tagline: "مطابقة لباقة الدفع Business",
    creditsLabel: "1,480 MC / month",
    perks: ["Dedicated infrastructure", "SLA guarantees", "Dedicated account manager"],
  },
];

export function isWorkspacePaidPlan(plan: string | null | undefined): plan is WorkspacePaidPlan {
  return plan === "starter" || plan === "pro" || plan === "elite" || plan === "business";
}