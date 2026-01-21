// =====================================================
// COMPONENTE: GERENCIADOR DE DOCUMENTOS DO CASO
// Upload drag-drop, filtros, reprocessamento, classificação
// =====================================================

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  Image,
  FileType,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Cpu,
  Database,
  RefreshCw,
  Trash2,
  Eye,
  MoreVertical,
  Filter,
  Search,
  FolderUp,
  Clock,
  Percent,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  tipo: string;
  file_name?: string;
  arquivo_url: string | null;
  storage_path?: string;
  uploaded_em: string;
  status?: string;
  page_count?: number;
  ocr_confidence?: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

interface DocumentsManagerProps {
  caseId: string;
  documents: Document[];
  onDocumentsChange: () => void;
}

const docTypeOptions = [
  { value: "holerite", label: "Holerite", icon: "💰" },
  { value: "ctps", label: "CTPS", icon: "📘" },
  { value: "contrato", label: "Contrato", icon: "📄" },
  { value: "cct", label: "Convenção Coletiva", icon: "📋" },
  { value: "ponto", label: "Cartão de Ponto", icon: "⏰" },
  { value: "fgts", label: "Extrato FGTS", icon: "🏦" },
  { value: "peticao", label: "Petição", icon: "⚖️" },
  { value: "sentenca", label: "Sentença", icon: "📜" },
  { value: "trct", label: "TRCT", icon: "📝" },
  { value: "outro", label: "Outro", icon: "📎" },
];

