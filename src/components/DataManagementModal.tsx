'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { KeihiPocketData } from '@/types';
import { formatYen, MAX_RETENTION_MONTHS } from '@/lib/calculations';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: KeihiPocketData;
  minRetainedCycleId: string;
  exportJson: () => string;
  importJson: (jsonStr: string) => { success: boolean; error?: string };
  onClearAllTransactions: () => void;
  onRestoreSampleData: () => void;
}

export function DataManagementModal({
  isOpen,
  onClose,
  data,
  minRetainedCycleId,
  exportJson,
  importJson,
  onClearAllTransactions,
  onRestoreSampleData,
}: DataManagementModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setJsonText(exportJson());
      setMessage(null);
    }
  }, [isOpen, exportJson]);

  if (!isOpen) return null;

  const storageByteSize = new Blob([jsonText]).size;
  const storageKB = (storageByteSize / 1024).toFixed(2);
  const retainedCycles = data.monthlyCycles.map((c) => c.cycleId);
  const archivedSavings = data.settings.archivedSavingsTotal || 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keihi-pocket-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const res = importJson(jsonText);
    if (res.success) {
      setMessage({
        type: 'success',
        text: `JSONデータを正常にインポートしました（${MAX_RETENTION_MONTHS}ヶ月経過データは自動整理されます）`,
      });
    } else {
      setMessage({
        type: 'error',
        text: res.error || 'インポートに失敗しました。',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#faf8f5] rounded-2xl shadow-xl border border-stone-200/90 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50/90 to-emerald-50/60 border-b border-stone-200/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-700">
              データ管理・{MAX_RETENTION_MONTHS}ヶ月保持ポリシー
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* 12-Month Retention Policy Status Box */}
          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/70 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>
                  自動容量保護: 最大{MAX_RETENTION_MONTHS}ヶ月間保持（それ以前の古いデータは自動削除）
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white text-teal-800 border border-teal-200/70">
                現在の使用容量: {storageKB} KB
              </span>
            </div>
            <p className="text-xs text-slate-600">
              ローカルストレージの肥大化を防ぐため、直近{MAX_RETENTION_MONTHS}ヶ月間（{minRetainedCycleId}月度以降）のサイクルと明細のみを保持し、それ以前の古いデータは自動的に削除されます（※自動削除された月の貯金確定額はアーカイブ合算され、累計貯金総額は失われません）。
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
              <span>
                保持中サイクル ({retainedCycles.length}/{MAX_RETENTION_MONTHS}ヶ月):{' '}
                <strong className="text-teal-800">
                  {retainedCycles.join(', ') || 'なし'}
                </strong>
              </span>
              {archivedSavings > 0 && (
                <span>
                  アーカイブ保護済み過去貯金:{' '}
                  <strong className="text-amber-700">
                    {formatYen(archivedSavings)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-bold border ${
                message.type === 'success'
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-600">
              現在のアプリケーション状態（JSONデータ構造）
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-slate-600 border border-stone-200 text-xs font-semibold transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-600" />
                    <span>コピー完了</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>JSONをコピー</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600/90 hover:bg-teal-600 text-white text-xs font-bold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON保存</span>
              </button>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={10}
            className="w-full p-3 rounded-xl border border-stone-200 font-mono text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onRestoreSampleData();
                  setTimeout(() => setJsonText(exportJson()), 50);
                  setMessage({
                    type: 'success',
                    text: 'サンプルデータを復元しました',
                  });
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-slate-600 border border-stone-200 text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>初期サンプルデータを復元</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClearAllTransactions();
                  setTimeout(() => setJsonText(exportJson()), 50);
                  setMessage({
                    type: 'success',
                    text: '明細をすべてクリアし、初期予算状態にリセットしました。',
                  });
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-600 border border-rose-200/80 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>明細を0件にリセット</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600/90 hover:bg-teal-600 text-white text-xs font-bold transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>編集したJSONをインポート反映</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
