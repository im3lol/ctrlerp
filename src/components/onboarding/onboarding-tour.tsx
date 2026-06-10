'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Lightbulb,
  X,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Sparkles,
  LayoutDashboard,
  Menu,
  Zap,
  Navigation,
  Building2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const ONBOARDING_KEY = 'ctrl_erp_onboarding_done'

// ─── Tour Step Definition ─────────────────────────────────────────────────────

interface TourStep {
  id: string
  target: string
  title: string
  description: string
  icon: React.ElementType
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: '',
    title: 'مرحباً بك في كنترول!',
    description: 'هنتعرف معاك على أهم مميزات النظام',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    title: 'القائمة الجانبية',
    description: 'القائمة الجانبية هي مركز التحكم الرئيسي - من هنا تقدر تتنقل بين كل وحدات النظام',
    icon: Menu,
    position: 'right',
  },
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'لوحة التحكم',
    description: 'لوحة التحكم بتعرضلك ملخص أعمالك - المبيعات، المشتريات، والمخزون',
    icon: LayoutDashboard,
    position: 'left',
  },
  {
    id: 'quick-actions',
    target: '[data-tour="quick-actions"]',
    title: 'الإجراءات السريعة',
    description: 'من الإجراءات السريعة تقدر تعمل فواتير وأوامر بضغطة واحدة',
    icon: Zap,
    position: 'left',
  },
  {
    id: 'navigation',
    target: '[data-tour="nav-item"]',
    title: 'التنقل بين الأقسام',
    description: 'كل وحدة ليها صفحات فرعية - اضغط على السهم عشان تشوف الأقسام',
    icon: Navigation,
    position: 'right',
  },
  {
    id: 'company-switcher',
    target: '[data-tour="company-switcher"]',
    title: 'التبديل بين الشركات',
    description: 'لو عندك أكتر من شركة، تقدر تتنقل بينهم من هنا',
    icon: Building2,
    position: 'bottom',
  },
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'قائمة المستخدم',
    description: 'من قائمة المستخدم تقدر تعدل بياناتك وتسجل خروج',
    icon: User,
    position: 'bottom',
  },
  {
    id: 'complete',
    target: '',
    title: 'تمام! أنت جاهز تبدأ 🎉',
    description: 'لو محتاج مساعدة تاني اضغط على زر المساعدة',
    icon: Sparkles,
    position: 'center',
  },
]

// ─── Helper: get element position ─────────────────────────────────────────────

function getElementRect(selector: string): DOMRect | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  return el.getBoundingClientRect()
}

// ─── Tour Tooltip Component ───────────────────────────────────────────────────

