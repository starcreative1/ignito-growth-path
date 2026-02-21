import { useState, useEffect } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Download, Loader2, FolderOpen, File, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface StorageFile {
  bucket: string;
  name: string;
  size: number;
  url: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const StorageDownload = () => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("list-storage-files");
      if (error) throw error;
      setFiles(data.files || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = async (file: StorageFile) => {
    setDownloading(file.name);
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name.split("/").pop() || file.name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();

      for (const file of files) {
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          // Structure: bucket/filename
          zip.file(`${file.bucket}/${file.name}`, blob);
        } catch (err) {
          console.error(`Failed to fetch ${file.name}:`, err);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "storage-backup.zip";
      a.click();
      URL.revokeObjectURL(a.href);

      toast({ title: "Download complete", description: "All files saved as storage-backup.zip" });
    } catch (err: any) {
      toast({ title: "Error creating zip", description: err.message, variant: "destructive" });
    } finally {
      setZipping(false);
    }
  };

  // Group files by bucket
  const grouped = files.reduce((acc, file) => {
    if (!acc[file.bucket]) acc[file.bucket] = [];
    acc[file.bucket].push(file);
    return acc;
  }, {} as Record<string, StorageFile[]>);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Storage Files</h1>
            <p className="text-muted-foreground mt-1">
              {files.length} files across {Object.keys(grouped).length} buckets
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchFiles} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {files.length > 0 && (
              <Button onClick={downloadAll} disabled={zipping}>
                {zipping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating ZIP...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download All ({files.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No files found in storage</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([bucket, bucketFiles]) => (
              <Card key={bucket}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    {bucket}
                    <Badge variant="secondary">{bucketFiles.length} files</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {bucketFiles.map((file) => (
                      <div
                        key={`${file.bucket}-${file.name}`}
                        className="flex items-center justify-between py-3 gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(file)}
                          disabled={downloading === file.name}
                        >
                          {downloading === file.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StorageDownload;
