import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'AR';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  AR: {
    'nav.collections': 'مجموعاتنا',
    'nav.fabric': 'تقنية النسيج',
    'nav.story': 'قصتنا',
    'nav.shop': 'تسوق الآن',
    'nav.search': 'بحث...',
    
    'hero.tag': 'الجيل القادم من الملابس الطبية',
    'hero.title1': 'أزياء طبية فاخرة',
    'hero.title2': 'لأبطال الصحة',
    'hero.title3': '',
    'hero.desc': 'اختبر راحة القماش المرن المقاوم للسوائل والبكتيريا، المصمم خصيصاً ليواكب وتيرة يومك الطبي المتسارع',
    'hero.btn.explore': 'منتجاتنا',
    'hero.btn.story': 'قصتنا',
    'hero.feature1.title': 'تمدد في 4 اتجاهات',
    'hero.feature1.desc': 'مرونة ديناميكية',
    'hero.feature2.title': 'قماش مريح',
    'hero.feature2.desc': 'نعومة ومرونة استثنائية',

    'grid.tag': 'المجموعات المميزة',
    'grid.title': 'صنعت بدقة.',
    'grid.viewAll': 'عرض جميع المنتجات',
    'grid.buy': 'شراء الآن',
    'grid.specs': 'المواصفات',
    'grid.sizeGuide': 'دليل المقاسات',
    
    'sizeGuide.title': 'دليل المقاسات والملاءمة',
    'sizeGuide.size': 'المقاس',
    'sizeGuide.chest': 'الصدر (سم)',
    'sizeGuide.waist': 'الخصر (سم)',
    'sizeGuide.hips': 'الورك (سم)',

    'faq.tag': 'الدعم',
    'faq.title': 'الأسئلة الشائعة',
    'faq.q1': 'ما الذي يميز نسيج Liquid Glass الخاص بكم؟',
    'faq.a1': 'يتميز نسيج Liquid Glass الحصري لدينا بطلاء كاره للماء على مستوى الجزيئات، حيث يطرد السوائل على الفور مع الحفاظ على تهوية لا مثيل لها وملمس فائق النعومة على البشرة.',
    'faq.q2': 'كيف أعتني بملابس جوامديك؟',
    'faq.a2': 'تغسل في الغسالة بماء بارد مقلوبة من الداخل للخارج مع ألوان مماثلة. تجفف على درجة حرارة منخفضة. تجنب المبيضات ومنعمات الأقمشة للحفاظ على خصائص مقاومة السوائل.',
    'faq.q3': 'ما هي سياسة الإرجاع الخاصة بكم؟',
    'faq.a3': 'نقدم سياسة إرجاع خلال 30 يومًا للمنتجات غير الملبوسة وغير المغسولة في عبوتها الأصلية. نحن نؤمن بمنتجاتنا ونسعى لرضاكم التام.',
    'faq.q4': 'هل تقدمون خدمة الطلب بالجملة للمستشفيات؟',
    'faq.a4': 'نعم، نقدم تسعيرًا خاصًا وخيارات تطريز مخصصة للطلبات بالجملة. يرجى التواصل مع فريق مبيعات الشركات لمزيد من التفاصيل.',

    'cart.title': 'عربة التسوق',
    'cart.empty': 'عربة التسوق فارغة',
    'cart.total': 'المجموع',
    'cart.checkout': 'الدفع',
    'cart.remove': 'إزالة',
    
    'fabric.tag': 'نسيج حصري',
    'fabric.title': 'خاماتٌ نسيجية مختارة بعناية.',
    'fabric.desc': 'أمضينا ثلاث سنوات في اختيار نسيج يغير قواعد الملابس الطبية. يطرد السوائل، ويتمدد بشكل مريح، ويحافظ على شكله الأصلي بعد كل غسلة.',
    'fabric.btn': 'أطلبها الآن',
    'fabric.f1.title': 'تهوية فائقة',
    'fabric.f1.desc': 'خيوط هيكلية مثقبة دقيقًا تسمح بتدفق هواء مستمر، للحفاظ على درجة حرارة الجسم المثالية خلال دوريات العمل لمدة 12 ساعة.',
    'fabric.f1.benefit': 'يبقيك منتعشًا في المناوبات الطويلة',
    'fabric.f2.title': 'مريح وسهل الكي ',
    'fabric.f2.desc': 'نسيج متطور مقاوم للتجاعيد يمنح مظهرًا مرتبًا طوال اليوم ومصمم ليسهل كيه وتوفير وقتك متمتعًا بأناقة دائمية.',
    'fabric.f2.benefit': 'مظهر أنيق ومقاوم للتجاعيد',
    'fabric.f3.title': 'خامة قماش عالية الجودة',
    'fabric.f3.desc': 'عملية التنظيف الخاصة بنا تخلق نسيجًا سطحيًا ينزلق على البشرة بدون احتكاك أو تكور.',
    'fabric.f3.benefit': 'بدون احتكاك بالبشرة أبداً',
    
    'test.tag': 'محل ثقة المحترفين',
    'test.title': 'أصوات التميز.',
    
    'foot.desc': 'الارتقاء بتجربة محترفي الرعاية الصحية من خلال جودة لا تضاهى، هندسة نسيج متقدمة، وتصميم أنيق خالد.',
    'foot.shop': 'تسوق',
    'foot.company': 'الشركة',
    'foot.newsletter.title': 'كن على اِطلاع',
    'foot.newsletter.desc': 'اشترك للحصول على وصول مبكر للمجموعات الجديدة ورؤى حصرية في الرعاية الصحية.',
    'foot.newsletter.placeholder': 'البريد الإلكتروني',
    'foot.rights': 'أزياء جوامديك الراقية. جميع الحقوق محفوظة.',
    'foot.privacy': 'سياسة الخصوصية',
    'foot.terms': 'شروط الخدمة',
    'foot.orderStatus': 'حالة الطلب',

    'orderStatus.title': 'تتبع طلبك',
    'orderStatus.desc': 'أدخل رقم طلبك لعرض تحديثات الشحن المباشرة.',
    'orderStatus.input': 'رقم الطلب (مثل JM-12345)',
    'orderStatus.btn': 'تتبع الشحنة',
    'orderStatus.loading': 'جاري البحث عن شحنتك...',
    'orderStatus.found': 'تم العثور على الطلب',
    'orderStatus.shipped': 'في الطريق',
    'orderStatus.delivered': 'تم التوصيل',
    'orderStatus.processing': 'قيد المعالجة',
    'orderStatus.status': 'الحالة',
    'orderStatus.eta': 'موعد التسليم المتوقع',
    'orderStatus.carrier': 'شركة الشحن',
    'orderStatus.items': 'العناصر',
    'orderStatus.close': 'إغلاق',
    'orderStatus.pastOrders': 'الطلبات السابقة',
    'orderStatus.trackingTimeline': 'الجدول الزمني للتتبع',
    'orderStatus.itemsOrdered': 'العناصر المطلوبة',
    'orderStatus.exportPdf': 'تصدير كملف PDF',
    'invoice.title': 'فاتورة الطلب',

    'story.tag': 'تراثنا',
    'story.title': 'صُنع بعناية.',
    'story.desc1': 'بدأت جوامديك بملاحظة بسيطة: يتحمل محترفو الرعاية الصحية أقسى الظروف البدنية، في حين ظلت أزياؤهم عالقة في الماضي. قاسية، غير مرنة، ومعرضة للبقع باستمرار.',
    'story.desc2': 'تعاونا مع أكثر من 500 من الممرضين والجراحين والفنيين لإعادة تصميم الزي الطبي الحديث من الجزيئات إلى الأعلى. النتيجة هي لباس يعمل بجد كما تفعل أنت.',

    'checkout.title': 'دفع آمن',
    'checkout.shipping': 'معلومات الشحن',
    'checkout.payment': 'طريقة الدفع',
    'checkout.placeOrder': 'تأكيد الطلب',
    'checkout.processing': 'جاري معالجة الطلب...',
    'checkout.success': 'تم تأكيد الطلب!',
    'checkout.successDesc': 'شكراً لشرائك. رقم طلبك هو ',
    'checkout.continueShopping': 'متابعة التسوق',
    'checkout.name': 'الاسم الكامل',
    'checkout.email': 'البريد الإلكتروني',
    'checkout.phone': 'رقم الهاتف',
    'checkout.address': 'عنوان الشحن',
    'checkout.wilaya': 'الولاية',
    'checkout.city': 'البلدية',
    'checkout.cod': 'الدفع عند الاستلام',
    'checkout.codDesc': 'ادفع نقدًا عند استلام طلبك.',
    
    'personalize.title': 'تخصيص زيك الطبي',
    'personalize.add': 'إضافة تطريز (+370 DA)',
    'personalize.text': 'نص التطريز (مثل الاسم أو اللقب)',
    'personalize.color': 'لون الخيط',
    'personalize.placement': 'المكان',
    'personalize.color.gold': 'ذهبي',
    'personalize.color.white': 'أبيض',
    'personalize.color.navy': 'كحلي',
    'personalize.placement.left': 'الصدر الأيسر',
    'personalize.placement.right': 'الصدر الأيمن',

    'contact.tag': 'تواصل معنا',
    'contact.title': 'اتصل بنا',
    'contact.desc': 'هل لديك سؤال حول منتجاتنا أو المقاسات أو طلب حالي؟ نحن هنا للمساعدة.',
    'contact.name': 'الاسم',
    'contact.email': 'البريد الإلكتروني',
    'contact.subject': 'الموضوع',
    'contact.message': 'الرسالة',
    'contact.send': 'إرسال الرسالة',
    'contact.success': 'تم إرسال رسالتك بنجاح.',
    
    'product.1.name': 'توب كوانتوم الطبي',
    'product.1.category': 'ملابس طبية للرجال',
    'product.1.color': 'زمردي داكن',
    'product.1.desc': 'مصمم لأقصى قدر من الحركة والتحمل. يتميز بتصميم يحتوي على 3 جيوب، وحلقة مخفية لشارة العمل.',
    'product.1.spec.0': 'تمدد في 4 اتجاهات',
    'product.1.spec.1': 'نسيج مقاوم للسوائل',
    'product.1.spec.2': 'مضاد للميكروبات',
    'product.1.spec.3': 'ممتص للرطوبة',
    
    'product.2.name': 'معطف المختبر أورا',
    'product.2.category': 'معاطف مختبر نسائية',
    'product.2.color': 'أبيض ناصع',
    'product.2.desc': 'معطف المختبر العصري بمفهوم جديد. مصمم بمقاس مثالي ليوفر لك شكلاً أنيقاً دون المساومة على الأناقة العملية ومقاومة السوائل.',
    'product.2.spec.0': 'طارد للبقع',
    'product.2.spec.1': 'مقاوم للتجعد',
    'product.2.spec.2': 'مقاس مخصص',
    'product.2.spec.3': 'جيوب داخلية مخفية',
    
    'product.3.name': 'بنطال فيلوسيتي الطبي',
    'product.3.category': 'ملابس طبية للنساء',
    'product.3.color': 'كحلي ملكي',
    'product.3.desc': 'جربي التوازن المثالي بين الأداء الرياضي والتصميم الاحترافي. راحة غير مسبوقة للمناوبات التي تتجاوز 12 ساعة.',
    'product.3.spec.0': 'حزام خصر مريح',
    'product.3.spec.1': 'تصميم بـ 7 جيوب',
    'product.3.spec.2': 'قصة مدببة',
    'product.3.spec.3': 'ملمس كالحرير السائل',
    
    'product.4.name': 'توب الراحة نوفا',
    'product.4.category': 'ملابس طبية للجنسين',
    'product.4.color': 'رمادي صخري',
    'product.4.desc': 'أكثر المقاسات مرونة وتكيفاً. مصمم ليوفر مظهراً احترافياً مع أقصى درجات التهوية وحرية الحركة المطلقة.',
    'product.4.spec.0': 'تهوية فائقة',
    'product.4.spec.1': 'تصميم ياقة V',
    'product.4.spec.2': 'مقاوم للبهتان',
    'product.4.spec.3': 'ألوان صديقة للبيئة',

    'test.1.name': 'د. سارة جينكينز',
    'test.1.role': 'رئيسة قسم الجراحة',
    'test.1.quote': 'لقد ارتديت العشرات من العلامات التجارية خلال مسيرتي المهنية التي استمرت 15 عاماً. نسيج Liquid Glass من جوامديك هو الوحيد الذي أشعر به في الساعة 14 كما شعرت به في الساعة 1. راحة وحرية حركة ثورية بكل معنى الكلمة.',
    
    'test.2.name': 'مايكل توريس',
    'test.2.role': 'ممرض طوارئ',
    'test.2.quote': 'مقاومة السوائل لا يمكن الاستهانة بها. لقد تعرضت لانسكابات لا حصر لها في قسم الطوارئ، وهذه الملابس تطردها ببساطة. بالإضافة إلى ذلك، فهي تبدو أنيقة للغاية، ودائماً ما يُطرح عليّ سؤال عن مكان اقتنائها.',
    
    'test.3.name': 'د. إيميلي تشين',
    'test.3.role': 'طبيبة أطفال',
    'test.3.quote': 'أخيراً، ملابس طبية لا تشعرك بأنك تساوم على شيء. التمدد استثنائي، والتصميم أنيق، وتخرج من الغسيل لتبدو وكأنها نقية في كل مرة.',
    
    'test.4.name': 'جيمس ويلسون',
    'test.4.role': 'جراح أسنان',
    'test.4.quote': 'الاهتمام بالتفاصيل مذهل. من المقاس المخصص إلى الجيوب المخفية المثالية في أماكنها، فكرت جوامديك في كل شيء. تستحق كل بنس لجودتها المتميزة.',
    
    'auth.registry.title': 'سجل جوامديك',
    'auth.registry.desc': 'الوصول إلى الشهادات، والتحقق من إشعارات إرسال الهاتف، وإدارة طلبات الملابس الطبية الفاخرة.',
    'auth.signin': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'auth.fullname': 'الاسم الكامل',
    'auth.fullname.placeholder': 'الاسم الكامل',
    'auth.phone': 'بيانات الهاتف',
    'auth.phone.desc': 'سيتم إرسال رمز تحقق افتراضي على الفور.',
    'auth.email': 'البريد الإلكتروني المسجل',
    'auth.email.placeholder': 'doctor@joamedic.com',
    'auth.password': 'كلمة المرور الأمنية',
    'auth.btn.signin': 'الدخول إلى سجل جواميديك',
    'auth.btn.signup': 'إنشاء حساب جديد',
    'auth.alternative': 'بوابة بديلة',
    'auth.google': 'المتابعة باستخدام Google',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('AR');

  useEffect(() => {
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
    document.documentElement.lang = language.toLowerCase();
  }, [language]);

  const toggleLanguage = () => {
    // Locked on Arabic as requested by user
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
