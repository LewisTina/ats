"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import type { ParsedResume } from "@/types";
import { formatFileSize } from "@/lib/utils";

interface FileUploadCardProps {
  label?: string;
  parsedResume: ParsedResume | null;
  onParsed: (resume: ParsedResume) => void;
  onClear: () => void;
}

export function FileUploadCard({
  label = "Votre CV",
  parsedResume,
  onParsed,
  onClear,
}: FileUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
      setErrorMessage("Format non supporté. Veuillez importer un fichier PDF ou DOCX.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Le fichier dépasse 10 Mo.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'extraction");
      }

      onParsed(data.resume);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Impossible de lire le fichier."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-muted text-foreground/80">
            <FileText className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            {label}
          </h2>
        </div>
        <span className="text-[11px] text-foreground/50 font-medium">
          PDF ou DOCX (max 10 Mo)
        </span>
      </div>

      {!parsedResume ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all ${
            isDragging
              ? "border-accent bg-accent/5 scale-[0.99]"
              : "border-border hover:border-foreground/40 hover:bg-surface-muted/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
            }}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-xs font-medium text-foreground">
                Extraction du contenu en cours…
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-foreground/70 group-hover:scale-105 transition-transform">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Glissez-déposez votre CV ici, ou <span className="text-accent underline">parcourez vos fichiers</span>
                </p>
                <p className="text-[11px] text-foreground/50">
                  Traitement 100% local sur votre machine
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* File Card Info */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/40 p-3.5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {parsedResume.fileName}
                </p>
                <p className="text-[11px] text-foreground/50">
                  {formatFileSize(parsedResume.fileSizeBytes)}
                  {parsedResume.pageCount && parsedResume.pageCount > 0 && ` • ${parsedResume.pageCount} page(s)`}
                  {` • ${parsedResume.rawText.length} caractères extraits`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClear();
                setErrorMessage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="rounded-md p-1.5 text-foreground/60 hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
              title="Supprimer ce fichier"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Warnings banner if any */}
          {parsedResume.extractionWarnings.length > 0 && (
            <div className="space-y-1.5">
              {parsedResume.extractionWarnings.map((warn, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-md p-2.5 text-xs ${
                    warn.severity === "error"
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-medium">{warn.message}</p>
                    {warn.recommendation && (
                      <p className="text-[11px] opacity-90">{warn.recommendation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Collapsible Extracted Text Preview */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setIsTextExpanded(!isTextExpanded)}
              className="flex w-full items-center justify-between bg-surface-muted/30 px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-surface-muted transition-colors"
            >
              <span>Aperçu du texte extrait ({parsedResume.rawText.length} caractères)</span>
              {isTextExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {isTextExpanded && (
              <div className="max-h-60 overflow-y-auto bg-surface p-3 font-mono text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap select-text border-t border-border">
                {parsedResume.rawText || "(Aucun texte détecté)"}
              </div>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-rose-500/10 p-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

