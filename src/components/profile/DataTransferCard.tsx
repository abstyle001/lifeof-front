import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { PendingImport } from "@/lib/backupXlsx";
import type { ExportData, User } from "@/lib/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function downloadXlsx(data: ExportData) {
  // 动态加载 xlsx（约 430KB），仅在用户实际导出时拉取，避免膨胀主包
  const { buildBackupWorkbook } = await import("@/lib/backupXlsx");
  const buffer = buildBackupWorkbook(data);
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function DataTransferCard({
  onImported,
  onUserUpdated,
}: {
  /** 导入成功后刷新页面数据（累计统计 / 等级经验等）。 */
  onImported: () => void;
  /** 导入成功后用最新用户信息（等级 / 经验 / 头像）同步全局登录态。 */
  onUserUpdated: (user: User) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await api.exportData();
      await downloadXlsx(data);
      setImportNotice(
        `已导出 ${data.records.length} 条记录、${data.social.length} 条社交数据、${data.goals.length} 个目标、${data.tasks.length} 条任务`,
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }

  function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 重置 input 值，保证重复选择同一文件也能触发 change。
    event.target.value = "";
    if (!file) return;
    setImportError(null);
    setImportNotice(null);
    const reader = new FileReader();
    reader.onerror = () => setImportError("读取文件失败");
    reader.onload = async () => {
      try {
        const buffer = reader.result;
        if (!(buffer instanceof ArrayBuffer)) {
          setImportError("读取文件失败：无法解析文件内容");
          return;
        }
        const { parseBackupWorkbook } = await import("@/lib/backupXlsx");
        setPending(parseBackupWorkbook(buffer));
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "解析文件失败");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleConfirmImport() {
    if (!pending) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await api.importData(pending.payload);
      setPending(null);
      setImportNotice(
        `导入完成：记录 ${result.records} 条（同日覆盖）、社交 ${result.social} 条、目标新增 ${result.goals} 个、任务新增 ${result.tasks} 条`,
      );
      onImported();
      void api
        .me()
        .then(onUserUpdated)
        .catch(() => {
          // 全局用户信息刷新失败不影响导入本身，页面数据已刷新。
        });
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "导入失败，请稍后重试");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        数据导入 / 导出
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        将全部数据导出为 Excel（.xlsx）备份文件，或从 Excel 备份导入合并到当前账号。
        导入时同日期的记录与社交数据会被覆盖，重复的目标与任务会被跳过，不会删除任何现有数据。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? "导出中…" : "导出数据"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          导入数据
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handlePickFile}
        />
      </div>

      {importNotice ? (
        <p className="mt-3 text-sm text-[#34d399]" role="status">
          {importNotice}
        </p>
      ) : null}
      {exportError || importError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {exportError ?? importError}
        </p>
      ) : null}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent size="sm" className="left-1/2 top-1/2 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>确认导入</DialogTitle>
            <DialogDescription>
              将把 Excel 备份中的数据合并到当前账号，请确认下面的内容无误。
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="flex flex-wrap gap-2 font-mono text-sm">
              {pending && (
                <>
                  <span className="rounded-md bg-muted px-2 py-1">
                    记录 {pending.counts.records}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1">
                    社交 {pending.counts.social}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1">目标 {pending.counts.goals}</span>
                  <span className="rounded-md bg-muted px-2 py-1">任务 {pending.counts.tasks}</span>
                </>
              )}
            </div>

            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>同日期的记录与社交数据将被覆盖更新</li>
              <li>已存在的目标（按标题）与任务（按日期 + 标题）会被跳过</li>
              <li>导入不会删除账号中的任何现有数据</li>
            </ul>

            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={importing}>
              取消
            </Button>
            <Button onClick={() => void handleConfirmImport()} disabled={importing}>
              {importing ? "导入中…" : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
