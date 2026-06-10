'use client'

import {
  BarChart3,
  BookOpen,
  Package,
  ShoppingCart,
  Landmark,
  TrendingUp,
  ArrowLeft,
  Sparkles,
  Shield,
  Zap,
  Calculator,
  Truck,
  HandCoins,
  Settings,
  Users,
  Building2,
  CheckCircle,
  Globe,
  ChevronLeft,
  ArrowRight,
  LayoutDashboard,
  GitBranch,
  ClipboardList,
  FileText,
  Receipt,
  Undo2,
  Warehouse,
  Tags,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-[#050510]"
      style={{ fontFamily: "var(--font-thmanyah-sans)" }}
    >
      {/* ── Navbar ── */}
      <nav id="main-header" className="fixed top-0 inset-x-0 z-50 bg-transparent transition-all duration-300 py-4 lg:py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-thmanyah-serif)" }}>كنترول</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors">المميزات</a>
            <a href="#modules" className="text-sm text-slate-300 hover:text-white transition-colors">الوحدات</a>
            <a href="#stats" className="text-sm text-slate-300 hover:text-white transition-colors">الإحصائيات</a>
            <a href="#why" className="text-sm text-slate-300 hover:text-white transition-colors">ليه كنترول؟</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/sign-in">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 font-medium">
                تسجيل الدخول
              </Button>
            </a>
            <a href="/sign-up">
              <Button className="bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] hover:from-[#8B5CF6] hover:to-[#FBBF24] text-white font-bold px-5 rounded-xl transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                ابدأ الآن
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#7C3AED]/8 rounded-full blur-[120px]"
            style={{ animation: 'pulse-glow 6s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#F59E0B]/5 rounded-full blur-[100px]"
            style={{ animation: 'pulse-glow 8s ease-in-out infinite 2s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7C3AED]/4 rounded-full blur-[150px]"
            style={{ animation: 'pulse-glow 10s ease-in-out infinite 4s' }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Central rotating element */}
          <div className="flex justify-center mb-10" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
            <div className="relative">
              <div
                className="h-24 w-24 rounded-full border-2 border-[#7C3AED]/30 flex items-center justify-center"
                style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}
              >
                <div className="h-16 w-16 bg-gradient-to-br from-[#7C3AED]/20 to-[#F59E0B]/20 rounded-full flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-[#A78BFA]" />
                </div>
              </div>
              {/* Rotating ring */}
              <div
                className="absolute -inset-4 rounded-full border border-dashed border-[#7C3AED]/20"
                style={{ animation: 'rotate-slow 20s linear infinite' }}
              />
              {/* Outer rotating ring */}
              <div
                className="absolute -inset-8 rounded-full border border-dashed border-[#F59E0B]/10"
                style={{ animation: 'rotate-slow 30s linear infinite reverse' }}
              />
            </div>
          </div>

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-8"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
          >
            <Zap className="h-4 w-4 text-[#A78BFA]" />
            <span className="text-sm text-[#A78BFA] font-medium">الحل العربي الأول لإدارة الأعمال</span>
          </div>

          {/* Main Heading */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
            style={{
              fontFamily: "var(--font-thmanyah-serif)",
              animation: 'fadeInUp 0.6s ease-out 0.2s both',
            }}
          >
            نظامك المتكامل لإدارة
            <br />
            <span className="bg-gradient-to-l from-[#A78BFA] to-[#F59E0B] bg-clip-text text-transparent">أعمالك من أول الطلب</span>
            <br />
            للتسليم النهائي
          </h1>

          {/* Subheading */}
          <p
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
          >
            تابع، تحكّم، ونفّذ كل خطوة في شغلك من مكان واحد
            <br className="hidden sm:block" />
            محاسبة، مخازن، مبيعات، مشتريات، واستثمارات — من غير لخبطة ولا أنظمة متفرقة
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
          >
            <a href="/sign-up">
              <Button
                size="lg"
                className="bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] hover:from-[#8B5CF6] hover:to-[#FBBF24] text-white font-bold text-lg px-10 h-14 rounded-xl shadow-[0_0_30px_rgba(124,58,237,0.25)] transition-all hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:scale-[1.02]"
              >
                ابدأ الآن مجاناً
                <ArrowLeft className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
              </Button>
            </a>
            <a href="#features">
              <Button
                variant="outline"
                size="lg"
                className="border-white/10 text-slate-300 hover:text-white hover:border-[#7C3AED]/30 hover:bg-[#7C3AED]/5 font-medium text-lg px-8 h-14 rounded-xl bg-transparent transition-all"
              >
                تعرف على المزيد
              </Button>
            </a>
          </div>

          {/* Feature pills floating around */}
          <div className="hidden lg:block" style={{ animation: 'fadeIn 1s ease-out 1s both' }}>
            <div className="absolute top-1/3 -right-4 flex flex-col gap-3">
              {['محاسبة مزدوجة', 'إدارة مخازن', 'مبيعات ومشتريات'].map((label, i) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-sm text-slate-300"
                  style={{ animation: `slide-in-right 0.5s ease-out ${1.2 + i * 0.2}s both` }}
                >
                  <div className="h-2 w-2 rounded-full bg-[#A78BFA]" />
                  {label}
                </div>
              ))}
            </div>
            <div className="absolute top-1/3 -left-4 flex flex-col gap-3">
              {['تقارير مالية', 'إدارة استثمارات', 'صلاحيات مرنة'].map((label, i) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-sm text-slate-300"
                  style={{ animation: `slide-in-left 0.5s ease-out ${1.2 + i * 0.2}s both` }}
                >
                  <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: 'fadeIn 1s ease-out 1.5s both' }}>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-[#A78BFA] rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section id="stats" className="py-8 border-y border-white/5 bg-[#0a0a14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center"
                style={{ animation: `counter 0.5s ease-out ${index * 0.1}s both` }}
              >
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-l from-[#A78BFA] to-[#F59E0B] bg-clip-text text-transparent mb-1" style={{ fontFamily: "var(--font-thmanyah-serif)" }}>
                  {stat.value}
                </div>
                <div className="text-slate-500 font-medium text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid Section ── */}
      <section id="features" className="py-20 sm:py-28 bg-[#0a0a14] relative">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-6">
              <Sparkles className="h-4 w-4 text-[#A78BFA]" />
              <span className="text-sm text-[#A78BFA] font-medium">المميزات</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-thmanyah-serif)" }}
            >
              كل ما تحتاجه لإدارة أعمالك
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              نظام شامل يغطي جميع جوانب عملك من المحاسبة إلى إدارة المخازن والمبيعات
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative bg-white/[0.03] rounded-2xl border border-white/[0.06] p-6 hover:border-[#7C3AED]/30 hover:bg-white/[0.05] transition-all duration-500 backdrop-blur-sm"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                  animation: 'border-glow 4s ease-in-out infinite',
                }}
              >
                <div className={`h-14 w-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules Showcase Section ── */}
      <section id="modules" className="py-20 sm:py-28 bg-[#050510] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-6">
              <Shield className="h-4 w-4 text-[#A78BFA]" />
              <span className="text-sm text-[#A78BFA] font-medium">الوحدات</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-thmanyah-serif)" }}
            >
              وحدات متكاملة تعمل معاً بسلاسة
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              كل وحدة مرتبطة بالأخرى لضمان تدفق البيانات بسلاسة ودقة التقارير المالية
            </p>
          </div>

          {/* Workflow */}
          <div className="flex flex-col items-center mb-16">
            <div className="hidden md:flex items-center gap-0 w-full max-w-4xl justify-center">
              {workflowSteps.map((step, index) => (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center group">
                    <div className={`h-20 w-20 rounded-2xl ${step.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-white/5`}>
                      <step.icon className={`h-9 w-9 ${step.iconColor}`} />
                    </div>
                    <span className="text-sm font-bold text-white">{step.label}</span>
                    <span className="text-xs text-slate-500 mt-1">{step.sublabel}</span>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="flex items-center mx-4 mb-8">
                      <div className="w-16 h-0.5 bg-[#7C3AED]/20 relative">
                        <ChevronLeft className="absolute -left-2 -top-2 h-4 w-4 text-[#7C3AED]/50" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="md:hidden flex flex-col items-center gap-6">
              {workflowSteps.map((step, index) => (
                <div key={step.label}>
                  <div className="flex flex-col items-center">
                    <div className={`h-16 w-16 rounded-xl ${step.bgColor} flex items-center justify-center mb-3 border border-white/5`}>
                      <step.icon className={`h-7 w-7 ${step.iconColor}`} />
                    </div>
                    <span className="text-sm font-bold text-white">{step.label}</span>
                    <span className="text-xs text-slate-500 mt-1">{step.sublabel}</span>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="flex justify-center my-3">
                      <ArrowLeft className="h-5 w-4 text-[#7C3AED]/50 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Module cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {modules.map((mod) => (
              <div
                key={mod.label}
                className="group bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 hover:border-[#7C3AED]/30 hover:bg-white/[0.05] transition-all duration-300 backdrop-blur-sm"
              >
                <div className={`h-12 w-12 rounded-xl ${mod.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <mod.icon className={`h-6 w-6 ${mod.iconColor}`} />
                </div>
                <h3 className="font-bold text-white mb-1.5">{mod.label}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{mod.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {mod.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-[#7C3AED]/5 text-[#A78BFA]/70 border border-[#7C3AED]/10">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us Section ── */}
      <section id="why" className="py-20 sm:py-28 bg-[#0a0a14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-6">
              <CheckCircle className="h-4 w-4 text-[#A78BFA]" />
              <span className="text-sm text-[#A78BFA] font-medium">ليه كنترول؟</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-thmanyah-serif)" }}
            >
              ليه تختار كنترول؟
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              نظام مصمم خصيصاً للسوق العربي يوفر لك كل ما تحتاجه في مكان واحد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUs.map((item, i) => (
              <div
                key={item.title}
                className="text-center p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#7C3AED]/30 transition-all duration-300"
                style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.15}s both` }}
              >
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#7C3AED]/15 to-[#F59E0B]/15 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="h-8 w-8 text-[#A78BFA]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 sm:py-28 bg-[#050510] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#7C3AED]/5 rounded-full blur-[120px]"
            style={{ animation: 'pulse-glow 6s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F59E0B]/3 rounded-full blur-[100px]"
            style={{ animation: 'pulse-glow 8s ease-in-out infinite 3s' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6"
            style={{ fontFamily: "var(--font-thmanyah-serif)" }}
          >
            جاهز لإدارة أعمالك باحترافية؟
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto">
            ابدأ الآن واكتشف قوة كنترول في تنظيم أعمالك وتحسين أدائها
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/sign-up">
              <Button
                size="lg"
                className="bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] hover:from-[#8B5CF6] hover:to-[#FBBF24] text-white font-bold text-xl px-12 h-16 rounded-xl shadow-[0_0_30px_rgba(124,58,237,0.25)] transition-all hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:scale-[1.02]"
              >
                ابدأ الآن مجاناً
                <ArrowLeft className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
              </Button>
            </a>
            <a href="/app">
              <Button
                variant="outline"
                size="lg"
                className="border-white/10 text-slate-300 hover:text-white hover:border-[#7C3AED]/30 hover:bg-[#7C3AED]/5 font-medium text-lg px-8 h-16 rounded-xl bg-transparent transition-all"
              >
                دخول النظام
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#030308] border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-white font-bold" style={{ fontFamily: "var(--font-thmanyah-serif)" }}>كنترول</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
              <span className="text-slate-700">|</span>
              <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
              <span className="text-slate-700">|</span>
              <a href="#" className="hover:text-white transition-colors">تواصل معنا</a>
            </div>
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} كنترول. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────

const features = [
  {
    title: 'لوحة تحكم ذكية',
    description: 'مؤشرات أداء فورية وتحليلات متقدمة لمتابعة حالة أعمالك في الوقت الحقيقي مع إحصائيات شاملة',
    icon: BarChart3,
    bgColor: 'bg-[#7C3AED]/10',
    iconColor: 'text-[#A78BFA]',
  },
  {
    title: 'محاسبة مزدوجة',
    description: 'نظام قيود يومية مع ترحيل تلقائي ودعم كامل للدورة المحاسبية وميزان المراجعة',
    icon: BookOpen,
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    title: 'إدارة مخازن',
    description: 'تتبع المخزون بطبقات FIFO وهرمية مخازن مع تحويلات وأذون صرف واستلام متكاملة',
    icon: Package,
    bgColor: 'bg-[#F59E0B]/10',
    iconColor: 'text-[#F59E0B]',
  },
  {
    title: 'مبيعات ومشتريات',
    description: 'دورة مستندات كاملة من الطلب للفاتورة مع إدارة مرتجعات وعروض أسعار احترافية',
    icon: ShoppingCart,
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
  },
  {
    title: 'إدارة استثمارات',
    description: 'متابعة المستثمرين وتوزيع الأرباح وحساب حصص الملكية بدقة عالية وشفافية كاملة',
    icon: Landmark,
    bgColor: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
  },
  {
    title: 'تقارير مالية',
    description: 'ميزانية عمومية وقائمة دخل وميزان مراجعة وتقارير أرصدة تفصيلية وشاملة',
    icon: TrendingUp,
    bgColor: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
  },
]

const modules = [
  {
    label: 'المحاسبة',
    description: 'قيود يومية وشجرة حسابات وترحيل تلقائي',
    icon: Calculator,
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    tags: ['قيود', 'حسابات', 'ترحيل'],
  },
  {
    label: 'المخازن',
    description: 'إدارة الأصناف والمخازن والحركات والتحويلات',
    icon: Warehouse,
    bgColor: 'bg-[#F59E0B]/10',
    iconColor: 'text-[#F59E0B]',
    tags: ['أصناف', 'مخازن', 'تحويلات'],
  },
  {
    label: 'المبيعات',
    description: 'أوامر بيع وفواتير ومرتجعات وعملاء',
    icon: ShoppingCart,
    bgColor: 'bg-[#7C3AED]/10',
    iconColor: 'text-[#A78BFA]',
    tags: ['فواتير', 'عملاء', 'أوامر'],
  },
  {
    label: 'المشتريات',
    description: 'أوامر شراء وفواتير وموردين ومرتجعات',
    icon: Truck,
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    tags: ['موردين', 'فواتير', 'شراء'],
  },
  {
    label: 'المستثمرون',
    description: 'إدارة الاستثمارات وتوزيع الأرباح والحصص',
    icon: HandCoins,
    bgColor: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    tags: ['أرباح', 'حصص', 'استثمارات'],
  },
  {
    label: 'التقارير',
    description: 'تقارير مالية وميزان مراجعة وقائمة دخل',
    icon: BarChart3,
    bgColor: 'bg-teal-500/10',
    iconColor: 'text-teal-400',
    tags: ['ميزانية', 'دخل', 'أرصدة'],
  },
  {
    label: 'الإعدادات',
    description: 'إدارة الشركات والمستخدمين والصلاحيات',
    icon: Settings,
    bgColor: 'bg-slate-500/10',
    iconColor: 'text-slate-400',
    tags: ['شركات', 'مستخدمين', 'صلاحيات'],
  },
  {
    label: 'المزيد',
    description: 'ميزات جديدة تُضاف باستمرار بناءً على احتياجاتكم',
    icon: Sparkles,
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    tags: ['قريباً', 'تحديثات'],
  },
]

const stats = [
  { value: '+1000', label: 'فاتورة معالجة' },
  { value: '99.9%', label: 'وقت التشغيل' },
  { value: '7', label: 'وحدات متكاملة' },
  { value: '35', label: 'صلاحية مرنة' },
]

const whyUs = [
  {
    title: 'تكامل تلقائي',
    description: 'بيانات الفاتورة تنتقل تلقائياً إلى القيود المحاسبية والتقارير المالية دون تدخل يدوي، مما يوفر الوقت ويمنع الأخطاء',
    icon: Zap,
  },
  {
    title: 'أمان مضمون',
    description: 'نظام صلاحيات متقدم يتحكم في وصول كل مستخدم حسب دوره الوظيفي مع حماية كاملة للبيانات المالية والحسابات',
    icon: Shield,
  },
  {
    title: 'واجهة عربية',
    description: 'واجهة مستخدم عربية بالكامل مصممة خصيصاً للسوق العربي مع دعم كامل للغة العربية والعملات المحلية',
    icon: Globe,
  },
]

const workflowSteps = [
  {
    label: 'أوامر شراء',
    sublabel: 'إنشاء وتنسيق',
    icon: ClipboardList,
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    label: 'فواتير',
    sublabel: 'إصدار ومعالجة',
    icon: FileText,
    bgColor: 'bg-[#7C3AED]/10',
    iconColor: 'text-[#A78BFA]',
  },
  {
    label: 'إيصالات',
    sublabel: 'تحصيل وصرف',
    icon: Receipt,
    bgColor: 'bg-[#F59E0B]/10',
    iconColor: 'text-[#F59E0B]',
  },
  {
    label: 'مرتجعات',
    sublabel: 'استرجاع وإعادة',
    icon: Undo2,
    bgColor: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
  },
]
