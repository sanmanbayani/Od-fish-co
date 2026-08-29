import React, { useState } from "react";
import {
  useCreateAdminSlot,
  useListAdminSlots,
  useSetAdminSlotOpen,
  useUpdateAdminSlot,
  type AdminDeliverySlot,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock3, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";

type SlotForm = { label: string; startTime: string; endTime: string; cutoffTime: string; capacity: string; isOpen: boolean };
const emptyForm = (): SlotForm => ({ label: "", startTime: "07:00", endTime: "10:00", cutoffTime: "23:00", capacity: "40", isOpen: true });
const getError = (error: unknown) => apiErrorMessage(error, "Please try again.");

export default function AdminSlots() {
  const { data: slots, isLoading, error } = useListAdminSlots({ query: { queryKey: ["/api/admin/slots"] } });
  const createSlot = useCreateAdminSlot();
  const updateSlot = useUpdateAdminSlot();
  const setSlotOpen = useSetAdminSlotOpen();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDeliverySlot | null>(null);
  const [form, setForm] = useState<SlotForm>(emptyForm);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/slots"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
    // The customer-facing slot list, not "/api/catalogue/slots" — that key
    // matches nothing, so storefront slots would keep serving stale data.
    queryClient.invalidateQueries({ queryKey: ["/api/delivery-slots"] });
    queryClient.invalidateQueries({ queryKey: ["/api/home"] });
  };
  const showDialog = (slot?: AdminDeliverySlot) => {
    setEditing(slot ?? null);
    setForm(slot ? {
      label: slot.label, startTime: slot.startTime, endTime: slot.endTime,
      cutoffTime: slot.cutoffTime, capacity: String(slot.capacity), isOpen: slot.isOpen,
    } : emptyForm());
    setOpen(true);
  };
  const save = () => {
    const capacity = Number.parseInt(form.capacity, 10);
    if (!form.label.trim() || !form.startTime || !form.endTime || !form.cutoffTime || capacity < 1) {
      toast({ title: "Complete all slot details", variant: "destructive" }); return;
    }
    const data = { ...form, label: form.label.trim(), capacity };
    const options = {
      onSuccess: () => { toast({ title: editing ? "Delivery slot updated" : "Delivery slot created" }); setOpen(false); refresh(); },
      onError: (err: unknown) => toast({ title: "Could not save slot", description: getError(err), variant: "destructive" as const }),
    };
    if (editing) updateSlot.mutate({ id: editing.id, data }, options);
    else createSlot.mutate({ data }, options);
  };
  const toggle = (slot: AdminDeliverySlot, isOpen: boolean) => {
    setSlotOpen.mutate({ id: slot.id, data: { isOpen } }, {
      onSuccess: () => { toast({ title: isOpen ? "Slot opened" : "Slot closed" }); refresh(); },
      onError: (err: unknown) => toast({ title: "Could not change slot status", description: getError(err), variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-serif font-bold text-foreground">Delivery Slots</h1><p className="text-muted-foreground mt-1">Balance daily cutting and packing capacity</p></div>
        <Button onClick={() => showDialog()}><Plus className="w-4 h-4 mr-2" /> Add Slot</Button>
      </div>
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> :
          error ? <div className="p-12 text-center text-destructive">Failed to load delivery slots.</div> :
          !slots?.length ? <div className="p-12 text-center text-muted-foreground"><Clock3 className="w-8 h-8 mx-auto mb-2" />No slots configured.</div> :
          <Table><TableHeader className="bg-muted/50"><TableRow><TableHead>Slot</TableHead><TableHead>Cutoff</TableHead><TableHead>Today's Load</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{slots.map(slot => {
              const percent = Math.min(100, Math.round((slot.ordersToday / slot.capacity) * 100));
              const full = slot.ordersToday >= slot.capacity;
              return <TableRow key={slot.id}>
                <TableCell><div className="font-bold text-primary">{slot.label}</div><div className="text-xs text-muted-foreground font-mono">{slot.startTime}–{slot.endTime}</div></TableCell>
                <TableCell className="font-mono text-sm">{slot.cutoffTime}</TableCell>
                <TableCell><div className="w-52 max-w-full space-y-1.5"><div className="flex justify-between text-xs"><span className={full ? "text-destructive font-medium" : ""}>{slot.ordersToday} / {slot.capacity} orders</span><span>{percent}%</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${full ? "bg-destructive" : percent >= 75 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${percent}%` }} /></div></div></TableCell>
                <TableCell><div className="flex items-center gap-2"><Switch checked={slot.isOpen} disabled={setSlotOpen.isPending} onCheckedChange={value => toggle(slot, value)} /><Badge variant="outline" className={slot.isOpen ? "bg-green-100 text-green-800 border-green-200" : "bg-muted text-muted-foreground"}>{slot.isOpen ? "Open" : "Closed"}</Badge></div></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => showDialog(slot)}>Edit</Button></TableCell>
              </TableRow>;
            })}</TableBody></Table>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">{editing ? "Edit Delivery Slot" : "Add Delivery Slot"}</DialogTitle><DialogDescription>Capacity limits how many orders the cutting and packing team accepts each day.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5"><Label>Customer-facing label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="7 AM - 10 AM" /></div>
          <TimeField label="Starts" value={form.startTime} onChange={startTime => setForm({ ...form, startTime })} />
          <TimeField label="Ends" value={form.endTime} onChange={endTime => setForm({ ...form, endTime })} />
          <TimeField label="Order cutoff" value={form.cutoffTime} onChange={cutoffTime => setForm({ ...form, cutoffTime })} />
          <div className="space-y-1.5"><Label>Daily capacity</Label><Input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
          <div className="col-span-2 flex items-center gap-3"><Switch checked={form.isOpen} onCheckedChange={isOpen => setForm({ ...form, isOpen })} /><Label>Open for customer orders</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={createSlot.isPending || updateSlot.isPending}>{createSlot.isPending || updateSlot.isPending ? "Saving..." : "Save Slot"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type="time" value={value} onChange={e => onChange(e.target.value)} /></div>;
}