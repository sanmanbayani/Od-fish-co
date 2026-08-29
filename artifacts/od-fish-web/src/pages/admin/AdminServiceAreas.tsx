import React from "react";
import { useListPincodes } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MapPin } from "lucide-react";

export default function AdminServiceAreas() {
  const { data: pincodes, isLoading } = useListPincodes();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Service Areas</h1>
          <p className="text-muted-foreground mt-1">Manage delivery zones</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Add Pincode
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Pincode</TableHead>
                <TableHead>Area Name</TableHead>
                <TableHead>COD Enabled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pincodes?.map((pin) => (
                <TableRow key={pin.pincode}>
                  <TableCell className="font-mono font-medium">{pin.pincode}</TableCell>
                  <TableCell>{pin.areaName}</TableCell>
                  <TableCell>
                    {pin.codEnabled ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {pin.isActive ? (
                      <span className="text-sm text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Disabled</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
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
