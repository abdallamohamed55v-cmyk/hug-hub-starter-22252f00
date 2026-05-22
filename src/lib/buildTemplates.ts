export interface BuildTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  prompt: string;
  thumbnail_url?: string | null;
  preview_url?: string | null;
}

export const BUILD_TEMPLATES: BuildTemplate[] = [
  {
    id: "landing",
    name: "صفحه هبوط لمنتج",
    description: "Hero + مميزات + أسعار + CTA",
    emoji: "🚀",
    prompt: "اعمل صفحه هبوط احترافيه (Landing Page) لمنتج SaaS عصري. تحتوي على: Hero بعنوان كبير وزر CTA، قسم مميزات بـ 3 cards، قسم كيف يعمل بـ 3 خطوات، قسم أسعار بـ 3 خطط، قسم FAQ، Footer بسيط. التصميم داكن أنيق مع تدرجات بنفسجي/أزرق ورسوميات حديثه.",
  },
  {
    id: "portfolio",
    name: "بورتفوليو شخصي",
    description: "صفحه واحده لمصمم/مطور",
    emoji: "🎨",
    prompt: "اعمل بورتفوليو شخصي صفحه واحده لمصمم جرافيك. يحتوي على: Hero فيه اسمي وصورتي، قسم About مع المهارات، معرض أعمال (Grid من 6 صور)، قسم Testimonials، نموذج تواصل، روابط social. تصميم مينيمال أبيض مع تايبوغرافي أنيقه.",
  },
  {
    id: "blog",
    name: "مدونه شخصيه",
    description: "صفحه قائمه مقالات بتصميم نظيف",
    emoji: "📝",
    prompt: "اعمل مدونه شخصيه نظيفه. تحتوي على: Header مع التنقل، قسم Featured Article كبير، grid من 6 مقالات بصور وتاريخ ووقت قراءه، Sidebar بالكاتيجوريز والوسوم، Footer بسيط. خطوط Serif أنيقه على خلفيه بيضاء.",
  },
  {
    id: "ecommerce",
    name: "متجر إلكتروني",
    description: "صفحه عرض منتجات مع سله",
    emoji: "🛍",
    prompt: "اعمل صفحه متجر إلكتروني لمنتجات يدويه. تحتوي على: Header مع لوجو وأيقونه سله، Hero بمنتج مميز، grid من 8 منتجات بصور وأسعار وزر Add to Cart، فلاتر جانبيه (سعر/كاتيجوري)، Footer مع وسائل الدفع. ألوان دافئه (بيج/برتقالي).",
  },
  {
    id: "restaurant",
    name: "موقع مطعم",
    description: "قائمه طعام + حجز طاولات",
    emoji: "🍽",
    prompt: "اعمل موقع لمطعم إيطالي. يحتوي على: Hero بصوره طبق شهي، قسم About، قائمه طعام مقسمه (مقبلات/أطباق رئيسيه/حلويات) بصور وأسعار، قسم حجز طاوله بنموذج، خريطه الموقع وأوقات العمل، gallery للمطعم. ألوان دافئه (أحمر/كريمي/ذهبي).",
  },
  {
    id: "agency",
    name: "موقع وكاله",
    description: "صفحه شركه خدمات احترافيه",
    emoji: "🏢",
    prompt: "اعمل موقع لوكاله تسويق رقمي. يحتوي على: Hero بحركه أنيقه، قسم خدمات بـ 6 cards، شعارات العملاء (logos marquee)، قسم case studies (3 مشاريع)، قسم الفريق، نموذج تواصل، Footer شامل. تصميم احترافي داكن مع لمسات نيون.",
  },
  {
    id: "saas-dashboard",
    name: "لوحه تحكم SaaS",
    description: "Dashboard analytics بتصميم حديث",
    emoji: "📊",
    prompt: "اعمل لوحه تحكم analytics لتطبيق SaaS. تحتوي على: Sidebar تنقل، Header بحث وإشعارات، 4 stat cards علويه، رسم بياني خطي كبير (استخدم SVG)، جدول بآخر المعاملات، قسم top customers. تصميم نظيف بـ Tailwind، يدعم Dark mode.",
  },
  {
    id: "event",
    name: "صفحه حدث/مؤتمر",
    description: "Landing لإيفنت مع جدول وحجز",
    emoji: "🎤",
    prompt: "اعمل صفحه لمؤتمر تقني. تحتوي على: Hero بتاريخ المؤتمر وزر تسجيل، Countdown timer، قسم المتحدثين (6 بطاقات بصور)، جدول الجلسات، الرعاه، أسعار التذاكر، خريطه المكان. تصميم جريء بتدرجات نابضه.",
  },
];
