import { useEffect, useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 2 * 1024 * 1024;

function initialsOf(name: string): string {
  return name[0]?.toUpperCase() ?? "?";
}

export function AvatarUploader({
  user,
  onUploaded,
}: {
  user: User;
  onUploaded: (next: User) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 组件卸载或上传完成后清理预览 URL，避免内存泄漏
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(file: File) {
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("仅支持 jpg / png / webp / gif 格式");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("图片不能超过 2 MB");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPickedFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
  }

  function handleClearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPickedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!pickedFile) return;
    setUploading(true);
    setError(null);
    try {
      const next = await api.uploadAvatar(pickedFile);
      handleClearPreview();
      onUploaded(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    try {
      const next = await api.removeAvatar();
      handleClearPreview();
      onUploaded(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoving(false);
    }
  }

  const previewSrc = previewUrl ?? user.avatar;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={user.username}
            className={cn(
              "h-16 w-16 rounded-2xl object-cover",
              previewUrl && "ring-2 ring-primary/60",
            )}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#56b4e9] font-mono text-2xl font-bold text-primary-foreground">
            {initialsOf(user.username)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            头像
          </div>
          <p className="text-xs text-muted-foreground">jpg / png / webp / gif，≤ 2 MB</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
        >
          <Camera className="h-4 w-4" />
          {pickedFile ? "重新选择" : "选择图片"}
        </Button>

        {pickedFile ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleUpload()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "上传中…" : "上传"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearPreview}
              disabled={uploading}
            >
              取消
            </Button>
          </>
        ) : null}

        {user.avatar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleRemove()}
            disabled={uploading || removing}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {removing ? "移除中…" : "移除头像"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
