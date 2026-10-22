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
  FolderOpen,
  Save,
  HardDrive,
  Unlink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Laptop,
} from 'lucide-react';
import { KeihiPocketData } from '@/types';
import { formatYen, MAX_RETENTION_MONTHS } from '@/lib/calculations';
import { useStore } from '@/lib/store';

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
  const {
    isFSSupported,
    activeFileName,
    filePermissionState,
    fileSaveStatus,
    lastFileSaveTime,
    openFile,
    saveFileAs,
    saveToFile,
    grantFilePermission,
    disconnectFile,
  } = useStore();

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

  const handleOpenFile = async () => {
    setMessage(null);
    const success = await openFile();
    if (success) {
      setMessage({
        type: 'success',
        text: 'PC上のファイルを開き、自動同期を開始しました。',
      });
      setTimeout(() => setJsonText(exportJson()), 100);
    }
  };

  const handleSaveFileAs = async () => {
    setMessage(null);
    const success = await saveFileAs('data.json');
    if (success) {
      setMessage({
        type: 'success',
        text: 'PC上にファイルを保存し、自動同期を開始しました。',
      });
    }
  };

  const handleSaveToFile = async () => {
    setMessage(null);
    const success = await saveToFile();
    if (success) {
      setMessage({
        type: 'success',
        text: 'PC上のファイルへ最新データを上書き保存しました。',
      });
    } else {
      setMessage({
        type: 'error',
        text: 'ファイルへの上書き保存に失敗しました。',
      });
    }
  };

  const handleGrantPermission = async () => {
    setMessage(null);
    const success = await grantFilePermission();
    if (success) {
      setMessage({
        type: 'success',
        text: 'ファイルのアクセス権限を許可し、同期を再開しました。',
      });
      setTimeout(() => setJsonText(exportJson()), 100);
    } else {
      setMessage({
        type: 'error',
        text: 'ファイルのアクセス権限が許可されませんでした。',
      });
    }
  };

  const handleDisconnect = async () => {
    await disconnectFile();
    setMessage({
      type: 'success',
      text: 'PCファイルとの連携を解除しました（ブラウザのIndexedDB自動保存は継続されます）。',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#faf8f5] rounded-2xl shadow-xl border border-stone-200/90 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50/90 to-emerald-50/60 border-b border-stone-200/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-700">
              データ管理・PCファイル保存設定
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

          {/* PC Local File Integration (File System Access API + IndexedDB) */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                    PCファイル直接保存・2重自動保存構成
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    IndexedDB（ブラウザ内自動バックアップ） ＋ File System Access API（PC本体ファイル直接上書き）
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {isFSSupported ? (
                  activeFileName ? (
                    filePermissionState === 'granted' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ファイル自動同期中
                      </span>
                    ) : filePermissionState === 'prompt' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        権限再許可待ち
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        権限拒否
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-slate-600 border border-stone-200">
                      ファイル未連携（IndexedDBのみ保存中）
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    API未対応ブラウザ（IndexedDBのみ利用可）
                  </span>
                )}
              </div>
            </div>

            {/* Storage Architecture Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-900 text-[11px]">
                  <Database className="w-3.5 h-3.5 text-teal-600" />
                  <span>構成1: IndexedDB 自動保存</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  操作のたびにブラウザ内データベースへミリ秒単位で自動保存。localStorageの容量制限（5MB）やキャッシュ消去の影響を受けにくい堅牢なバックアップです。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 text-[11px]">
                  <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                  <span>構成2: PC実ファイル直接上書き</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  PC内のファイル（<code className="text-sky-800 font-mono">data.json</code>）と直接接続。次回サイトを開いた際もファイルハンドルをIndexedDBから再認識し、自動で同期再開できます。
                </p>
              </div>
            </div>

            {/* Active File Details & Actions */}
            {isFSSupported ? (
              <div className="pt-2 border-t border-stone-100 space-y-3">
                {activeFileName ? (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">連携中ファイル: </span>
                        <strong className="text-slate-800 font-mono text-sm ml-1">
                          {activeFileName}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {lastFileSaveTime && (
                          <span>
                            最終保存: {lastFileSaveTime.toLocaleTimeString('ja-JP')}
                          </span>
                        )}
                        <span className="ml-2 font-semibold text-emerald-700">
                          {fileSaveStatus === 'saving'
                            ? '書き込み中...'
                            : fileSaveStatus === 'saved'
                            ? '最新同期完了'
                            : fileSaveStatus === 'error'
                            ? '書き込みエラー'
                            : '待機中'}
                        </span>
                      </div>
                    </div>

                    {filePermissionState === 'prompt' && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2 flex-wrap">
                        <span>
                          ⚠️ ブラウザのセキュリティ仕様により、前回のファイル（{activeFileName}）に書き込むための権限再許可が必要です。
                        </span>
                        <button
                          type="button"
                          onClick={handleGrantPermission}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition shadow-2xs"
                        >
                          権限を再許可して最新同期
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveToFile}
                        disabled={filePermissionState !== 'granted'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600/90 hover:bg-teal-600 text-white transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>今すぐファイルへ上書き保存</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenFile}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-stone-100 text-slate-700 border border-stone-200 transition"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>別のファイルを開く</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveFileAs}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-stone-100 text-slate-700 border border-stone-200 transition"
                      >
                        <Save className="w-3.5 h-3.5 text-slate-500" />
                        <span>別名でPCに保存</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200/70 transition ml-auto"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>連携を解除</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenFile}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600/90 hover:bg-teal-600 text-white shadow-2xs transition"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>PC上のJSONファイルを開く (data.json)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveFileAs}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-stone-50 text-slate-700 border border-stone-200 shadow-2xs transition"
                    >
                      <Save className="w-4 h-4 text-slate-500" />
                      <span>PCに新規ファイルとして保存</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                お使いのブラウザはFile System Access APIに対応していません（Google Chrome, Microsoft Edge, Opera等のChromium系ブラウザでPCファイルの直接保存・自動上書きが利用できます）。現在はIndexedDBによる大容量自動保存と、以下の手動ダウンロード・インポート機能をご利用いただけます。
              </div>
            )}
          </div>

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
              データの肥大化を防ぐため、直近{MAX_RETENTION_MONTHS}ヶ月間（{minRetainedCycleId}月度以降）のサイクルと明細のみを保持し、それ以前の古いデータは自動的に整理されます（※整理された月の貯金確定額はアーカイブ合算され、累計貯金総額は失われません）。
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
