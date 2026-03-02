import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UploadedFile } from '@/types/project';
import { invokeFunction } from '@/lib/supabaseHelpers';
import { SupabaseClient } from '@supabase/supabase-js';

interface FileUploadButtonProps {
  onFileProcessed: (file: UploadedFile, content: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx'];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Maximum file size is 5MB" };
  }

  const hasValidType = SUPPORTED_TYPES.includes(file.type);
  const hasValidExtension = SUPPORTED_EXTENSIONS.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidType && !hasValidExtension) {
    return { valid: false, error: "Supported: TXT, MD, JSON, CSV, PDF, JPG, PNG, WEBP, DOCX" };
  }

  return { valid: true };
}

export async function processFile(
  file: File,
  _supabase?: SupabaseClient
): Promise<{ file: UploadedFile; content: string } | null> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  let extractedContent: string;

  const isTextFile = file.type.startsWith('text/') ||
    file.name.match(/\.(txt|md|json|csv)$/i);

  if (isTextFile) {
    extractedContent = await readFileAsText(file);
  } else {
    const fileContent = await readFileAsDataURL(file);

    const { data, error } = await invokeFunction('parse-file-context', {
      fileContent,
      fileName: file.name,
      fileType: file.type
    });

    if (error) throw new Error(error.message);
    const result = data as { success: boolean; error?: string; extractedText?: string } | null;
    if (!result?.success) throw new Error(result?.error || 'Failed to process file');

    extractedContent = result.extractedText || `File uploaded: ${file.name}`;
  }

  const uploadedFile: UploadedFile = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    content: extractedContent,
    uploadedAt: new Date()
  };

  return { file: uploadedFile, content: extractedContent };
}

export function FileUploadButton({ onFileProcessed, disabled }: FileUploadButtonProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive"
      });
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processFile(file);
      if (result) {
        onFileProcessed(result.file, result.content);
        toast({
          title: "File attached",
          description: `${file.name} has been added to the conversation`
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Failed to process file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={SUPPORTED_EXTENSIONS.join(',')}
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />
      <Button
        onClick={handleClick}
        variant="outline"
        className="font-mono"
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4 mr-2" />
        )}
        {isProcessing ? 'Processing...' : 'Attach'}
      </Button>
    </>
  );
}
