"use client";

import React from "react";
import { X, Trash2, Clock, ArrowRight, FileText } from "lucide-react";
import type { SingleAnalysisResult } from "@/types";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SingleAnalysisResult[];
  onSelect: (item: SingleAnalysisResult) => void;
  onClear: () => void;
  onDeleteItem: (id: string) => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  history,
  onSelect,
  onClear,
  onDeleteItem,
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-xl transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">
              Historique des analyses locales ({history.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-rose-600 hover:underline mr-2"
              >
                Tout effacer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-foreground/50 hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border pt-2">
          {history.length === 0 ? (
            <p className="py-8 text-center text-xs text-foreground/50">
              Aucune analyse dans l'historique local pour le moment.
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 py-3 hover:bg-surface-muted/30 px-2 rounded-lg transition-colors group"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <p className="text-xs font-semibold text-foreground truncate">
                    {item.job.title || "Offre sans titre"}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-foreground/50 mt-0.5">
                    <span>{item.resume.fileName}</span>
                    <span>•</span>
                    <span>ATS: {item.atsScore.total}/100</span>
                    <span>•</span>
                    <span>Match: {item.matchingScore.total}/100</span>
                    <span>•</span>
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="flex items-center gap-1 rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background hover:opacity-90"
                  >
                    <span>Charger</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="rounded p-1 text-foreground/40 hover:text-rose-600 hover:bg-rose-500/10"
                    title="Supprimer cette entrée"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

