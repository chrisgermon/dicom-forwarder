import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Mail, Phone, User } from "lucide-react";
import { ContactCardsContent, ContactCard } from "./types";

interface ContactCardsModuleProps {
  content: ContactCardsContent;
  editing: boolean;
  onChange: (content: ContactCardsContent) => void;
}

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
];

export function ContactCardsModule({ content, editing, onChange }: ContactCardsModuleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCard, setNewCard] = useState<Partial<ContactCard>>({});

  const addCard = () => {
    if (!newCard.name) return;
    
    const card: ContactCard = {
      id: crypto.randomUUID(),
      name: newCard.name,
      title: newCard.title,
      email: newCard.email,
      phone: newCard.phone,
      imageUrl: newCard.imageUrl,
    };
    
    onChange({ ...content, cards: [...content.cards, card] });
    setNewCard({});
    setDialogOpen(false);
  };

  const removeCard = (id: string) => {
    onChange({ ...content, cards: content.cards.filter((c) => c.id !== id) });
  };

  const renderCard = (card: ContactCard) => (
    <Card key={card.id} className="relative group p-4">
      {editing && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => removeCard(card.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
      <div className={content.layout === 'list' ? 'flex items-center gap-4' : 'text-center space-y-3'}>
        <div className={`${content.layout === 'list' ? 'shrink-0' : 'mx-auto'} w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden`}>
          {card.imageUrl ? (
            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className={content.layout === 'list' ? 'flex-1' : ''}>
          <h4 className="font-semibold">{card.name}</h4>
          {card.title && <p className="text-sm text-muted-foreground">{card.title}</p>}
          <div className={`${content.layout === 'list' ? 'flex gap-4' : 'space-y-1'} mt-2 text-sm`}>
            {card.email && (
              <a href={`mailto:${card.email}`} className="flex items-center gap-1 text-primary hover:underline">
                <Mail className="h-3 w-3" />
                <span className={content.layout === 'grid' ? 'truncate max-w-[150px]' : ''}>{card.email}</span>
              </a>
            )}
            {card.phone && (
              <a href={`tel:${card.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                <Phone className="h-3 w-3" />
                {card.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  if (!editing && content.cards.length === 0) {
    return <p className="text-muted-foreground text-sm italic">No contacts added yet.</p>;
  }

  return (
    <div className="space-y-4">
      {editing && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Layout</Label>
            <Select
              value={content.layout}
              onValueChange={(value) => onChange({ ...content, layout: value as ContactCardsContent['layout'] })}
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className={content.layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {content.cards.map(renderCard)}
      </div>

      {editing && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newCard.name || ''}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newCard.title || ''}
                  onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                  placeholder="Job title"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={newCard.email || ''}
                  onChange={(e) => setNewCard({ ...newCard, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newCard.phone || ''}
                  onChange={(e) => setNewCard({ ...newCard, phone: e.target.value })}
                  placeholder="+61..."
                />
              </div>
              <div className="space-y-2">
                <Label>Photo URL</Label>
                <Input
                  value={newCard.imageUrl || ''}
                  onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={addCard} disabled={!newCard.name}>
                Add Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
