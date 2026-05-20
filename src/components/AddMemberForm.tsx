import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface AddMemberFormProps {
  onAdd: (name: string, email: string) => void | Promise<void>;
}

export function AddMemberForm({ onAdd }: AddMemberFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) return;
    await onAdd(trimmedName, trimmedEmail);
    setName("");
    setEmail("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Member name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 h-10 rounded-xl shadow-soft bg-card"
      />
      <Input
        type="email"
        required
        placeholder="Member email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 h-10 rounded-xl shadow-soft bg-card"
      />
      <Button type="submit" size="sm" className="gap-1.5 h-10 rounded-xl gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity px-4">
        <UserPlus className="h-4 w-4" />
        Add
      </Button>
    </form>
  );
}
