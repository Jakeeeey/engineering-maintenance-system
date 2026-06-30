"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Barcode,
  CalendarDays,
  Cpu,
  Package,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  FileText,
} from "lucide-react";
import { Asset } from "../types";

export function ViewEquipmentDetailsModal({
  asset,
  isOpen,
  onClose,
}: { asset: Asset | null; isOpen: boolean; onClose: () => void; }) {
  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden border-border bg-background shadow-2xl max-h-[95vh] flex flex-col">
        <DialogTitle className="sr-only">Equipment Details</DialogTitle>
        <DialogDescription className="sr-only">Detailed view of the selected equipment.</DialogDescription>
        {/* Responsive Container */}
        <div className="flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
          {/* LEFT PANEL: Asset Identity & Image */}
          <div className="w-full md:w-[40%] bg-muted/30 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r relative overflow-hidden">
            <div />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-0.5 w-10 bg-primary" />
                <span className="text-xs font-bold tracking-widest text-primary uppercase">
                  Asset Profile
                </span>
              </div>

              <div className="relative mx-auto w-full max-w-70 md:max-w-full">
                <div className="relative aspect-square rounded-xl bg-background border-2 border-muted flex items-center justify-center overflow-hidden">
                  {asset.itemImage ? (
                    <Image
                      unoptimized
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${asset.itemImage}`}
                      fill className="object-contain w-full h-full p-6"
                      alt={asset.itemName || "Equipment"}
                    />
                  ) : (
                    <Package className="h-16 w-16 text-muted" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Badge
                  variant="default"
                  className="w-fit text-xs uppercase tracking-wider px-3"
                >
                  {asset.condition || "Functional"}
                </Badge>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                  <MetricItem
                    icon={<Tag size={16} />}
                    label="Classification"
                    value={asset.itemClassification || "Unknown"}
                  />
                  <MetricItem
                    icon={<CalendarDays size={16} />}
                    label="Acquired"
                    value={asset.dateAcquired ? new Date(asset.dateAcquired).toLocaleDateString(
                      undefined,
                      { dateStyle: "medium" },
                    ) : "N/A"}
                  />
                  <MetricItem
                    icon={
                      asset.isActiveWarning === 1 ? (
                        <ShieldCheck size={16} className="text-green-500" />
                      ) : (
                        <ShieldAlert size={16} className="text-red-500" />
                      )
                    }
                    label="Security Tag"
                    value={
                      asset.isActiveWarning === 1
                        ? "Activated"
                        : "Deactivated"
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Analytics & Details */}
          <div className="w-full md:w-[60%] p-6 md:p-8 flex flex-col bg-background">
            <div className="mb-8">
              <DialogTitle className="text-2xl md:text-3xl font-bold uppercase leading-none mb-3">
                {asset.itemName}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground uppercase">
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                  <Barcode size={14} className="text-primary" />{" "}
                  {asset.barcode || "N/A"}
                </span>
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                  <Cpu size={14} className="text-primary" />{" "}
                  {asset.rfidCode || "N/A"}
                </span>
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                  <Package size={14} className="text-primary" /> SN:{" "}
                  {asset.serial || "N/A"}
                </span>
              </div>
            </div>

            <div className="space-y-6 grow">
              {/* Financial Data Grid */}
              <div className="grid grid-cols-2 gap-4">
                <DataCard
                  label="Cost per item"
                  value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(asset.costPerItem || 0)}
                />
                <DataCard label="Life Span" value={`${asset.lifeSpan || 0} Months`} />
              </div>

              <Separator className="opacity-50" />

              {/* Operational Block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4">
                <AssignmentBlock
                  icon={<User size={18} />}
                  label="Current Owner"
                  value={asset.currentOwner || "Unassigned"}
                />
              </div>

              {asset.latestRemark && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <p className="text-sm italic text-muted-foreground mb-2">
                    &quot;{asset.latestRemark}&quot;
                  </p>
                  <p className="text-xs font-semibold text-right text-primary">
                    — {asset.latestRemarkBy}
                  </p>
                </div>
              )}

              <Separator className="opacity-50" />

              <div className="flex flex-col gap-2 mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Documents</h3>
                {asset.documents && asset.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {(asset.documents as { id: string; name: string; url: string }[]).map((doc) => (
                      <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline text-sm p-2 rounded-md border bg-card/50">
                        <FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{doc.name}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No documents available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-background border border-border text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase font-bold text-muted-foreground leading-none mb-1">
          {label}
        </p>
        <p className="text-xs font-medium truncate">{value || "---"}</p>
      </div>
    </div>
  );
}

function DataCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-xl border bg-card/50 shadow-sm">
      <p className="text-xs uppercase font-bold text-muted-foreground/70 mb-2">
        {label}
      </p>
      <p className="text-base md:text-lg font-bold truncate">{value}</p>
    </div>
  );
}

function AssignmentBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground truncate">
        {value || "Unassigned"}
      </p>
    </div>
  );
}