interface TourTooltipProps {
  step: TourStep
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  targetRect: DOMRect | null
}

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  targetRect,
}: TourTooltipProps) {
  const isCenter = step.position === 'center'
  const isLast = stepIndex === totalSteps - 1
  const isFirst = stepIndex === 0

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {}
  let arrowClass = ''

  if (!isCenter && targetRect) {
    const tooltipWidth = 360
    const tooltipHeight = 220
    const gap = 12

    switch (step.position) {
      case 'right': // In RTL, this means the tooltip appears to the left of the target
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          right: window.innerWidth - targetRect.left + gap,
        }
        arrowClass = 'after:right-[-6px] after:top-1/2 after:-translate-y-1/2 after:border-l-violet-200 after:border-y-transparent after:border-r-0'
        break
      case 'left': // In RTL, this means the tooltip appears to the right of the target
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + gap,
        }
        arrowClass = 'after:left-[-6px] after:top-1/2 after:-translate-y-1/2 after:border-r-violet-200 after:border-y-transparent after:border-l-0'
        break
      case 'bottom':
        tooltipStyle = {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        }
        arrowClass = 'after:top-[-6px] after:left-1/2 after:-translate-x-1/2 after:border-b-violet-200 after:border-x-transparent after:border-t-0'
        break
      case 'top':
        tooltipStyle = {
          bottom: window.innerHeight - targetRect.top + gap,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        }
        arrowClass = 'after:bottom-[-6px] after:left-1/2 after:-translate-x-1/2 after:border-t-violet-200 after:border-x-transparent after:border-b-0'
        break
    }

    // Keep tooltip within viewport
    if (tooltipStyle.top !== undefined) {
      tooltipStyle.top = Math.max(16, Math.min(tooltipStyle.top as number, window.innerHeight - tooltipHeight - 16))
    }
    if (tooltipStyle.bottom !== undefined) {
      tooltipStyle.bottom = Math.max(16, tooltipStyle.bottom as number)
    }
    if (tooltipStyle.left !== undefined) {
      tooltipStyle.left = Math.max(16, Math.min(tooltipStyle.left as number, window.innerWidth - tooltipWidth - 16))
    }
    if (tooltipStyle.right !== undefined) {
      tooltipStyle.right = Math.max(16, tooltipStyle.right as number)
    }
  }

  const Icon = step.icon

  return (
    <div
      className={cn(
        'fixed z-[100] transition-all duration-300 ease-out',
        isCenter && 'inset-0 flex items-center justify-center'
      )}
      style={isCenter ? undefined : tooltipStyle}
      dir="rtl"
    >
      <Card
        className={cn(
          'w-[360px] shadow-xl border-violet-200 bg-white relative',
          'after:content-[""] after:absolute after:w-3 after:h-3 after:rotate-45 after:bg-white after:border-violet-200',
          isCenter ? 'after:hidden' : arrowClass,
        )}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{step.title}</h3>
                <p className="text-xs text-violet-500 mt-0.5">
                  {stepIndex + 1} / {totalSteps}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -mt-1 -me-1 text-slate-400 hover:text-slate-600"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === stepIndex
                    ? 'w-6 bg-violet-500'
                    : i < stepIndex
                    ? 'w-1.5 bg-violet-300'
                    : 'w-1.5 bg-slate-200'
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrev}
                  className="gap-1 text-slate-600"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isLast && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-slate-400 hover:text-slate-600"
                >
                  تخطي
                  <SkipForward className="h-3.5 w-3.5 ms-1" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={onNext}
                className={cn(
                  'gap-1',
                  isLast
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                )}
              >
                {isLast ? 'يلا بينا!' : 'التالي'}
                {!isLast && <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Highlight Overlay ────────────────────────────────────────────────────────

interface HighlightOverlayProps {
  targetRect: DOMRect | null
  isCenter: boolean
}

function HighlightOverlay({ targetRect, isCenter }: HighlightOverlayProps) {
  if (isCenter || !targetRect) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[90] transition-opacity duration-300" />
    )
  }

  const padding = 6
  const top = targetRect.top - padding
  const left = targetRect.left - padding
  const width = targetRect.width + padding * 2
  const height = targetRect.height + padding * 2

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {/* Top */}
      <div className="absolute top-0 left-0 right-0 bg-black/40 transition-all duration-300" style={{ height: top }} />
      {/* Bottom */}
      <div className="absolute left-0 right-0 bg-black/40 transition-all duration-300" style={{ top: top + height, bottom: 0 }} />
      {/* Left */}
      <div className="absolute bg-black/40 transition-all duration-300" style={{ top, left: 0, width: left, height }} />
      {/* Right */}
      <div className="absolute bg-black/40 transition-all duration-300" style={{ top, left: left + width, right: 0, height }} />
      {/* Highlight ring */}
      <div
        className="absolute rounded-lg ring-2 ring-violet-500 ring-offset-2 ring-offset-transparent transition-all duration-300 pointer-events-auto"
        style={{
          top,
          left,
          width,
          height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}

// ─── Main Onboarding Tour Component ───────────────────────────────────────────

interface OnboardingTourProps {
  autoStart?: boolean
}

export default function OnboardingTour({ autoStart = false }: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  // Mount check
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if onboarding was already done
  useEffect(() => {
    if (!mounted) return
    const done = localStorage.getItem(ONBOARDING_KEY)
    if (!done && autoStart) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [mounted, autoStart])

  // Update target element position
  const updateTargetRect = useCallback(() => {
    const step = tourSteps[currentStep]
    if (!step || !step.target || step.position === 'center') {
      setTargetRect(null)
      return
    }
    const rect = getElementRect(step.target)
    setTargetRect(rect)
  }, [currentStep])

  useEffect(() => {
    if (!isOpen) return
    updateTargetRect()

    // Update on resize/scroll
    const handleUpdate = () => updateTargetRect()
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)

    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [isOpen, currentStep, updateTargetRect])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete tour
      localStorage.setItem(ONBOARDING_KEY, 'true')
      setIsOpen(false)
      setCurrentStep(0)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setIsOpen(false)
    setCurrentStep(0)
  }

  const handleRestart = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setCurrentStep(0)
    setIsOpen(true)
  }

  if (!mounted) return null

  const step = tourSteps[currentStep]
  const isCenter = step?.position === 'center'

  return (
    <>
      {/* Floating Help Button */}
      {!isOpen && (
        <button
          onClick={handleRestart}
          className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
          title="مساعدة"
          dir="rtl"
        >
          <Lightbulb className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Tour Overlay & Tooltip */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[90]">
          <HighlightOverlay targetRect={targetRect} isCenter={isCenter} />
          <TourTooltip
            step={step}
            stepIndex={currentStep}
            totalSteps={tourSteps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            targetRect={targetRect}
          />
        </div>,
        document.body
      )}
    </>
  )
}
