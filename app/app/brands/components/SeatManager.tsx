"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus } from 'lucide-react';
import { createSeat, deleteSeat } from '../lib/api';
import type { Seat } from '../lib/types';

interface SeatManagerProps {
  brandId: string;
  seats: Seat[];
  onUpdate: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export default function SeatManager({ brandId, seats, onUpdate }: SeatManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createSeat({ brand_id: brandId, user_id: userId.trim(), role });
      setUserId('');
      setShowAdd(false);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add seat');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (seatId: string) => {
    try {
      await deleteSeat(seatId);
      onUpdate();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Seats ({seats.length})
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)} className="h-7 gap-1 text-xs">
          <UserPlus className="h-3 w-3" /> Add
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-lg border border-border p-3 space-y-3">
          <div>
            <Label htmlFor="seat-user-id" className="text-xs">User ID (WorkOS)</Label>
            <Input id="seat-user-id" value={userId} onChange={e => setUserId(e.target.value)} placeholder="user_..." className="h-8 text-sm" required />
          </div>
          <div>
            <Label htmlFor="seat-role" className="text-xs">Role</Label>
            <select id="seat-role" value={role} onChange={e => setRole(e.target.value)} className="w-full h-8 rounded border border-border bg-background px-2 text-sm">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading} className="h-7 text-xs">{loading ? 'Adding...' : 'Add Seat'}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </form>
      )}

      {seats.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground">No seats assigned yet.</p>
      )}

      <div className="space-y-1">
        {seats.map(seat => (
          <div key={seat._id} className="flex items-center justify-between rounded border border-border px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] text-muted-foreground truncate">{seat.user_id}</span>
              <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                {ROLE_LABELS[seat.role] || seat.role}
              </span>
              {seat.status !== 'active' && (
                <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[9px] uppercase text-destructive">
                  {seat.status}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleRemove(seat._id)} className="h-6 w-6 p-0">
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
