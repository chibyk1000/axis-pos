"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Printer,
  Save,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Tag,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/ui/app-select";
import { Slider } from "@/components/ui/slider";
import { RefreshButton } from "@/components/ui/refresh-button";
import { useNavigate, useLocation } from "react-router";
import { useProducts } from "@/hooks/controllers/products";
import { useDefaultCompany } from "@/hooks/controllers/company";
import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir, join } from "@tauri-apps/api/path";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import jsPDF from "jspdf";
import { toast } from "react-toastify";

interface PriceTagProduct {
  id: string;
  title: string;
  code: string | null;
  price: number;
  cost?: number;
  barcode?: string | null;
  taxRate?: number;
  copies: number;
}

export default function PriceTagsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProductId = location.state?.productId;

  const { data: rawProducts = [], isLoading: loadingProducts, refetch } = useProducts();
  const { data: companyData } = useDefaultCompany();
  const currencySymbol = (companyData as any)?.currency ?? "$";

  // Label geometry settings (in mm)
  const [labelWidth, setLabelWidth] = useState<number>(50);
  const [labelHeight, setLabelHeight] = useState<number>(30);
  const [rowSpacing, setRowSpacing] = useState<number>(2);
  const [colSpacing, setColSpacing] = useState<number>(2);
  const [paperFormat, setPaperFormat] = useState<string>("a4");

  // Display toggles
  const [showName, setShowName] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);
  const [showTaxInclusive, setShowTaxInclusive] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [barcodeType, setBarcodeType] = useState<string>("code128");

  // Font and sizing sliders
  const [nameSize, setNameSize] = useState<number>(13); // px
  const [priceSize, setPriceSize] = useState<number>(20); // px
  const [barcodeHeight, setBarcodeHeight] = useState<number>(36); // px

  // Product selection and copies
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialProductId ? [initialProductId] : [],
  );
  const [globalCopies, setGlobalCopies] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100); // percentage

  // Selected products with individual copies
  const activeProducts: PriceTagProduct[] = useMemo(() => {
    let list = rawProducts;
    if (selectedProductIds.length > 0) {
      list = rawProducts.filter((p) => selectedProductIds.includes(p.id));
    }
    return list.map((p) => {
      const defaultPriceRow = p.prices?.find((pr: any) => pr.isDefault) ?? p.prices?.[0];
      const salePrice = defaultPriceRow?.salePrice ?? 0;
      const cost = defaultPriceRow?.cost ?? 0;
      const barcodeValue = p.barcodes?.[0]?.value ?? p.code ?? "123456789";
      const taxRate = p.taxes?.[0]?.tax?.rate ?? 0;

      return {
        id: p.id,
        title: p.title || "Unnamed product",
        code: p.code || "N/A",
        price: salePrice,
        cost,
        barcode: barcodeValue,
        taxRate,
        copies: globalCopies,
      };
    });
  }, [rawProducts, selectedProductIds, globalCopies]);

  // Expanded list of all individual price tag items to render based on copies
  const allTagItems = useMemo(() => {
    const items: PriceTagProduct[] = [];
    for (const prod of activeProducts) {
      for (let i = 0; i < Math.max(1, prod.copies); i++) {
        items.push(prod);
      }
    }
    return items;
  }, [activeProducts]);

  // Product options for select
  const productOptions = useMemo(() => {
    return rawProducts.map((p) => {
      const price = p.prices?.[0]?.salePrice ?? 0;
      return {
        value: p.id,
        label: `${p.title} (${p.code ? `SKU: ${p.code} - ` : ""}${currencySymbol}${price.toFixed(2)})`,
      };
    });
  }, [rawProducts, currencySymbol]);

  // Generate jsPDF document
  const generatePdf = (): jsPDF => {
    const isA4 = paperFormat === "a4";
    const isLetter = paperFormat === "letter";
    const isRoll = paperFormat === "roll";

    const pageWidth = isRoll ? labelWidth + 4 : isA4 ? 210 : isLetter ? 215.9 : 210;
    const pageHeight = isRoll ? labelHeight + 4 : isA4 ? 297 : isLetter ? 279.4 : 297;

    const pdf = new jsPDF({
      orientation: isRoll ? "landscape" : "portrait",
      unit: "mm",
      format: isRoll ? [labelHeight + 4, labelWidth + 4] : isA4 ? "a4" : "letter",
    });

    const marginX = isRoll ? 2 : 10;
    const marginY = isRoll ? 2 : 10;

    let currentX = marginX;
    let currentY = marginY;

    allTagItems.forEach((tag, idx) => {
      // Check page overflow for sheet paper
      if (!isRoll && currentY + labelHeight > pageHeight - marginY) {
        pdf.addPage();
        currentX = marginX;
        currentY = marginY;
      } else if (isRoll && idx > 0) {
        pdf.addPage([labelHeight + 4, labelWidth + 4], "landscape");
        currentX = marginX;
        currentY = marginY;
      }

      // Draw tag box / border
      if (showBorders) {
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        pdf.rect(currentX, currentY, labelWidth, labelHeight);
      }

      let textY = currentY + 4;

      // Product Title
      if (showName) {
        pdf.setFontSize(Math.max(6, Math.round(nameSize * 0.55)));
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(20, 20, 20);
        const splitTitle = pdf.splitTextToSize(tag.title, labelWidth - 4);
        pdf.text(splitTitle.slice(0, 2), currentX + labelWidth / 2, textY, { align: "center" });
        textY += splitTitle.slice(0, 2).length * 3.5 + 1;
      }

      // Price
      if (showPrice) {
        pdf.setFontSize(Math.max(8, Math.round(priceSize * 0.55)));
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        const priceStr = `${currencySymbol}${tag.price.toFixed(2)}`;
        pdf.text(priceStr, currentX + labelWidth / 2, textY + 2, { align: "center" });
        textY += 5.5;

        if (showTaxInclusive) {
          pdf.setFontSize(5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.text("Inc. Tax", currentX + labelWidth / 2, textY, { align: "center" });
          textY += 2.5;
        }
      }

      // SKU
      if (showSku && tag.code) {
        pdf.setFontSize(6);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        pdf.text(`SKU: ${tag.code}`, currentX + 3, currentY + labelHeight - 2);
      }

      // Barcode bars representation
      if (showBarcode) {
        const barcodeWidth = labelWidth - 10;
        const bY = currentY + labelHeight - (showSku ? 7 : 5);
        const bH = Math.min(10, Math.max(3, barcodeHeight * 0.15));

        pdf.setDrawColor(0, 0, 0);
        pdf.setFillColor(0, 0, 0);

        // Draw visual barcode bar pattern
        const barCount = 28;
        const barStep = barcodeWidth / barCount;
        const startBx = currentX + (labelWidth - barcodeWidth) / 2;

        for (let b = 0; b < barCount; b++) {
          const isThick = b % 3 === 0 || b % 7 === 0;
          const w = isThick ? barStep * 0.6 : barStep * 0.3;
          if (b % 5 !== 1) {
            pdf.rect(startBx + b * barStep, bY - bH, w, bH, "F");
          }
        }

        // Barcode number
        pdf.setFontSize(5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        const codeText = tag.barcode || tag.code || "";
        pdf.text(codeText, currentX + labelWidth / 2, bY + 1.8, { align: "center" });
      }

      // Move to next column or row
      if (!isRoll) {
        currentX += labelWidth + colSpacing;
        if (currentX + labelWidth > pageWidth - marginX) {
          currentX = marginX;
          currentY += labelHeight + rowSpacing;
        }
      }
    });

    return pdf;
  };

  // Print via Tauri
  const handlePrint = async () => {
    if (allTagItems.length === 0) {
      toast.warning("No products selected to print");
      return;
    }
    try {
      const pdf = generatePdf();
      const filename = `price-tags-${Date.now()}.pdf`;
      const bytes = new Uint8Array(pdf.output("arraybuffer"));
      await writeFile(filename, bytes, { baseDir: BaseDirectory.Temp });
      const tmp = await tempDir();
      const filePath = await join(tmp, filename);
      await openPath(filePath);
      toast.success("Price tags opened for printing");
    } catch (err) {
      console.error("Print price tags failed:", err);
      toast.error("Failed to print price tags");
    }
  };

  // Save PDF Dialog
  const handleSavePdf = async () => {
    if (allTagItems.length === 0) {
      toast.warning("No products selected to save");
      return;
    }
    try {
      const filePath = await saveDialog({
        defaultPath: `price-tags-${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: "PDF Document", extensions: ["pdf"] }],
      });
      if (!filePath) return;
      const pdf = generatePdf();
      const bytes = new Uint8Array(pdf.output("arraybuffer"));
      await writeFile(filePath, bytes);
      toast.success("Price tags PDF saved successfully");
    } catch (err) {
      console.error("Save PDF failed:", err);
      toast.error("Failed to save PDF");
    }
  };

  return (
    <div className="h-screen w-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 shrink-0">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate(-1)} className="hover:bg-stone-200 dark:hover:bg-stone-800">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" />
            <h1 className="text-sm font-semibold">Price tags generator</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={() => refetch()} isLoading={loadingProducts} title="Refresh products" />
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Print ({allTagItems.length})
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT CONFIGURATION PANEL */}
        <aside className="w-84 shrink-0 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 p-4 overflow-y-auto space-y-6 text-xs select-none">
          {/* Paper & Dimensions */}
          <Section title="Format & Dimensions">
            <div className="space-y-2">
              <label className="text-stone-500 dark:text-stone-400 block text-[11px]">Paper layout</label>
              <AppSelect
                value={paperFormat}
                onChange={(val) => setPaperFormat(val)}
                size="sm"
                options={[
                  { value: "a4", label: "A4 Sheet (210 × 297 mm)" },
                  { value: "letter", label: "US Letter (215.9 × 279.4 mm)" },
                  { value: "roll", label: "Continuous Roll / Single Label" },
                ]}
                isSearchable={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-stone-500 dark:text-stone-400 block text-[11px] mb-1">Tag width (mm)</label>
                <Input
                  type="number"
                  min="20"
                  max="200"
                  value={labelWidth}
                  onChange={(e) => setLabelWidth(Number(e.target.value) || 20)}
                  className="h-8 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                />
              </div>
              <div>
                <label className="text-stone-500 dark:text-stone-400 block text-[11px] mb-1">Tag height (mm)</label>
                <Input
                  type="number"
                  min="15"
                  max="200"
                  value={labelHeight}
                  onChange={(e) => setLabelHeight(Number(e.target.value) || 15)}
                  className="h-8 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                />
              </div>
            </div>

            {paperFormat !== "roll" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-stone-500 dark:text-stone-400 block text-[11px] mb-1">Row gap (mm)</label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={rowSpacing}
                    onChange={(e) => setRowSpacing(Number(e.target.value) || 0)}
                    className="h-8 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                  />
                </div>
                <div>
                  <label className="text-stone-500 dark:text-stone-400 block text-[11px] mb-1">Col gap (mm)</label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={colSpacing}
                    onChange={(e) => setColSpacing(Number(e.target.value) || 0)}
                    className="h-8 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Display Elements */}
          <Section title="Display Elements">
            <div className="space-y-2.5">
              <Toggle label="Product name" checked={showName} onChange={setShowName} />
              <Toggle label="Code (SKU)" checked={showSku} onChange={setShowSku} />
              <Toggle label="Price" checked={showPrice} onChange={setShowPrice} />
              <Toggle label="Tax inclusive note" checked={showTaxInclusive} onChange={setShowTaxInclusive} />
              <Toggle label="Barcode bars" checked={showBarcode} onChange={setShowBarcode} />
              <Toggle label="Label borders" checked={showBorders} onChange={setShowBorders} />
            </div>
          </Section>

          {/* Barcode settings */}
          <Section title="Barcode Standard">
            <AppSelect
              value={barcodeType}
              onChange={(val) => setBarcodeType(val)}
              size="sm"
              options={[
                { value: "code128", label: "CODE 128 (Standard)" },
                { value: "ean13", label: "EAN 13 (Retail)" },
                { value: "upca", label: "UPC-A (North America)" },
              ]}
              isSearchable={false}
            />
          </Section>

          {/* Sizing Sliders */}
          <Section title="Element Sizing">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                  <span>Product name size</span>
                  <span className="font-mono">{nameSize}px</span>
                </div>
                <Slider
                  min={8}
                  max={24}
                  step={1}
                  value={[nameSize]}
                  onValueChange={(v) => setNameSize(v[0])}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                  <span>Price size</span>
                  <span className="font-mono">{priceSize}px</span>
                </div>
                <Slider
                  min={12}
                  max={36}
                  step={1}
                  value={[priceSize]}
                  onValueChange={(v) => setPriceSize(v[0])}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                  <span>Barcode height</span>
                  <span className="font-mono">{barcodeHeight}px</span>
                </div>
                <Slider
                  min={18}
                  max={60}
                  step={2}
                  value={[barcodeHeight]}
                  onValueChange={(v) => setBarcodeHeight(v[0])}
                />
              </div>
            </div>
          </Section>

          {/* Products Filter & Copies */}
          <Section title="Products Selection">
            <div className="space-y-2">
              <label className="text-stone-500 dark:text-stone-400 block text-[11px]">
                {selectedProductIds.length === 0
                  ? `All products selected (${rawProducts.length})`
                  : `${selectedProductIds.length} specific product(s) selected`}
              </label>
              <AppSelect
                isMulti
                placeholder="Choose specific products..."
                options={productOptions}
                value={selectedProductIds}
                onChange={(ids: string[]) => setSelectedProductIds(ids || [])}
                size="sm"
              />

              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="text-stone-500 hover:text-amber-500 text-[11px] p-0 h-auto underline cursor-pointer"
                >
                  Clear filter (Select all {rawProducts.length} products)
                </button>
              )}
            </div>

            {/* Global Copies */}
            <div className="pt-2">
              <label className="text-stone-500 dark:text-stone-400 block text-[11px] mb-1">
                Number of copies per product
              </label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setGlobalCopies((c) => Math.max(1, c - 1))}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={globalCopies}
                  onChange={(e) => setGlobalCopies(Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 text-center font-semibold bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setGlobalCopies((c) => c + 1)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Section>

          {/* Quick Actions */}
          <div className="pt-2 space-y-2">
            <Button onClick={handlePrint} className="w-full bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold">
              <Printer className="w-4 h-4 mr-2" />
              Print tags ({allTagItems.length})
            </Button>
            <Button onClick={handleSavePdf} variant="outline" className="w-full border-stone-300 dark:border-stone-700">
              <FileDown className="w-4 h-4 mr-2" />
              Save PDF
            </Button>
          </div>
        </aside>

        {/* RIGHT PREVIEW CANVAS */}
        <main className="flex-1 bg-stone-950/90 flex flex-col overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-stone-800 bg-stone-900/80 shrink-0">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handlePrint} title="Print" className="h-8 gap-1.5 text-xs text-stone-300 hover:text-white">
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSavePdf} title="Save PDF" className="h-8 gap-1.5 text-xs text-stone-300 hover:text-white">
                <Save className="w-3.5 h-3.5" /> Save PDF
              </Button>
              <div className="h-4 w-px bg-stone-700 mx-1" />
              <span className="text-xs text-stone-400">
                Total Tags: <span className="font-semibold text-amber-400">{allTagItems.length}</span>
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(40, z - 15))}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="w-10 text-center font-mono">{zoom}%</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(200, z + 15))}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 border-stone-700 text-stone-400 hover:text-white ml-1"
                onClick={() => setZoom(100)}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Interactive Sheet & Tag Viewport */}
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
            {allTagItems.length === 0 ? (
              <div className="m-auto text-center text-stone-500 py-16 space-y-3">
                <Tag className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm font-medium">No products found for price tags</p>
                <p className="text-xs text-stone-600">Create products or adjust filters on the left panel.</p>
              </div>
            ) : (
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                  transition: "transform 0.15s ease-out",
                }}
                className="bg-white text-black p-6 rounded-xs shadow-2xl min-w-[320px] max-w-[950px]"
              >
                <div
                  className="flex flex-wrap"
                  style={{
                    gap: `${rowSpacing * 2.5}px ${colSpacing * 2.5}px`,
                  }}
                >
                  {allTagItems.map((tag, idx) => (
                    <div
                      key={`${tag.id}-${idx}`}
                      style={{
                        width: `${labelWidth * 3.78}px`,
                        minHeight: `${labelHeight * 3.78}px`,
                        height: `${labelHeight * 3.78}px`,
                      }}
                      className={`relative flex flex-col justify-between p-2.5 bg-white select-none ${
                        showBorders ? "border border-stone-300" : ""
                      }`}
                    >
                      {/* Product title */}
                      {showName && (
                        <div
                          style={{ fontSize: `${nameSize}px` }}
                          className="font-bold text-center leading-tight line-clamp-2 text-stone-900"
                        >
                          {tag.title}
                        </div>
                      )}

                      {/* Main Price */}
                      {showPrice && (
                        <div className="text-center my-auto">
                          <div
                            style={{ fontSize: `${priceSize}px` }}
                            className="font-extrabold tracking-tight text-stone-950 leading-none"
                          >
                            {currencySymbol}
                            {tag.price.toFixed(2)}
                          </div>
                          {showTaxInclusive && (
                            <div className="text-[9px] text-stone-500 font-medium mt-0.5 uppercase tracking-wider">
                              Tax Inclusive
                            </div>
                          )}
                        </div>
                      )}

                      {/* Barcode & SKU */}
                      <div className="mt-auto space-y-1">
                        {showBarcode && (
                          <div className="flex flex-col items-center justify-center">
                            {/* Realistic Barcode Lines */}
                            <div
                              style={{ height: `${barcodeHeight}px` }}
                              className="w-full max-w-[85%] flex items-stretch justify-between overflow-hidden px-1"
                            >
                              {Array.from({ length: 34 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-full ${
                                    i % 4 === 0
                                      ? "w-1 bg-black"
                                      : i % 2 === 0
                                        ? "w-0.5 bg-black"
                                        : "w-0.5 bg-transparent"
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="text-[9px] font-mono tracking-widest text-stone-700 mt-0.5">
                              {tag.barcode || tag.code || "123456789"}
                            </div>
                          </div>
                        )}

                        {showSku && tag.code && (
                          <div className="text-[9px] font-semibold text-stone-600 text-left">
                            SKU: {tag.code}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- Sub-Components ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-700 dark:text-stone-300">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
