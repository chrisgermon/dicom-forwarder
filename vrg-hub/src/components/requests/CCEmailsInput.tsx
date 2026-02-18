import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface CCEmailsInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
}

export function CCEmailsInput({ emails, onChange, disabled }: CCEmailsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = () => {
    const trimmedEmail = inputValue.trim().toLowerCase();
    
    if (!trimmedEmail) return;
    
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (emails.includes(trimmedEmail)) {
      setError('This email is already added');
      return;
    }
    
    onChange([...emails, trimmedEmail]);
    setInputValue('');
    setError('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    onChange(emails.filter(email => email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div className="space-y-2">
      <Label>CC Email Addresses</Label>
      <p className="text-sm text-muted-foreground">
        Add email addresses to receive copies of all notifications for this request
      </p>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="email@example.com"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAddEmail}
          disabled={disabled || !inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {emails.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1">
              {email}
              <button
                type="button"
                onClick={() => handleRemoveEmail(email)}
                disabled={disabled}
                className="ml-1 hover:bg-destructive/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
