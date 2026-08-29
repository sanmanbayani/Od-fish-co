import React, { useState } from "react";
import { useListAdminOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatPaise, formatOnlyDate, slotWindow } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, AlertCircle } from "lucide-react";

export default function AdminOrders() {
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data: orders, isLoading, error } = useListAdminOrders({
    status: status === "ALL" ? undefined : status,
    search: debouncedSearch || undefined
  });

  const getStatusBadge = (s: string) => {
    switch(s) {
      case 'PENDING_PAYMENT': return <Badge variant="secondary">Pending Payment</Badge>;
      case 'PLACED': return <Badge variant="default" className="bg-blue-500">Placed</Badge>;
      case 'CONFIRMED': return <Badge variant="default" className="bg-indigo-500">Confirmed</Badge>;
      case 'PACKED': return <Badge variant="default" className="bg-purple-500">Packed</Badge>;
      case 'OUT_FOR_DELIVERY': return <Badge variant="default" className="bg-orange-500">Out for Delivery</Badge>;
      case 'DELIVERED': return <Badge variant="default" className="bg-green-500">Delivered</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage the delivery queue</p>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search order #, customer, phone..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-48 bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
              <SelectItem value="PLACED">Placed</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="PACKED">Packed</SelectItem>
              <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : error ? (
          <div className="p-12 text-center text-destructive flex flex-col items-center">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>Failed to load orders.</p>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No orders found matching your criteria.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Slot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <TableCell className="font-mono font-medium">
                    <Link href={`/admin/orders/${order.id}`} className="text-primary hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{slotWindow(order.slotLabel)}</div>
                    <div className="text-xs text-muted-foreground">{formatOnlyDate(order.deliveryDate)}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                    {order.flaggedUnreachable && (
                      <Badge variant="destructive" className="ml-2 text-[10px]">Unreachable</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.paymentMethod}</div>
                    <div className={`text-xs ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {order.paymentStatus}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatPaise(order.totalPaise)}
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
