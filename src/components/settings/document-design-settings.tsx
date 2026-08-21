"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Type,
  Trash2,
  FileText,
  Receipt,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AppSelect } from "@/components/ui/app-select";
import { useSettings } from "@/hooks/useSettings";
import { useDefaultCompany } from "@/hooks/controllers/company";
import { toast } from "react-toastify";

const PRESET_COLORS = [
  { label: "Amber", hex: "#f59e0b" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Blue", hex: "#2563eb" },
  { label: "Indigo", hex: "#6366f1" },
  { label: "Slate", hex: "#334155" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Dark", hex: "#18181b" },
];

export default function DocumentDesignSettings() {
  const { settings, updateSetting } = useSettings();
  const { data: company } = useDefaultCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewMode, setPreviewMode] = useState<"invoice" | "receipt" | "refund">("invoice");
  const [zoom, setZoom] = useState<number>(100);

  const companyName = company?.name || settings.storeName || "Axis Retail Co.";
  const companyAddress =
    [company?.buildingNumber, company?.streetName, company?.city, company?.postalCode]
      .filter(Boolean)
      .join(", ") || "123 Business Avenue, Suite 100";
  const companyPhone = company?.phone || "+1 (555) 019-2834";
  const companyTaxNumber = company?.taxNumber || "TAX-GB-9928172";
  const currency = (company as any)?.currency || "$";

  // Handle Logo Upload (converts to base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, SVG, WebP)");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image size should be under 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateSetting("logoUrl", base64);
      updateSetting("logoType", "image");
      updateSetting("enableLogo", true);
      toast.success("Logo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateSetting("logoUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Logo removed");
  };

  const brandDisplayName =
    (settings.logoType === "text" && settings.logoText)
      ? settings.logoText
      : companyName;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* ── LEFT CONFIGURATION PANEL ──────────────────────────────────────── */}
      <div className="w-full lg:w-[460px] shrink-0 space-y-6">
        {/* Logo & Branding */}
        <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Logo & Header Branding
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Show branding</span>
              <Switch
                checked={settings.enableLogo}
                onCheckedChange={(v) => updateSetting("enableLogo", v)}
              />
            </div>
          </div>

          {settings.enableLogo && (
            <div className="space-y-4 pt-1">
              {/* Mode Toggle: Image vs Text Logo */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-200/70 dark:bg-stone-900/80 rounded-lg border border-stone-300/50 dark:border-stone-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => updateSetting("logoType", "image")}
                  className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md font-medium transition-all ${
                    settings.logoType !== "text"
                      ? "bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Image Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting("logoType", "text")}
                  className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md font-medium transition-all ${
                    settings.logoType === "text"
                      ? "bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Text Logo</span>
                </button>
              </div>

              {/* ── IMAGE LOGO SECTION ── */}
              {settings.logoType !== "text" ? (
                <div className="space-y-3">
                  {settings.logoUrl ? (
                    <div className="relative border border-stone-300 dark:border-stone-700 rounded-lg p-3 bg-white dark:bg-stone-900 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={settings.logoUrl}
                          alt="Company Logo"
                          className="h-12 max-w-[120px] object-contain rounded"
                        />
                        <div className="text-xs">
                          <span className="font-medium text-stone-800 dark:text-stone-200 block">
                            Custom Logo Active
                          </span>
                          <span className="text-stone-500 text-[11px]">Ready for print & documents</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 text-xs"
                        >
                          Replace
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleRemoveLogo}
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500/80 rounded-lg p-5 text-center cursor-pointer transition-colors bg-white/40 dark:bg-stone-900/30"
                      >
                        <Upload className="w-6 h-6 mx-auto text-stone-400 mb-1" />
                        <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                          Click to upload company logo
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">PNG, JPG, SVG or WebP (max 3MB)</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <Type className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          Don't have an image logo? Switch to{" "}
                          <button
                            type="button"
                            onClick={() => updateSetting("logoType", "text")}
                            className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200"
                          >
                            Text Logo
                          </button>{" "}
                          to type your business name and tagline as a custom text header.
                        </span>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />

                  {/* Logo Alignment & Width */}
                  {settings.logoUrl && (
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                          Logo position
                        </label>
                        <AppSelect
                          size="sm"
                          value={settings.logoPosition}
                          onChange={(val) => updateSetting("logoPosition", val as any)}
                          options={[
                            { value: "left", label: "Left aligned" },
                            { value: "center", label: "Center aligned" },
                            { value: "right", label: "Right aligned" },
                          ]}
                          isSearchable={false}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                          <span>Logo width</span>
                          <span className="font-mono">{settings.logoWidth}px</span>
                        </div>
                        <Slider
                          min={60}
                          max={220}
                          step={5}
                          value={[settings.logoWidth]}
                          onValueChange={(v) => updateSetting("logoWidth", v[0])}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── TEXT LOGO SECTION ── */
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                      Header / Brand Text
                    </label>
                    <Input
                      value={settings.logoText}
                      onChange={(e) => updateSetting("logoText", e.target.value)}
                      placeholder={companyName || "Enter your business name"}
                      className="h-8 bg-white dark:bg-stone-900 text-xs font-semibold"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Leave empty to use your default Company Name ({companyName}).
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                      Tagline / Slogan (Optional)
                    </label>
                    <Input
                      value={settings.logoSubtitle}
                      onChange={(e) => updateSetting("logoSubtitle", e.target.value)}
                      placeholder="e.g. Quality & Service Since 1995"
                      className="h-8 bg-white dark:bg-stone-900 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                        Alignment
                      </label>
                      <AppSelect
                        size="sm"
                        value={settings.logoPosition}
                        onChange={(val) => updateSetting("logoPosition", val as any)}
                        options={[
                          { value: "left", label: "Left aligned" },
                          { value: "center", label: "Center aligned" },
                          { value: "right", label: "Right aligned" },
                        ]}
                        isSearchable={false}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                        <span>Font size</span>
                        <span className="font-mono">{settings.logoTextFontSize || 22}px</span>
                      </div>
                      <Slider
                        min={14}
                        max={32}
                        step={1}
                        value={[settings.logoTextFontSize || 22]}
                        onValueChange={(v) => updateSetting("logoTextFontSize", v[0])}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700/60">
                    <span className="text-xs text-stone-700 dark:text-stone-300">
                      Colorize with Accent Color
                    </span>
                    <Switch
                      checked={settings.logoUseAccentColor !== false}
                      onCheckedChange={(v) => updateSetting("logoUseAccentColor", v)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accent Color Palette */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-700/60">
            <label className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block mb-2">
              Document Accent Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => updateSetting("documentAccentColor", c.hex)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                    settings.documentAccentColor === c.hex
                      ? "scale-110 border-amber-500 shadow-sm"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {settings.documentAccentColor === c.hex && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  )}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-2 border border-stone-300 dark:border-stone-700 rounded-md px-2 py-0.5 bg-white dark:bg-stone-900">
                <input
                  type="color"
                  value={settings.documentAccentColor}
                  onChange={(e) => updateSetting("documentAccentColor", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="text-[11px] font-mono uppercase text-stone-600 dark:text-stone-300">
                  {settings.documentAccentColor}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Watermark & Background Logo */}
        <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Watermark & Background
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Enable</span>
              <Switch
                checked={settings.enableWatermark}
                onCheckedChange={(v) => updateSetting("enableWatermark", v)}
              />
            </div>
          </div>

          {settings.enableWatermark && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                    Watermark style
                  </label>
                  <AppSelect
                    size="sm"
                    value={settings.watermarkType}
                    onChange={(val) => updateSetting("watermarkType", val as any)}
                    options={[
                      { value: "text", label: "Diagonal Text" },
                      { value: "logo", label: "Centered Logo" },
                    ]}
                    isSearchable={false}
                  />
                </div>
                {settings.watermarkType === "text" && (
                  <div>
                    <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                      Watermark text
                    </label>
                    <Input
                      value={settings.watermarkText}
                      onChange={(e) => updateSetting("watermarkText", e.target.value)}
                      placeholder="e.g. PAID, COPY"
                      className="h-8 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-xs uppercase"
                    />
                  </div>
                )}
              </div>

              {/* Watermark Opacity & Angle */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                    <span>Watermark transparency</span>
                    <span className="font-mono">{Math.round(settings.watermarkOpacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0.03}
                    max={0.4}
                    step={0.01}
                    value={[settings.watermarkOpacity]}
                    onValueChange={(v) => updateSetting("watermarkOpacity", v[0])}
                  />
                </div>

                {settings.watermarkType === "text" && (
                  <div>
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                      <span>Watermark angle</span>
                      <span className="font-mono">{settings.watermarkAngle}°</span>
                    </div>
                    <Slider
                      min={-60}
                      max={60}
                      step={5}
                      value={[settings.watermarkAngle]}
                      onValueChange={(v) => updateSetting("watermarkAngle", v[0])}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Background Central Watermark Logo toggle */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-stone-800 dark:text-stone-200 block">
                Central Background Logo Watermark
              </span>
              <span className="text-[11px] text-stone-500">
                Faint logo embossed in the center of documents
              </span>
            </div>
            <Switch
              checked={settings.enableBackgroundLogo}
              onCheckedChange={(v) => updateSetting("enableBackgroundLogo", v)}
            />
          </div>
        </div>

        {/* Receipt & Invoice Messages */}
        <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Headers, Footers & Notes
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                Receipt top greeting message
              </label>
              <Input
                value={settings.receiptHeaderMessage}
                onChange={(e) => updateSetting("receiptHeaderMessage", e.target.value)}
                placeholder="e.g. Welcome to our store!"
                className="h-8 bg-white dark:bg-stone-900 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                Receipt footer message
              </label>
              <textarea
                value={settings.receiptFooterMessage}
                onChange={(e) => updateSetting("receiptFooterMessage", e.target.value)}
                rows={2}
                placeholder="e.g. Thank you for your business! Have a great day."
                className="w-full text-xs p-2 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-stone-500 dark:text-stone-400 block mb-1">
                Invoice payment terms & bank notes
              </label>
              <textarea
                value={settings.invoiceNotes}
                onChange={(e) => updateSetting("invoiceNotes", e.target.value)}
                rows={2}
                placeholder="e.g. Payment due within 14 days. Bank: XYZ, Account: 0012398."
                className="w-full text-xs p-2 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Application Scope */}
        <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Apply Custom Branding To
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700 dark:text-stone-300">Sales Invoices & Reports (A4 / A5)</span>
              <Switch
                checked={settings.applyDesignToInvoice}
                onCheckedChange={(v) => updateSetting("applyDesignToInvoice", v)}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700 dark:text-stone-300">POS Receipts (Thermal 80mm/58mm)</span>
              <Switch
                checked={settings.applyDesignToReceipt}
                onCheckedChange={(v) => updateSetting("applyDesignToReceipt", v)}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700 dark:text-stone-300">Refund Notes & Credit Vouchers</span>
              <Switch
                checked={settings.applyDesignToRefund}
                onCheckedChange={(v) => updateSetting("applyDesignToRefund", v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT LIVE INTERACTIVE PREVIEW ─────────────────────────────────── */}
      <div className="flex-1 w-full bg-stone-900/90 border border-stone-800 rounded-xl overflow-hidden flex flex-col min-h-[640px]">
        {/* Preview Top Header */}
        <div className="h-12 border-b border-stone-800 bg-stone-950 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 bg-stone-900 p-0.5 rounded-lg border border-stone-800">
            <Button
              size="sm"
              variant={previewMode === "invoice" ? "secondary" : "ghost"}
              onClick={() => setPreviewMode("invoice")}
              className={`h-7 text-xs gap-1.5 ${
                previewMode === "invoice"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Invoice Preview
            </Button>
            <Button
              size="sm"
              variant={previewMode === "receipt" ? "secondary" : "ghost"}
              onClick={() => setPreviewMode("receipt")}
              className={`h-7 text-xs gap-1.5 ${
                previewMode === "receipt"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Receipt (80mm)
            </Button>
            <Button
              size="sm"
              variant={previewMode === "refund" ? "secondary" : "ghost"}
              onClick={() => setPreviewMode("refund")}
              className={`h-7 text-xs gap-1.5 ${
                previewMode === "refund"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refund Note
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="w-10 text-center font-mono">{zoom}%</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(150, z + 15))}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 border-stone-800 text-stone-400 hover:text-white ml-1"
              onClick={() => setZoom(100)}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-stone-950/70">
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.12s ease-out",
            }}
          >
            {previewMode === "invoice" && (
              /* ── INVOICE SHEET ─────────────────────────────────────────── */
              <div className="w-[560px] min-h-[720px] bg-white text-stone-900 rounded-sm shadow-2xl p-8 relative overflow-hidden flex flex-col justify-between select-none">
                {/* Background Watermark Logo */}
                {settings.enableBackgroundLogo && settings.logoUrl && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ opacity: settings.backgroundLogoOpacity || 0.08 }}
                  >
                    <img
                      src={settings.logoUrl}
                      alt="Watermark Logo"
                      className="w-72 max-h-72 object-contain grayscale"
                    />
                  </div>
                )}

                {/* Diagonal Text Watermark */}
                {settings.enableWatermark && settings.watermarkType === "text" && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      transform: `rotate(${settings.watermarkAngle}deg)`,
                      opacity: settings.watermarkOpacity,
                    }}
                  >
                    <span className="text-7xl font-extrabold tracking-widest text-red-600 border-4 border-red-600 px-6 py-2 rounded-lg">
                      {settings.watermarkText || "PAID"}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div>
                  <div className="flex items-start justify-between border-b pb-4">
                    <div
                      className={`flex flex-col ${
                        settings.logoPosition === "center"
                          ? "items-center text-center w-full"
                          : settings.logoPosition === "right"
                            ? "items-end text-right"
                            : "items-start text-left"
                      }`}
                    >
                      {settings.enableLogo && settings.logoType !== "text" && settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt="Logo"
                          style={{ width: `${settings.logoWidth}px` }}
                          className="object-contain mb-2 max-h-16"
                        />
                      ) : settings.enableLogo && (settings.logoType === "text" || !settings.logoUrl) ? (
                        <div className="mb-1.5">
                          <div
                            style={{
                              color: settings.logoUseAccentColor !== false ? settings.documentAccentColor : "#1c1917",
                              fontSize: `${settings.logoTextFontSize || 22}px`,
                            }}
                            className="font-extrabold tracking-tight leading-tight uppercase"
                          >
                            {brandDisplayName}
                          </div>
                          {settings.logoSubtitle && (
                            <div className="text-[11px] italic text-stone-500 font-medium tracking-normal mt-0.5">
                              {settings.logoSubtitle}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{ color: settings.documentAccentColor }}
                          className="text-xl font-extrabold tracking-tight mb-1 uppercase"
                        >
                          {companyName}
                        </div>
                      )}
                      <div className="text-[11px] text-stone-500 leading-tight">
                        <div>{companyAddress}</div>
                        <div>
                          Tel: {companyPhone} • Tax ID: {companyTaxNumber}
                        </div>
                      </div>
                    </div>

                    {settings.logoPosition !== "center" && (
                      <div className="text-right">
                        <div
                          style={{ color: settings.documentAccentColor }}
                          className="text-xl font-bold tracking-wider uppercase"
                        >
                          INVOICE
                        </div>
                        <div className="text-xs font-mono font-medium text-stone-700 mt-1">
                          #INV-2026-00042
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Date: 21 Aug 2026
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-4 my-4 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                        Billed To:
                      </span>
                      <div className="font-semibold text-stone-800">Acme Corporation Ltd.</div>
                      <div className="text-stone-500 text-[11px]">45 Market Square, London</div>
                      <div className="text-stone-500 text-[11px]">VAT: GB-39482019</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                        Payment Status:
                      </span>
                      <div className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        Paid in Full
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1">Method: Credit Card</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-xs mt-3 border-collapse">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: settings.documentAccentColor,
                          color: "#ffffff",
                        }}
                        className="font-semibold text-[11px]"
                      >
                        <th className="p-2 text-left rounded-l-xs">Item Description</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-right rounded-r-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-stone-700">
                      <tr>
                        <td className="p-2">
                          <div className="font-medium text-stone-900">Organic Coffee Beans 1kg</div>
                          <div className="text-[10px] text-stone-400 font-mono">SKU: COF-001</div>
                        </td>
                        <td className="p-2 text-center">2</td>
                        <td className="p-2 text-right">{currency}14.50</td>
                        <td className="p-2 text-right font-medium">{currency}29.00</td>
                      </tr>
                      <tr>
                        <td className="p-2">
                          <div className="font-medium text-stone-900">Almond Milk 1L</div>
                          <div className="text-[10px] text-stone-400 font-mono">SKU: MLK-002</div>
                        </td>
                        <td className="p-2 text-center">4</td>
                        <td className="p-2 text-right">{currency}3.25</td>
                        <td className="p-2 text-right font-medium">{currency}13.00</td>
                      </tr>
                      <tr>
                        <td className="p-2">
                          <div className="font-medium text-stone-900">Vanilla Syrup 250ml</div>
                          <div className="text-[10px] text-stone-400 font-mono">SKU: SYR-003</div>
                        </td>
                        <td className="p-2 text-center">1</td>
                        <td className="p-2 text-right">{currency}6.80</td>
                        <td className="p-2 text-right font-medium">{currency}6.80</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals & Notes */}
                <div className="border-t pt-3 space-y-4">
                  <div className="flex justify-between items-start text-xs">
                    <div className="w-1/2 pr-4">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                        Notes & Terms:
                      </span>
                      <p className="text-[11px] text-stone-600 whitespace-pre-line leading-relaxed">
                        {settings.invoiceNotes || "Payment due within 14 days. Thank you!"}
                      </p>
                    </div>

                    <div className="w-48 space-y-1.5 text-right text-xs">
                      <div className="flex justify-between text-stone-500">
                        <span>Subtotal:</span>
                        <span>{currency}48.80</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Tax (20%):</span>
                        <span>{currency}9.76</span>
                      </div>
                      <div
                        style={{ borderColor: settings.documentAccentColor }}
                        className="flex justify-between font-bold text-sm text-stone-900 border-t pt-1.5"
                      >
                        <span>Total Due:</span>
                        <span style={{ color: settings.documentAccentColor }}>{currency}58.56</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-stone-400 border-t pt-3">
                    {companyName} • Registered in England • Thank you for your business!
                  </div>
                </div>
              </div>
            )}

            {previewMode === "receipt" && (
              /* ── 80mm THERMAL RECEIPT ──────────────────────────────────── */
              <div className="w-[320px] bg-white text-stone-950 rounded-xs shadow-2xl p-5 font-mono text-[11px] leading-relaxed relative select-none">
                {/* Diagonal Text Watermark */}
                {settings.enableWatermark && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      transform: `rotate(${settings.watermarkAngle}deg)`,
                      opacity: settings.watermarkOpacity,
                    }}
                  >
                    <span className="text-4xl font-extrabold tracking-widest text-red-600 border-2 border-red-600 px-4 py-1">
                      {settings.watermarkText || "PAID"}
                    </span>
                  </div>
                )}

                {/* Top Logo */}
                {settings.enableLogo && settings.logoType !== "text" && settings.logoUrl && (
                  <div
                    className={`flex mb-2 ${
                      settings.logoPosition === "left"
                        ? "justify-start"
                        : settings.logoPosition === "right"
                          ? "justify-end"
                          : "justify-center"
                    }`}
                  >
                    <img
                      src={settings.logoUrl}
                      alt="Receipt Logo"
                      style={{ width: `${Math.min(130, settings.logoWidth)}px` }}
                      className="max-h-12 object-contain grayscale"
                    />
                  </div>
                )}

                <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-stone-400">
                  <div className="font-bold text-sm tracking-tight uppercase">
                    {brandDisplayName}
                  </div>
                  {settings.logoSubtitle && (settings.logoType === "text" || !settings.logoUrl) && (
                    <div className="text-[10px] italic text-stone-600 font-normal">
                      {settings.logoSubtitle}
                    </div>
                  )}
                  <div className="text-[10px] text-stone-600">{companyAddress}</div>
                  <div className="text-[10px] text-stone-600">Tel: {companyPhone}</div>
                  <div className="text-[10px] text-stone-600">VAT: {companyTaxNumber}</div>
                  {settings.receiptHeaderMessage && (
                    <div className="text-[10px] font-semibold text-stone-800 mt-1 italic">
                      "{settings.receiptHeaderMessage}"
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-[10px] text-stone-600 py-1.5 border-b border-dashed border-stone-400">
                  <span>#RCP-002910</span>
                  <span>21/08/2026 14:32</span>
                </div>

                <div className="py-2 border-b border-dashed border-stone-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>2 × Espresso Roast</span>
                    <span>{currency}7.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 × Croissant Pastry</span>
                    <span>{currency}3.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 × Sparkling Water</span>
                    <span>{currency}2.20</span>
                  </div>
                </div>

                <div className="py-2 border-b border-dashed border-stone-400 space-y-1">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span>{currency}12.70</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Tax:</span>
                    <span>{currency}1.27</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 text-black">
                    <span>TOTAL:</span>
                    <span>{currency}13.97</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-600 pt-0.5">
                    <span>Card payment (VISA):</span>
                    <span>{currency}13.97</span>
                  </div>
                </div>

                {/* Footer Message */}
                <div className="text-center pt-3 space-y-1 text-[10px] text-stone-600">
                  <p className="whitespace-pre-line leading-normal font-medium">
                    {settings.receiptFooterMessage || "Thank you for visiting! Have a wonderful day."}
                  </p>
                  <div className="pt-2 flex justify-center">
                    <div className="h-8 w-40 bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,#fff_2px,#fff_4px)]" />
                  </div>
                  <div className="text-[9px] tracking-widest font-mono text-stone-500">
                    *20260821002910*
                  </div>
                </div>
              </div>
            )}

            {previewMode === "refund" && (
              /* ── REFUND VOUCHER ─────────────────────────────────────────── */
              <div className="w-[340px] bg-white text-stone-950 rounded-xs shadow-2xl p-5 font-mono text-[11px] leading-relaxed relative select-none">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <span className="text-5xl font-extrabold tracking-widest text-red-600 border-2 border-red-600 px-4 py-1 -rotate-30">
                    REFUND
                  </span>
                </div>

                <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-stone-400">
                  <div className="font-bold text-sm tracking-tight text-red-600">REFUND RECEIPT</div>
                  <div className="font-semibold text-xs uppercase">{brandDisplayName}</div>
                  {settings.logoSubtitle && (settings.logoType === "text" || !settings.logoUrl) && (
                    <div className="text-[10px] italic text-stone-600 font-normal">
                      {settings.logoSubtitle}
                    </div>
                  )}
                  <div className="text-[10px] text-stone-600">Tel: {companyPhone}</div>
                </div>

                <div className="flex justify-between text-[10px] text-stone-600 py-1.5 border-b border-dashed border-stone-400">
                  <span>#REF-2026-0008</span>
                  <span>21/08/2026 15:10</span>
                </div>

                <div className="py-2 border-b border-dashed border-stone-400 space-y-1">
                  <div className="flex justify-between text-stone-800">
                    <span>1 × Espresso Roast (Returned)</span>
                    <span className="text-red-600">−{currency}3.50</span>
                  </div>
                </div>

                <div className="py-2 border-b border-dashed border-stone-400 space-y-1 font-bold text-sm text-red-600 flex justify-between">
                  <span>TOTAL REFUNDED:</span>
                  <span>−{currency}3.50</span>
                </div>

                <div className="text-center pt-3 text-[10px] text-stone-600">
                  <p>Refund credited back to original payment method.</p>
                  <p className="mt-1">Manager signature: ________________</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
