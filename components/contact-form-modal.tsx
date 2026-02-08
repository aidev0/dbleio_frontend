"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Loader2, CheckCircle } from "lucide-react"

interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPlan?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888"

export function ContactFormModal({ isOpen, onClose, selectedPlan }: ContactFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    company: "",
    website: "",
    annual_ad_spend: "",
    selected_plan: selectedPlan || "",
    message: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to submit form")
      }

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        setIsSuccess(false)
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          job_title: "",
          company: "",
          website: "",
          annual_ad_spend: "",
          selected_plan: "",
          message: "",
        })
      }, 2000)
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} aria-describedby={undefined} className="sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto border-0 sm:border border-border bg-background p-0 rounded-none sm:rounded-lg w-full max-w-full sm:w-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Contact Sales
            </p>
            <DialogTitle className="mt-1 text-base font-light text-foreground">
              Interested in solving your marketing problems with dble?
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-light text-foreground">Thank you!</h3>
            <p className="mt-2 text-center text-muted-foreground">
              We&apos;ll be in touch within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="border-border bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="border-border bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Business Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="border-border bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="border-border bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Job Title
                </Label>
                <Input
                  id="job_title"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  className="border-border bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Company <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
                className="border-border bg-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Website URL
              </Label>
              <Input
                id="website"
                name="website"
                type="text"
                placeholder="https://yoursite.com"
                value={formData.website}
                onChange={handleChange}
                className="border-border bg-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Annual Ad Spend
                </Label>
                <Select
                  value={formData.annual_ad_spend}
                  onValueChange={(value) => handleSelectChange("annual_ad_spend", value)}
                >
                  <SelectTrigger className="border-border bg-transparent">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-250k">Under $250K</SelectItem>
                    <SelectItem value="250k-500k">$250K - $500K</SelectItem>
                    <SelectItem value="500k-1m">$500K - $1M</SelectItem>
                    <SelectItem value="1m-5m">$1M - $5M</SelectItem>
                    <SelectItem value="5m-plus">$5M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Interested Plan
                </Label>
                <Select
                  value={formData.selected_plan}
                  onValueChange={(value) => handleSelectChange("selected_plan", value)}
                >
                  <SelectTrigger className="border-border bg-transparent">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform ($3,000/mo)</SelectItem>
                    <SelectItem value="scale">SCALE ($6,000/mo)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                What are you looking to achieve?
              </Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={3}
                placeholder="Tell us about your marketing automation needs..."
                className="border-border bg-transparent resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-mono text-xs uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
