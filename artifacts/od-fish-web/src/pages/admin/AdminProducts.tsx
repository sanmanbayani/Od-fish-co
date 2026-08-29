import React, { useState } from "react";
import { useListAdminProducts, useListCategories } from "@workspace/api-client-react";
import { formatPaise } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, Fish, Image as ImageIcon } from "lucide-react";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");

  const { data: products, isLoading, error } = useListAdminProducts();

  const { data: categories } = useListCategories();

  const filteredProducts = products?.filter(p => {
    if (category !== "ALL" && p.categorySlug !== category) return false;
    if (search) {
      const term = search.toLowerCase();
      return p.name.toLowerCase().includes(term) || (p.nameLocal && p.nameLocal.toLowerCase().includes(term));
    }
    return true;
  }) || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Manage catalogue and variants</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name, local name..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-48 bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : error ? (
          <div className="p-12 text-center text-destructive">Failed to load products.</div>
        ) : !products || products.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No products found.</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-16"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead className="text-right">Starting At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
                    {product.imageUrls?.[0] ? (
                      <img src={product.imageUrls[0]} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-primary">{product.name}</div>
                    {product.nameLocal && <div className="text-xs text-muted-foreground">{product.nameLocal}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">{product.categoryName}</Badge>
                  </TableCell>
                  <TableCell>
                    {product.isActive ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Archived</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{product.variants?.length || 0} variants</div>
                    {product.inStock ? (
                      <span className="text-xs text-green-600">In Stock</span>
                    ) : (
                      <span className="text-xs text-destructive">Out of Stock</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPaise(product.fromPricePaise)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
