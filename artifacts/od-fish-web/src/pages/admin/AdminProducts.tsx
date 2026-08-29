import React, { useState } from "react";
import {
  useCreateProduct,
  useCreateVariant,
  useDeleteVariant,
  useListAdminProducts,
  useListCategories,
  useUpdateProduct,
  useUpdateVariant,
  type Product,
  type ProductVariant,
} from "@workspace/api-client-react";
import { formatPaise } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mediaUrl } from "@/lib/api-config";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Filter, Plus, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";

type ProductForm = {
  name: string; nameLocal: string; categoryId: string; shortDesc: string;
  longDesc: string; origin: string; bestFor: string; imageUrls: string; isActive: boolean;
};
type VariantForm = {
  cutType: string; soldBy: "PACK" | "PIECE"; packLabel: string; grossWeightG: string;
  netWeightMinG: string; netWeightMaxG: string; pieceCount: string; mrpRupees: string;
  priceRupees: string; stockQty: string; lowStockAt: string; isActive: boolean;
};

const emptyProduct = (): ProductForm => ({
  name: "", nameLocal: "", categoryId: "", shortDesc: "", longDesc: "", origin: "",
  bestFor: "", imageUrls: "", isActive: true,
});
const emptyVariant = (): VariantForm => ({
  cutType: "", soldBy: "PACK", packLabel: "", grossWeightG: "", netWeightMinG: "",
  netWeightMaxG: "", pieceCount: "", mrpRupees: "", priceRupees: "", stockQty: "0",
  lowStockAt: "5", isActive: true,
});
const optionalInt = (value: string) => value === "" ? undefined : Number.parseInt(value, 10);
const errorMessage = (error: unknown) => apiErrorMessage(error, "Please try again.");

