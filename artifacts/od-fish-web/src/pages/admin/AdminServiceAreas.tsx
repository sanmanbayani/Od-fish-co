import React, { useState } from "react";
import { useCreatePincode, useDeletePincode, useListPincodes, type Pincode } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataList, DataListItem, DataListField, DataState } from "@/components/data-list";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminServiceAreas() {
  const { data: pincodes, isLoading, error } = useListPincodes({ query: { queryKey: ["/api/admin/pincodes"] } });
  const createPincode = useCreatePincode();
  const deletePincode = useDeletePincode();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pincode | null>(null);
  const [form, setForm] = useState({ pincode: "", areaName: "", codEnabled: true });

  const showDialog = (pin?: Pincode) => {
    setEditing(pin ?? null);
    setForm(pin ? { pincode: pin.pincode, areaName: pin.areaName, codEnabled: pin.codEnabled } : { pincode: "", areaName: "", codEnabled: true });
    setOpen(true);
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/pincodes"] });
  const save = () => {
    if (!/^\d{6}$/.test(form.pincode) || !form.areaName.trim()) {
      toast({ title: "Enter a valid 6-digit pincode and area name", variant: "destructive" }); return;
    }
    createPincode.mutate({ data: { ...form, areaName: form.areaName.trim() } }, {
      onSuccess: () => { toast({ title: editing ? "Service area updated" : "Service area added" }); setOpen(false); refresh(); },
      onError: (err: unknown) => toast({ title: "Could not save service area", description: apiErrorMessage(err, "Please try again."), variant: "destructive" }),
    });
  };
  const disable = (pin: Pincode) => {
    if (!pin.isActive) {
      createPincode.mutate({ data: { pincode: pin.pincode, areaName: pin.areaName, codEnabled: pin.codEnabled } }, {
        onSuccess: refresh,
        onError: (err: unknown) => toast({ title: "Could not enable service area", description: apiErrorMessage(err, "Please try again."), variant: "destructive" }),
      });
      return;
    }
    deletePincode.mutate({ pincode: pin.pincode }, {
      onSuccess: () => { toast({ title: "Service area disabled" }); refresh(); },
      onError: (err: unknown) => toast({ title: "Could not disable service area", description: apiErrorMessage(err, "Please try again."), variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-serif font-bold text-foreground">Service Areas</h1><p className="text-muted-foreground mt-1">Manage delivery zones</p></div>
        <Button className="w-full md:w-auto" onClick={() => showDialog()}><Plus className="w-4 h-4 mr-2" /> Add Pincode</Button>
      </div>
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <DataState>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </DataState>
        ) : error ? (
          <DataState className="text-destructive">
            Failed to load service areas.
          </DataState>
        ) : !pincodes?.length ? (
          <DataState>
            No service areas configured.
          </DataState>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Area Name</TableHead>
                    <TableHead>COD Enabled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pincodes.map(pin => (
                    <TableRow key={pin.pincode}>
                      <TableCell className="font-mono font-medium">{pin.pincode}</TableCell>
                      <TableCell>{pin.areaName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={pin.codEnabled ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                          {pin.codEnabled ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${pin.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                          {pin.isActive ? "Active" : "Disabled"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => showDialog(pin)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => disable(pin)}>{pin.isActive ? "Disable" : "Enable"}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataList>
              {pincodes.map(pin => (
                <DataListItem
                  key={pin.pincode}
                  title={pin.pincode}
                  subtitle={pin.areaName}
                  trailing={
                    <span className={`text-sm font-medium ${pin.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                      {pin.isActive ? "Active" : "Disabled"}
                    </span>
                  }
                  actions={
                    <>
                      <Button variant="outline" className="h-11" onClick={() => showDialog(pin)}>Edit</Button>
                      <Button variant="outline" className="h-11" onClick={() => disable(pin)}>{pin.isActive ? "Disable" : "Enable"}</Button>
                    </>
                  }
                >
                  <DataListField label="COD Enabled">
                    <Badge variant="outline" className={pin.codEnabled ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                      {pin.codEnabled ? "Yes" : "No"}
                    </Badge>
                  </DataListField>
                </DataListItem>
              ))}
            </DataList>
          </>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">{editing ? "Edit Service Area" : "Add Service Area"}</DialogTitle><DialogDescription>Set the Mumbai pincode, neighbourhood name and COD availability.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Pincode</Label><Input inputMode="numeric" maxLength={6} value={form.pincode} disabled={!!editing} onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="space-y-1.5"><Label>Area name</Label><Input value={form.areaName} onChange={e => setForm({ ...form, areaName: e.target.value })} placeholder="e.g. Bandra West" /></div>
          <div className="flex items-center gap-3"><Switch checked={form.codEnabled} onCheckedChange={codEnabled => setForm({ ...form, codEnabled })} /><Label>Cash on delivery enabled</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={createPincode.isPending}>{createPincode.isPending ? "Saving..." : "Save Area"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}