const statusConfig: Record<string, { label: string; icon: typeof Loader2; color: string; bgColor: string }> = {
  uploaded: { label: "Enviado", icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" },
  ocr_pending: { label: "Aguardando OCR", icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  ocr_running: { label: "OCR em andamento", icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100" },
  ocr_done: { label: "OCR concluído", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  chunk_pending: { label: "Aguardando indexação", icon: Database, color: "text-purple-600", bgColor: "bg-purple-100" },
  embedded: { label: "Indexado", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  embedded_partial: { label: "Parcialmente indexado", icon: AlertTriangle, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  failed: { label: "Erro", icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
  processing: { label: "Processando", icon: Loader2, color: "text-blue-600", bgColor: "bg-blue-100" },
  completed: { label: "Concluído", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
};

export function DocumentsManager({ 
  caseId, 
  documents, 
  onDocumentsChange 
}: DocumentsManagerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("outro");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    if (filterType !== "all" && doc.tipo !== filterType) return false;
    if (filterStatus !== "all" && (doc.status || "uploaded") !== filterStatus) return false;
    if (searchQuery && !doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);

  // Upload de arquivos
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!caseId || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("Usuário não autenticado");
      }

      const userId = session.session.user.id;
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        
        // Validar tipo de arquivo
        const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx'];
        if (!validExtensions.includes(fileExt || '')) {
          toast.error(`Tipo não suportado: ${file.name}`);
          continue;
        }

        // Caminho no storage: user_id/case_id/timestamp_filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${userId}/${caseId}/${timestamp}_${sanitizedName}`;

        // Upload para Storage privado
        const { error: uploadError } = await supabase.storage
          .from("juriscalculo-documents")
          .upload(storagePath, file, { contentType: file.type });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Erro no upload: ${file.name}`);
          continue;
        }

        // Criar registro do documento
        const { error: dbError } = await supabase
          .from("documents")
          .insert([{
            case_id: caseId,
            owner_user_id: userId,
            file_name: file.name,
            mime_type: file.type,
            storage_path: storagePath,
            tipo: selectedType as any,
            status: "uploaded",
            metadata: {
              original_name: file.name,
              size: file.size,
              uploaded_at: new Date().toISOString(),
            },
          }]);

        if (dbError) {
          console.error("DB error:", dbError);
          // Tentar deletar o arquivo do storage
          await supabase.storage.from("juriscalculo-documents").remove([storagePath]);
          toast.error(`Erro ao salvar: ${file.name}`);
          continue;
        }

        successCount++;
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (successCount > 0) {
        onDocumentsChange();
        toast.success(`${successCount} documento(s) enviado(s)! Clique em "Processar" para OCR e indexação.`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar documento: " + (error as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [caseId, selectedType, onDocumentsChange]);

  // Processar documento (pipeline completo)
  const processDocument = useCallback(async (documentId: string) => {
    setProcessingDocId(documentId);
    toast.info("Iniciando processamento: OCR → Chunking → Embeddings...");

    try {
      // Chamar edge function process-document
      const { data, error } = await supabase.functions.invoke("process-document", {
        body: { document_id: documentId },
      });

      if (error) throw error;

      toast.success(`Documento processado: ${data.chunks_created || 0} chunks criados`);
      onDocumentsChange();
    } catch (err) {
      console.error("Processing error:", err);
      toast.error("Erro no processamento: " + (err as Error).message);
    } finally {
      setProcessingDocId(null);
    }
  }, [onDocumentsChange]);

  // Processar todos os pendentes
  const processAllPending = useCallback(async () => {
    const pendingDocs = documents.filter(d => 
      !d.status || d.status === "uploaded" || d.status === "failed"
    );

    if (pendingDocs.length === 0) {
      toast.info("Nenhum documento pendente para processar.");
      return;
    }

    toast.info(`Processando ${pendingDocs.length} documento(s)...`);

    for (const doc of pendingDocs) {
      await processDocument(doc.id);
    }

    toast.success("Processamento concluído!");
  }, [documents, processDocument]);

  // Atualizar tipo de documento
  const updateDocType = useCallback(async (documentId: string, newType: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({ tipo: newType as any })
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Tipo atualizado");
      onDocumentsChange();
    } catch (err) {
      toast.error("Erro ao atualizar tipo");
    }
  }, [onDocumentsChange]);

  // Excluir documento
  const deleteDocument = useCallback(async (documentId: string, storagePath?: string) => {
    try {
      // Excluir chunks primeiro
      await supabase.from("document_chunks").delete().eq("document_id", documentId);
      await supabase.from("doc_chunks").delete().eq("document_id", documentId);

      // Excluir documento
      const { error } = await supabase.from("documents").delete().eq("id", documentId);
      if (error) throw error;

      // Tentar excluir do storage
      if (storagePath) {
        await supabase.storage.from("juriscalculo-documents").remove([storagePath]);
      }

      toast.success("Documento excluído");
      onDocumentsChange();
    } catch (err) {
      toast.error("Erro ao excluir: " + (err as Error).message);
    }
  }, [onDocumentsChange]);

  // Estatísticas
  const stats = {
    total: documents.length,
    pending: documents.filter(d => !d.status || d.status === "uploaded").length,
    processing: documents.filter(d => d.status === "ocr_running" || d.status === "processing").length,
    indexed: documents.filter(d => d.status === "embedded" || d.status === "completed").length,
    failed: documents.filter(d => d.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone com Drag & Drop */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className={`p-4 rounded-full ${isDragging ? "bg-primary/20" : "bg-muted"}`}>
              <FolderUp className={`h-10 w-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isDragging ? "Solte os arquivos aqui" : "Arraste documentos ou clique para selecionar"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, DOCX, JPG, PNG, WEBP • Máx. 50MB por arquivo
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {docTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivos
              </Button>
            </div>
          </div>
          
          {isUploading && (
            <div className="mt-6 space-y-2 max-w-md mx-auto">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Enviando... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas e Filtros */}
      {documents.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Stats Cards */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.total}</span>
              <span className="text-muted-foreground text-sm">total</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{stats.pending}</span>
                <span className="text-sm">pendentes</span>
              </div>
            )}
            {stats.indexed > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{stats.indexed}</span>
                <span className="text-sm">indexados</span>
              </div>
            )}
            {stats.failed > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">{stats.failed}</span>
                <span className="text-sm">erros</span>
              </div>
            )}
          </div>

          {/* Actions & Filters */}
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {docTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="uploaded">Enviado</SelectItem>
                <SelectItem value="embedded">Indexado</SelectItem>
                <SelectItem value="failed">Erro</SelectItem>
              </SelectContent>
            </Select>
            {stats.pending > 0 && (
              <Button onClick={processAllPending} variant="default" className="gap-2">
                <Cpu className="h-4 w-4" />
                Processar Todos ({stats.pending})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Lista de Documentos em Tabela */}
      {filteredDocuments.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Páginas</TableHead>
                  <TableHead className="text-center">Confiança OCR</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const status = statusConfig[doc.status || "uploaded"] || statusConfig.uploaded;
                  const StatusIcon = status.icon;
                  const isProcessing = processingDocId === doc.id;
                  const docType = docTypeOptions.find(o => o.value === doc.tipo);

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[200px]">
                              {doc.file_name || doc.arquivo_url?.split('/').pop() || "Documento"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.uploaded_em).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={doc.tipo}
                          onValueChange={(value) => updateDocType(doc.id, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue>
                              <span className="flex items-center gap-1">
                                <span>{docType?.icon}</span>
                                <span className="text-sm">{docType?.label || doc.tipo}</span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {docTypeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.icon} {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${status.bgColor} ${status.color} border-0`}>
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <StatusIcon className={`h-3 w-3 mr-1 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
                          )}
                          {isProcessing ? "Processando..." : status.label}
                        </Badge>
                        {doc.error_message && (
                          <p className="text-xs text-destructive mt-1 truncate max-w-[150px]" title={doc.error_message}>
                            {doc.error_message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.page_count ? (
                          <span className="font-medium">{doc.page_count}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.ocr_confidence ? (
                          <div className="flex items-center justify-center gap-1">
                            <Percent className="h-3 w-3 text-muted-foreground" />
                            <span className={`font-medium ${
                              doc.ocr_confidence >= 0.9 ? "text-green-600" :
                              doc.ocr_confidence >= 0.7 ? "text-yellow-600" : "text-destructive"
                            }`}>
                              {Math.round(doc.ocr_confidence * 100)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {doc.arquivo_url && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver documento</TooltipContent>
                            </Tooltip>
                          )}
                          
                          {(!doc.status || doc.status === "uploaded" || doc.status === "failed") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => processDocument(doc.id)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Cpu className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Processar OCR</TooltipContent>
                            </Tooltip>
                          )}

                          {(doc.status === "embedded" || doc.status === "completed") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => processDocument(doc.id)}
                                  disabled={isProcessing}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reprocessar</TooltipContent>
                            </Tooltip>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá remover o documento e todos os dados extraídos (chunks, embeddings).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDocument(doc.id, doc.storage_path)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum documento</h3>
            <p className="text-muted-foreground">
              Faça upload de documentos para iniciar o processamento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
