import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";

interface JsonEditorProps {
  value: object;
  onChange: (value: object) => void;
  placeholder?: string;
  className?: string;
}

export function JsonEditor({ value, onChange, placeholder, className }: JsonEditorProps) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      setError(null);
      setIsValid(true);
      onChange(parsed);
    } catch (e) {
      setError((e as Error).message);
      setIsValid(false);
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm min-h-[300px] resize-y"
        />
        <div className="absolute top-2 right-2">
          {isValid ? (
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <Check className="h-3 w-3" />
              JSON válido
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
              <AlertCircle className="h-3 w-3" />
              Erro
            </div>
          )}
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-mono">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
