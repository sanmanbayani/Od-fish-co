import React, { useState, useEffect } from "react";
import { useListInventory, useUpdateInventory } from "@workspace/api-client-react";
import { formatPaise } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminInventory() {
  const { data: inventory, isLoading, error } = useListInventory();
  const updateInventory = useUpdateInventory();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, { stockQty?: number, pricePaise?: number }>>({});

  useEffect(() => {
    // Clear edits when inventory is re-fetched successfully (unless we have unsaved changes, but we'll assume a fresh fetch means we start over or keep what we have. Let's just keep them for now to avoid losing input on background refresh)
  }, [inventory]);

  const handleEdit = (variantId: string, field: 'stockQty' | 'pricePaise', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    setEdits(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: numValue
      }
    }));
  };

  const handleSave = () => {
    const updates = Object.keys(edits).map(variantId => ({
      variantId,
      ...edits[variantId]
    }));

    if (updates.length === 0) return;

    updateInventory.mutate({ data: { updates } }, {
      onSuccess: () => {
        toast({ title: "Inventory Updated", description: `Saved changes for ${updates.length} variants.` });
        setEdits({});
        queryClient.invalidateQueries({ queryKey: ["/api/admin/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: apiErrorMessage(err, "Could not save the change. Please try again."), variant: "destructive" });
      }
    });
  };

  const getStockBadge = (state: string, qty: number) => {
    if (state === 'OUT') return <Badge variant="destructive">Out of Stock</Badge>;
    if (state === 'LOW') return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Low ({qty})</Badge>;
    return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">OK ({qty})</Badge>;
  };

  const filteredInventory = inventory?.filter(item => {
    if (!search) return true;
    const term = search.toLowerCase();
    return item.productName.toLowerCase().includes(term) || 
           item.sku.toLowerCase().includes(term) || 
           item.categoryName.toLowerCase().includes(term);
  }) || [];

  const hasChanges = Object.keys(edits).length > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage stock levels and daily pricing</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateInventory.isPending}
            className={hasChanges ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes {hasChanges && `(${Object.keys(edits).length})`}
          </Button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search products, SKUs..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : error ? (
          <div className="p-12 text-center text-destructive flex flex-col items-center">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>Failed to load inventory.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU / Cut</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price (Paise)</TableHead>
                <TableHead>Stock Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const currentEdit = edits[item.variantId];
                const displayPrice = currentEdit?.pricePaise ?? item.pricePaise;
                const displayQty = currentEdit?.stockQty ?? item.stockQty;
                const isEdited = !!currentEdit;

                return (
                  <TableRow key={item.variantId} className={isEdited ? "bg-primary/5" : ""}>
                    <TableCell>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.categoryName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs mb-1">{item.sku}</div>
                      <div className="text-sm">{item.cutType} • {item.packLabel}</div>
                    </TableCell>
                    <TableCell>
                      {getStockBadge(item.stockState, item.stockQty)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[150px]">
                        <Input 
                          type="number" 
                          value={displayPrice}
                          onChange={(e) => handleEdit(item.variantId, 'pricePaise', e.target.value)}
                          className={`h-9 font-mono text-right ${isEdited && currentEdit.pricePaise !== undefined ? 'border-primary' : ''}`}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          ({formatPaise(displayPrice)})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[100px]">
                        <Input 
                          type="number" 
                          value={displayQty}
                          onChange={(e) => handleEdit(item.variantId, 'stockQty', e.target.value)}
                          className={`h-9 font-mono text-right ${isEdited && currentEdit.stockQty !== undefined ? 'border-primary' : ''}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