const packWeights = (v: ProductVariant) => [
  v.grossWeightG ? `${v.grossWeightG}g gross` : null,
  v.netWeightMinG && v.netWeightMaxG ? `${v.netWeightMinG}–${v.netWeightMaxG}g net` : null,
].filter(Boolean).join(" · ");

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("details");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [variantOpen, setVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariant);
  const [deletingPack, setDeletingPack] = useState<ProductVariant | null>(null);
  const { data: products, isLoading, error } = useListAdminProducts({ query: { queryKey: ["/api/admin/products"] } });
  const { data: categories } = useListCategories({ query: { queryKey: ["/api/categories"] } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });

  // The pack list must read the row as it stands now, not the snapshot taken
  // when the dialog opened. Reading the snapshot is why saving a pack used to
  // close the whole dialog: it was the only way to make the list catch up.
  const current = editing ? products?.find(p => p.id === editing.id) ?? editing : null;
  const packs = current?.variants ?? [];

  const openProduct = (product?: Product) => {
    setEditing(product ?? null);
    setTab("details");
    setForm(product ? {
      name: product.name, nameLocal: product.nameLocal ?? "", categoryId: product.categoryId,
      shortDesc: product.shortDesc ?? "", longDesc: product.longDesc ?? "", origin: product.origin ?? "",
      bestFor: product.bestFor?.join(", ") ?? "", imageUrls: product.imageUrls.join("\n"), isActive: product.isActive,
    } : emptyProduct());
    setOpen(true);
  };
  const saveProduct = () => {
    if (!form.name.trim() || !form.categoryId) {
      toast({ title: "Name and category are required", variant: "destructive" }); return;
    }
    const data = {
      name: form.name.trim(), nameLocal: form.nameLocal.trim(), categoryId: form.categoryId,
      shortDesc: form.shortDesc.trim(), longDesc: form.longDesc.trim(), origin: form.origin.trim(),
      bestFor: form.bestFor.split(",").map(v => v.trim()).filter(Boolean),
      imageUrls: form.imageUrls.split(/\n|,/).map(v => v.trim()).filter(Boolean), isActive: form.isActive,
    };
    const options = {
      onSuccess: () => { toast({ title: editing ? "Product updated" : "Product created" }); setOpen(false); refresh(); },
      onError: (err: unknown) => toast({ title: "Could not save product", description: errorMessage(err), variant: "destructive" as const }),
    };
    if (editing) updateProduct.mutate({ id: editing.id, data }, options);
    else createProduct.mutate({ data }, options);
  };
  const openVariant = (variant?: ProductVariant) => {
    setEditingVariant(variant ?? null);
    setVariantForm(variant ? {
      cutType: variant.cutType, soldBy: variant.soldBy, packLabel: variant.packLabel,
      grossWeightG: variant.grossWeightG?.toString() ?? "", netWeightMinG: variant.netWeightMinG?.toString() ?? "",
      netWeightMaxG: variant.netWeightMaxG?.toString() ?? "", pieceCount: variant.pieceCount?.toString() ?? "",
      mrpRupees: (variant.mrpPaise / 100).toString(), priceRupees: (variant.pricePaise / 100).toString(),
      stockQty: variant.stockQty.toString(), lowStockAt: variant.lowStockAt.toString(), isActive: variant.isActive,
    } : emptyVariant());
    setVariantOpen(true);
  };
  const saveVariant = () => {
    if (!editing) return;
    if (!variantForm.packLabel.trim() || !variantForm.cutType.trim()) {
      toast({ title: "Pack label and cut type are required", variant: "destructive" }); return;
    }
    const data = {
      cutType: variantForm.cutType.trim(), soldBy: variantForm.soldBy, packLabel: variantForm.packLabel.trim(),
      grossWeightG: optionalInt(variantForm.grossWeightG), netWeightMinG: optionalInt(variantForm.netWeightMinG),
      netWeightMaxG: optionalInt(variantForm.netWeightMaxG), pieceCount: optionalInt(variantForm.pieceCount),
      mrpPaise: Math.round(Number(variantForm.mrpRupees) * 100),
      pricePaise: Math.round(Number(variantForm.priceRupees) * 100),
      stockQty: Number.parseInt(variantForm.stockQty, 10), lowStockAt: Number.parseInt(variantForm.lowStockAt, 10),
      isActive: variantForm.isActive,
    };
    if (!Number.isFinite(data.mrpPaise) || !Number.isFinite(data.pricePaise)) {
      toast({ title: "Enter valid prices", variant: "destructive" }); return;
    }
    const options = {
      // The product dialog stays open on the Packs tab: the list behind it is
      // read live, so the saved pack is already there when this closes.
      onSuccess: () => { toast({ title: editingVariant ? "Pack updated" : "Pack added" }); setVariantOpen(false); refresh(); },
      onError: (err: unknown) => toast({ title: "Could not save pack", description: errorMessage(err), variant: "destructive" as const }),
    };
    if (editingVariant) updateVariant.mutate({ id: editingVariant.id, data }, options);
    else createVariant.mutate({ id: editing.id, data }, options);
  };
  const confirmDeletePack = () => {
    const pack = deletingPack;
    if (!pack) return;
    deleteVariant.mutate({ id: pack.id }, {
      onSuccess: result => {
        toast(result.deleted
          ? { title: `Deleted ${pack.packLabel}` }
          : { title: `Archived ${pack.packLabel}`, description: "It appears in past orders, so it was hidden from the shop instead of deleted." });
        setDeletingPack(null);
        refresh();
      },
      onError: (err: unknown) => toast({ title: "Could not delete pack", description: errorMessage(err), variant: "destructive" as const }),
    });
  };

  const filteredProducts = products?.filter(p => {
    if (category !== "ALL" && p.categorySlug !== category) return false;
    const term = search.toLowerCase();
    return !term || p.name.toLowerCase().includes(term) || !!p.nameLocal?.toLowerCase().includes(term);
  }) || [];
  const pending = createProduct.isPending || updateProduct.isPending;
  const packPending = createVariant.isPending || updateVariant.isPending;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-serif font-bold text-foreground">Products</h1><p className="text-muted-foreground mt-1">Catalogue and packs</p></div>
        <Button onClick={() => openProduct()}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
      </div>
      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name, local name..." className="pl-9 bg-background" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="flex items-center gap-3 w-full md:w-auto"><Filter className="w-4 h-4 text-muted-foreground" /><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full md:w-48 bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Categories</SelectItem>{categories?.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : error ? <div className="p-12 text-center text-destructive">Failed to load products.</div> : !filteredProducts.length ? <div className="p-12 text-center text-muted-foreground">No products found.</div> :
          <Table><TableHeader className="bg-muted/50"><TableRow><TableHead className="w-16" /><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Packs</TableHead><TableHead className="text-right">Starting At</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>{filteredProducts.map(product => <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openProduct(product)}>
              <TableCell>{product.imageUrls?.[0] ? <img src={mediaUrl(product.imageUrls[0])} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/50" /></div>}</TableCell>
              <TableCell><div className="font-bold text-primary">{product.name}</div>{product.nameLocal && <div className="text-xs text-muted-foreground">{product.nameLocal}</div>}</TableCell>
              <TableCell><Badge variant="secondary" className="font-normal">{product.categoryName}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={product.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-muted text-muted-foreground"}>{product.isActive ? "Active" : "Archived"}</Badge></TableCell>
              <TableCell><div className="text-sm">{product.variants?.length || 0}</div><span className={`text-xs ${product.inStock ? "text-green-600" : "text-destructive"}`}>{product.inStock ? "In Stock" : "Out of Stock"}</span></TableCell>
              <TableCell className="text-right font-medium">{formatPaise(product.fromPricePaise)}</TableCell><TableCell><Pencil className="w-4 h-4 text-muted-foreground" /></TableCell>
            </TableRow>)}</TableBody></Table>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{editing ? editing.name : "New product"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="packs" disabled={!editing}>Packs{editing ? ` · ${packs.length}` : ""}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 pt-5">
            <Section title="Basics">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Local name"><Input value={form.nameLocal} onChange={e => setForm({ ...form, nameLocal: e.target.value })} placeholder="Bangda" /></Field>
                <Field label="Category"><Select value={form.categoryId} onValueChange={categoryId => setForm({ ...form, categoryId })}><SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger><SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Origin"><Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="Sassoon Dock" /></Field>
              </div>
            </Section>

            <Section title="Description">
              <div className="space-y-4">
                <Field label="Short"><Input value={form.shortDesc} onChange={e => setForm({ ...form, shortDesc: e.target.value })} placeholder="One line on the shop card" /></Field>
                <Field label="Full"><Textarea rows={3} value={form.longDesc} onChange={e => setForm({ ...form, longDesc: e.target.value })} /></Field>
                <Field label="Best for"><Input value={form.bestFor} onChange={e => setForm({ ...form, bestFor: e.target.value })} placeholder="Curry, Fry" /></Field>
              </div>
            </Section>

            <Section title="Images">
              <Field label="One URL per line"><Textarea rows={2} value={form.imageUrls} onChange={e => setForm({ ...form, imageUrls: e.target.value })} /></Field>
            </Section>

            <div className="flex items-center gap-3 border-t pt-4"><Switch checked={form.isActive} onCheckedChange={isActive => setForm({ ...form, isActive })} /><Label>Active in catalogue</Label></div>
          </TabsContent>

          <TabsContent value="packs" className="space-y-3 pt-5">
            {!packs.length
              ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No packs yet.</div>
              : packs.map(v => (
                <div key={v.id} className="flex items-center gap-1 rounded-lg border pr-2 hover:bg-muted/50">
                  <button onClick={() => openVariant(v)} className="flex flex-1 items-center justify-between gap-4 p-3 text-left">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{v.packLabel}</div>
                      <div className="text-xs text-muted-foreground truncate">{[v.cutType, packWeights(v)].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium">{formatPaise(v.pricePaise)}</div>
                      <div className={`text-xs ${v.isActive ? "text-muted-foreground" : "text-destructive"}`}>{v.isActive ? `${v.stockQty} in stock` : "Archived"}</div>
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${v.packLabel}`} onClick={() => setDeletingPack(v)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            <Button size="sm" variant="outline" onClick={() => openVariant()}><Plus className="w-4 h-4 mr-1" /> Add pack</Button>
          </TabsContent>
        </Tabs>

        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={saveProduct} disabled={pending}>{pending ? "Saving..." : "Save Product"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={variantOpen} onOpenChange={setVariantOpen}><DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-serif text-2xl">{editingVariant ? editingVariant.packLabel : "New pack"}</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <Section title="Pack">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Label"><Input value={variantForm.packLabel} onChange={e => setVariantForm({ ...variantForm, packLabel: e.target.value })} placeholder="500g pack" /></Field>
              <Field label="Cut type"><Input value={variantForm.cutType} onChange={e => setVariantForm({ ...variantForm, cutType: e.target.value })} placeholder="Curry cut" /></Field>
              <Field label="Sold by"><Select value={variantForm.soldBy} onValueChange={(soldBy: "PACK" | "PIECE") => setVariantForm({ ...variantForm, soldBy })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PACK">Pack</SelectItem><SelectItem value="PIECE">Piece</SelectItem></SelectContent></Select></Field>
            </div>
          </Section>

          <Section title="Weight">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="Gross (g)" value={variantForm.grossWeightG} onChange={grossWeightG => setVariantForm({ ...variantForm, grossWeightG })} />
              <NumberField label="Net min (g)" value={variantForm.netWeightMinG} onChange={netWeightMinG => setVariantForm({ ...variantForm, netWeightMinG })} />
              <NumberField label="Net max (g)" value={variantForm.netWeightMaxG} onChange={netWeightMaxG => setVariantForm({ ...variantForm, netWeightMaxG })} />
              <NumberField label="Pieces" value={variantForm.pieceCount} onChange={pieceCount => setVariantForm({ ...variantForm, pieceCount })} />
            </div>
          </Section>

          <Section title="Price & stock">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NumberField label="MRP (₹)" value={variantForm.mrpRupees} onChange={mrpRupees => setVariantForm({ ...variantForm, mrpRupees })} step="0.01" />
              <NumberField label="Selling (₹)" value={variantForm.priceRupees} onChange={priceRupees => setVariantForm({ ...variantForm, priceRupees })} step="0.01" />
              <NumberField label="In stock" value={variantForm.stockQty} onChange={stockQty => setVariantForm({ ...variantForm, stockQty })} />
              <NumberField label="Low at" value={variantForm.lowStockAt} onChange={lowStockAt => setVariantForm({ ...variantForm, lowStockAt })} />
            </div>
          </Section>

          <div className="flex items-center gap-3 border-t pt-4"><Switch checked={variantForm.isActive} onCheckedChange={isActive => setVariantForm({ ...variantForm, isActive })} /><Label>Active pack</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setVariantOpen(false)}>Cancel</Button><Button onClick={saveVariant} disabled={packPending}>{packPending ? "Saving..." : "Save Pack"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <AlertDialog open={!!deletingPack} onOpenChange={isOpen => { if (!isOpen) setDeletingPack(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingPack?.packLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              If a customer has already ordered this pack it is archived instead, so past orders keep their record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePack} disabled={deleteVariant.isPending}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label>{label}</Label>{children}</div>;
}
function NumberField({ label, value, onChange, step }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  return <Field label={label}><Input type="number" min="0" step={step ?? "1"} value={value} onChange={e => onChange(e.target.value)} /></Field>;
}
