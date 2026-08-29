import React, { useState } from "react";
import { useListStaff } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, UserCog } from "lucide-react";

export default function AdminStaff() {
  const { data: staff, isLoading } = useListStaff();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">Manage team access and rider accounts</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Add Staff
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {member.fullName.charAt(0)}
                      </div>
                      {member.fullName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'ADMIN' ? 'default' : member.role === 'OPS' ? 'secondary' : 'outline'}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{member.email}</div>
                    {member.phone && <div className="text-xs text-muted-foreground">{member.phone}</div>}
                  </TableCell>
                  <TableCell>
                    {member.isActive ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-600"><span className="w-2 h-2 rounded-full bg-green-500"></span>Active</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><span className="w-2 h-2 rounded-full bg-muted-foreground"></span>Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {member.role === 'RIDER' && member.deliveriesToday !== undefined ? (
                      `${member.deliveriesToday} deliveries today`
                    ) : '-'}
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
