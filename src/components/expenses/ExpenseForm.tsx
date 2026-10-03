import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateExpense } from '@/hooks/useExpenses';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OcrResult {
  extractedText: string;
  detectedAmount: number | null;
  detectedDate: string | null;
  detectedMerchant: string | null;
}

export function ExpenseForm() {
  const navigate = useNavigate();
  const createExpense = useCreateExpense();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    description: '',
  });
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMismatch, setOcrMismatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBillFile(file);
    const previewUrl = URL.createObjectURL(file);
    setBillPreview(previewUrl);

    // Run OCR
    setOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { data, error } = await supabase.functions.invoke('ocr-extract', {
          body: { imageBase64: base64 },
        });

        if (error) {
          console.error('OCR error:', error);
          toast.error('OCR extraction failed');
        } else if (data) {
          setOcrResult(data);
          // Auto-fill amount if detected
          if (data.detectedAmount && !formData.amount) {
            setFormData(prev => ({ ...prev, amount: String(data.detectedAmount) }));
          }
          toast.success('Bill scanned successfully');
        }
        setOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setOcrLoading(false);
      toast.error('Failed to process bill image');
    }
  };

  // Check OCR mismatch when amount changes
  const handleAmountChange = (value: string) => {
    setFormData(prev => ({ ...prev, amount: value }));
    if (ocrResult?.detectedAmount && value) {
      const entered = parseFloat(value);
      const detected = ocrResult.detectedAmount;
      setOcrMismatch(Math.abs(entered - detected) > 0.01);
    } else {
      setOcrMismatch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.amount || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createExpense.mutateAsync({
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || undefined,
      });

      toast.success('Expense submitted successfully!');
      navigate('/expenses');
    } catch (error) {
      toast.error('Failed to create expense');
      console.error(error);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Expense</CardTitle>
        <CardDescription>
          Submit an expense request for reimbursement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bill Capture */}
          <div className="space-y-2">
            <Label>Bill Photo (Camera Only)</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
              >
                {ocrLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {ocrLoading ? 'Scanning...' : 'Capture Bill'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCapture}
              />
              {billPreview && (
                <img
                  src={billPreview}
                  alt="Bill preview"
                  className="h-16 w-16 object-cover rounded border"
                />
              )}
            </div>
            {ocrResult && (
              <div className="mt-2 p-3 rounded-lg bg-muted text-sm space-y-1">
                <p className="font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-primary" /> OCR Results
                </p>
                {ocrResult.detectedAmount && (
                  <p>Amount: ₹{ocrResult.detectedAmount}</p>
                )}
                {ocrResult.detectedDate && (
                  <p>Date: {ocrResult.detectedDate}</p>
                )}
                {ocrResult.detectedMerchant && (
                  <p>Merchant: {ocrResult.detectedMerchant}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Conference travel expenses"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
              {ocrMismatch && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Amount differs from OCR detected (₹{ocrResult?.detectedAmount})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide additional details about this expense..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/expenses')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Expense
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
