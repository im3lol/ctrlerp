'use client'

import { useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Package,
  ShoppingCart,
  Landmark,
  TrendingUp,
  ArrowLeft,
  ChevronLeft,
  ClipboardList,
  FileText,
  Receipt,
  Undo2,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Landing Page Component ────────────────────────────────────────────────

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [navigating, setNavigating] = useState(false)

  const handleGetStarted = () => {
    setNavigating(true)
    onGetStarted()
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "var(--font-thmanyah-sans)" }}
    >
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#050510]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">كنترول</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors">المميزات</a>
            <a href="#stats" className="text-sm text-slate-300 hover:text-white transition-colors">الإحصائيات</a>
            <a href="#modules" className="text-sm text-slate-300 hover:text-white transition-colors">الوحدات</a>
          </div>
          <Button
            onClick={handleGetStarted}
            disabled={navigating}
            className="bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] hover:from-[#8B5CF6] hover:to-[#FBBF24] text-white font-medium px-6"
          >
            {navigating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الدخول...
              </span>
            ) : (
              'ابدأ الآن'
            )}
          </Button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#050510] via-[#0a0a14] to-[#050510] overflow-hidden pt-16">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#7C3AED]/8 rounded-full blur-3xl"
            style={{ animation: 'pulse-glow 6s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#F59E0B]/5 rounded-full blur-3xl"
            style={{ animation: 'pulse-glow 8s ease-in-out infinite 2s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#7C3AED]/4 rounded-full blur-3xl"
            style={{ animation: 'pulse-glow 7s ease-in-out infinite 4s' }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-12"
            style={{ animation: 'fadeInUp 0.6s ease-out' }}
          >
            <Zap className="h-4 w-4 text-[#A78BFA]" />
            <span className="text-sm text-[#A78BFA] font-medium">الحل العربي الأول لإدارة الأعمال</span>
          </div>

          {/* Hero composition: badges around heading */}
          <div className="relative py-16 sm:py-20 lg:py-24">
            {/* Top row badges - hidden on mobile */}
            <div
              className="hidden lg:flex justify-center gap-16 xl:gap-24 mb-16"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            >
              {heroBadges.slice(0, 2).map((badge, i) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.1] hover:border-[#7C3AED]/30 transition-all duration-300 cursor-default"
                >
                  <div className={`h-7 w-7 rounded-lg ${badge.bgColor} flex items-center justify-center`}>
                    <badge.icon className={`h-4 w-4 ${badge.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Main Heading - the hero */}
            <h1
              className="relative z-10 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.6]"
              style={{
                fontFamily: "var(--font-thmanyah-serif)",
                animation: 'fadeInUp 0.6s ease-out 0.1s both',
              }}
            >
              نظامك المتكامل لإدارة
              <br />
              أعمالك من أول الطلب
              <br />
              <span className="bg-gradient-to-l from-[#A78BFA] to-[#F59E0B] bg-clip-text text-transparent">للتسليم النهائي</span>
            </h1>

            {/* Bottom row badges - hidden on mobile */}
            <div
              className="hidden lg:flex justify-center gap-16 xl:gap-24 mt-16"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
            >
              {heroBadges.slice(2, 4).map((badge, i) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.1] hover:border-[#7C3AED]/30 transition-all duration-300 cursor-default"
                >
                  <div className={`h-7 w-7 rounded-lg ${badge.bgColor} flex items-center justify-center`}>
                    <badge.icon className={`h-4 w-4 ${badge.iconColor}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Side badges - only on xl screens */}
            <div
              className="hidden xl:block absolute top-1/2 -right-8 -translate-y-1/2"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.4s both' }}
            >
              <div className="flex flex-col gap-6">
                {heroBadges.slice(4, 6).map((badge) => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.1] hover:border-[#7C3AED]/30 transition-all duration-300 cursor-default"
                  >
                    <div className={`h-7 w-7 rounded-lg ${badge.bgColor} flex items-center justify-center`}>
                      <badge.icon className={`h-4 w-4 ${badge.iconColor}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-300 whitespace-nowrap">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Left side badge */}
            <div
              className="hidden xl:block absolute top-1/2 -left-8 -translate-y-1/2"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.5s both' }}
            >
              <div className="flex flex-col gap-6">
                {heroBadges.slice(6, 8).map((badge) => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.1] hover:border-[#7C3AED]/30 transition-all duration-300 cursor-default"
                  >
                    <div className={`h-7 w-7 rounded-lg ${badge.bgColor} flex items-center justify-center`}>
                      <badge.icon className={`h-4 w-4 ${badge.iconColor}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-300 whitespace-nowrap">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile badges - shown as pills below heading */}
            <div
              className="lg:hidden flex flex-wrap justify-center gap-3 mt-10"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
            >
              {heroBadges.map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm"
                >
                  <div className={`h-5 w-5 rounded-md ${badge.bgColor} flex items-center justify-center`}>
                    <badge.icon className={`h-3 w-3 ${badge.iconColor}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-300 whitespace-nowrap">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subheading */}
          <p
            className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-loose"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
          >
            الحل العربي الأول لإدارة أعمالك بكفاءة واحترافية.
            <br className="hidden sm:block" />
            محاسبة، مخازن، مبيعات، مشتريات، واستثمارات في نظام واحد.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}
          >
            <Button
              onClick={handleGetStarted}
              disabled={navigating}
              size="lg"
              className="bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] hover:from-[#8B5CF6] hover:to-[#FBBF24] text-white font-bold text-lg px-8 h-14 rounded-xl shadow-lg shadow-[#7C3AED]/25 transition-all hover:shadow-[#7C3AED]/40 hover:scale-[1.02]"
            >
              ابدأ الآن
              <ArrowLeft className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
            </Button>
            <a href="#features">
              <Button
                variant="outline"
                size="lg"
                className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-medium text-lg px-8 h-14 rounded-xl bg-transparent"
              >
                تعرف على المزيد
              </Button>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: 'fadeIn 1s ease-out 1s both' }}>
          <div className="w-6 h-10 rounded-full border-2 border-slate-500 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-[#A78BFA] rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── Features Grid Section ── */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-20" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-xs text-violet-700 font-medium">المميزات</span>
            </div>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-relaxed"
              style={{ fontFamily: "var(--font-thmanyah-serif)" }}
            >
              نظامك المتكامل لإدارة
              <br />
              أعمالك من أول الطلب للتسليم النهائي
            </h2>
            <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              نظام شامل يغطي جميع جوانب عملك من المحاسبة إلى إدارة المخازن والمبيعات
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-50 transition-all duration-300 overflow-hidden"
                style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
              >
                <div className={`h-12 w-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2 leading-snug">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Statistics Section ── */}
      <section id="stats" className="py-16 sm:py-20 bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center min-w-0"
                style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
              >
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-thmanyah-serif)" }}>
                  {stat.value}
                </div>
                <div className="text-white/80 font-medium text-xs sm:text-base leading-relaxed">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules Showcase Section ── */}
      <section id="modules" className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 mb-4">
              <Shield className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-xs text-violet-700 font-medium">سير العمل</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
              style={{ fontFamily: "var(--font-thmanyah-serif)" }}
            >
              وحدات متكاملة تعمل معاً بسلاسة
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              كل وحدة مرتبطة بالأخرى لضمان تدفق البيانات بسلاسة ودقة التقارير المالية
            </p>
          </div>

          {/* Workflow diagram */}
          <div className="flex flex-col items-center">
            {/* Desktop workflow */}
            <div className="hidden md:flex items-start gap-0 w-full max-w-4xl justify-center">
              {workflowSteps.map((step, index) => (
                <div key={step.label} className="flex items-start min-w-0">
                  <div className="flex flex-col items-center group shrink-0">
                    <div className={`h-16 w-16 md:h-20 md:w-20 rounded-2xl ${step.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                      <step.icon className={`h-7 w-7 md:h-9 md:w-9 ${step.iconColor}`} />
                    </div>
                    <span className="text-xs md:text-sm font-bold text-slate-800 whitespace-nowrap">{step.label}</span>
                    <span className="text-[10px] md:text-xs text-slate-400 mt-0.5 whitespace-nowrap">{step.sublabel}</span>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="flex items-center mx-2 md:mx-4 mt-8">
                      <div className="w-10 md:w-16 h-0.5 bg-violet-300 relative">
                        <ChevronLeft className="absolute -left-2 -top-2 h-4 w-4 text-violet-500" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile workflow */}
            <div className="md:hidden flex flex-col items-center gap-6">
              {workflowSteps.map((step, index) => (
                <div key={step.label}>
                  <div className="flex flex-col items-center">
                    <div className={`h-16 w-16 rounded-xl ${step.bgColor} flex items-center justify-center mb-3 shadow-sm`}>
                      <step.icon className={`h-7 w-7 ${step.iconColor}`} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{step.label}</span>
                    <span className="text-xs text-slate-400 mt-1">{step.sublabel}</span>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="flex justify-center my-3">
                      <ArrowLeft className="h-5 w-5 text-violet-400 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional workflow description */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {workflowBenefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="bg-white rounded-xl border border-slate-100 p-6 text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-slate-500">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 sm:py-28 bg-[#050510] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-96 h-96 bg-[#7C3AED]/5 rounded-full blur-3xl"
            style={{ animation: 'pulse-glow 6s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-0 left-0 w-80 h-80 bg-[#F59E0B]/5 rounded-full blur-3xl"
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
            ابدأ الآن مجاناً واكتشف قوة كنترول في تنظيم أعمالك وتحسين أدائها
          </p>
          <Button
            onClick={handleGetStarted}
            disabled={navigating}
            size="lg"
            className="bg-gradient-to-l from-[#7C3AED] to-[#F59E0B] hover:from-[#8B5CF6] hover:to-[#FBBF24] text-white font-bold text-xl px-12 h-16 rounded-xl shadow-lg shadow-[#7C3AED]/25 transition-all hover:shadow-[#7C3AED]/40 hover:scale-[1.02]"
          >
            ابدأ الآن مجاناً
            <ArrowLeft className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 rtl:rotate-180" />
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#030308] border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-8 w-8 bg-gradient-to-bl from-[#7C3AED] to-[#F59E0B] rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-white font-bold">كنترول</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <a href="#" className="hover:text-white transition-colors">تواصل معنا</a>
            </div>
            <p className="text-sm text-slate-500 shrink-0">
              © {new Date().getFullYear()} كنترول. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────

const heroBadges = [
  { label: 'تقارير مالية', icon: TrendingUp, bgColor: 'bg-teal-500/20', iconColor: 'text-teal-400' },
  { label: 'محاسبة مزدوجة', icon: BookOpen, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400' },
  { label: 'إدارة مخازن', icon: Package, bgColor: 'bg-amber-500/20', iconColor: 'text-amber-400' },
  { label: 'صلاحيات مرنة', icon: Shield, bgColor: 'bg-indigo-500/20', iconColor: 'text-indigo-400' },
  { label: 'مبيعات ومشتريات', icon: ShoppingCart, bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400' },
  { label: 'لوحة تحكم ذكية', icon: BarChart3, bgColor: 'bg-violet-500/20', iconColor: 'text-violet-400' },
  { label: 'إدارة استثمارات', icon: Landmark, bgColor: 'bg-rose-500/20', iconColor: 'text-rose-400' },
]

const features = [
  {
    title: 'لوحة تحكم ذكية',
    description: 'مؤشرات أداء فورية وتحليلات متقدمة لمتابعة حالة أعمالك في الوقت الحقيقي',
    icon: BarChart3,
    bgColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    title: 'محاسبة مزدوجة',
    description: 'نظام قيود يومية مع ترحيل تلقائي ودعم كامل للدورة المحاسبية',
    icon: BookOpen,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    title: 'إدارة مخازن',
    description: 'تتبع المخزون بطبقات FIFO وهرمية مخازن مع تحويلات وأذون صرف واستلام',
    icon: Package,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    title: 'مبيعات ومشتريات',
    description: 'دورة مستندات كاملة من الطلب للفاتورة مع إدارة مرتجعات وعروض أسعار',
    icon: ShoppingCart,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    title: 'إدارة استثمارات',
    description: 'متابعة المستثمرين وتوزيع الأرباح وحساب حصص الملكية بدقة',
    icon: Landmark,
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    title: 'تقارير مالية',
    description: 'ميزانية عمومية وقائمة دخل وميزان مراجعة وتقارير أرصدة تفصيلية',
    icon: TrendingUp,
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    title: 'صلاحيات مرنة',
    description: 'تحكم كامل في صلاحيات المستخدمين مع أدوار متعددة وصلاحيات قابلة للتخصيص',
    icon: Shield,
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
]

const stats = [
  { value: '+1000', label: 'فاتورة معالجة' },
  { value: '99.9%', label: 'وقت التشغيل' },
  { value: '7', label: 'أدوار صلاحيات' },
  { value: '35', label: 'صلاحية مرنة' },
]

const workflowSteps = [
  {
    label: 'أوامر شراء',
    sublabel: 'إنشاء وتنسيق',
    icon: ClipboardList,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    label: 'فواتير',
    sublabel: 'إصدار ومعالجة',
    icon: FileText,
    bgColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    label: 'إيصالات',
    sublabel: 'تحصيل وصرف',
    icon: Receipt,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    label: 'مرتجعات',
    sublabel: 'استرجاع وإعادة',
    icon: Undo2,
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
]

const workflowBenefits = [
  {
    title: 'تكامل تلقائي',
    description: 'بيانات الفاتورة تنتقل تلقائياً إلى القيود المحاسبية والتقارير المالية',
    icon: Zap,
  },
  {
    title: 'دقة مضمونة',
    description: 'ترحيل تلقائي يمنع الأخطاء البشرية ويضمن توازن الحسابات',
    icon: Shield,
  },
  {
    title: 'تتبع كامل',
    description: 'تتبع كل عملية من إنشائها حتى إتمامها مع سجل كامل للتعديلات',
    icon: BarChart3,
  },
]
