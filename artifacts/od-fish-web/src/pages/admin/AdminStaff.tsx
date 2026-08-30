import React, { useState } from "react";
import {
  useCreateStaff,
  useListStaff,
  useUpdateStaff,
  type Staff,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const STAFF_KEY = ["/api/admin/staff"];

type Role = Staff["role"];

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "ADMIN", label: "Admin", hint: "Full access, including staff and settings." },
  { value: "OPS", label: "Ops", hint: "Runs orders, stock and slots. No staff or settings." },
  { value: "RIDER", label: "Rider", hint: "Delivery app only." },
];

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
};

const BLANK: FormState = { fullName: "", email: "", phone: "", role: "OPS", password: "" };

export default function AdminStaff() {
  const { data: staff, isLoading, error: loadError } = useListStaff({
    query: { queryKey: STAFF_KEY },
  });
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { staff: me } = useAuth();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const refresh = () => queryClient.invalidateQueries({ queryKey: STAFF_KEY });
  const activeAdmins = staff?.filter((m) => m.role === "ADMIN" && m.isActive).length ?? 0;

  const showDialog = (member?: Staff) => {
    setEditing(member ?? null);
    setForm(
      member
        ? {
            fullName: member.fullName,
            email: member.email,
            phone: member.phone ?? "",
            role: member.role,
            password: "",
          }
        : BLANK,
    );
    setOpen(true);
  };

  const save = () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!fullName) {
      toast({ title: "Enter the person's name", variant: "destructive" });
      return;
    }
    if (!editing && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    // A new account needs a password; on an edit it is optional, and blank
    // means "leave the current one alone".
    if ((!editing || form.password) && form.password.length < 6) {
      toast({
        title: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    // Losing every admin locks the whole team out of this screen, and there is
    // no way back in from the app.
    if (editing?.role === "ADMIN" && form.role !== "ADMIN" && activeAdmins <= 1) {
      toast({
        title: "This is your last admin",
        description: "Make someone else an admin before changing this one.",
        variant: "destructive",
      });
      return;
    }

    if (editing) {
      updateStaff.mutate(
        {
          id: editing.id,
          data: {
            fullName,
            phone,
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
          },
        },
        {
          onSuccess: () => {
            toast({ title: `${fullName} updated` });
            setOpen(false);
            refresh();
          },
          onError: (err: unknown) =>
            toast({
              title: "Could not save this account",
              description: apiErrorMessage(err, "Please try again."),
              variant: "destructive",
            }),
        },
      );
      return;
    }

    createStaff.mutate(
      {
        data: {
          fullName,
          email: email.toLowerCase(),
          role: form.role,
          password: form.password,
          ...(phone ? { phone } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: `${fullName} can now sign in`,
            description: "Share the email and password you just set.",
          });
          setOpen(false);
          refresh();
        },
        onError: (err: unknown) =>
          toast({
            title: "Could not add this person",
            description: apiErrorMessage(err, "Please try again."),
            variant: "destructive",
          }),
      },
    );
  };

  const toggleActive = (member: Staff) => {
    if (member.id === me?.id) {
      toast({
        title: "You cannot switch off your own account",
        description: "Ask another admin to do it.",
        variant: "destructive",
      });
      return;
    }
    if (member.isActive && member.role === "ADMIN" && activeAdmins <= 1) {
      toast({
        title: "This is your last admin",
        description: "Make someone else an admin first.",
        variant: "destructive",
      });
      return;
    }

    updateStaff.mutate(
      { id: member.id, data: { isActive: !member.isActive } },
      {
        onSuccess: () => {
          toast({
            title: member.isActive
              ? `${member.fullName} can no longer sign in`
              : `${member.fullName} is back on the team`,
          });
          refresh();
        },
        onError: (err: unknown) =>
          toast({
            title: "Could not change this account",
            description: apiErrorMessage(err, "Please try again."),
            variant: "destructive",
          }),
      },
    );
  };

  const saving = createStaff.isPending || updateStaff.isPending;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">Manage team access and rider accounts</p>
        </div>
        <Button onClick={() => showDialog()} data-testid="button-add-staff">
          <Plus className="w-4 h-4 mr-2" /> Add Staff
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : loadError ? (
          // An empty table would read as "you have no staff", a different problem.
          <div className="p-12 text-center space-y-2" data-testid="text-staff-failed">
            <p className="font-medium">Could not load your staff list.</p>
            <p className="text-sm text-muted-foreground">{apiErrorMessage(loadError, "Refresh the page to try again.")}</p>
          </div>
        ) : !staff?.length ? (
          <div className="p-12 text-center space-y-1" data-testid="text-staff-empty">
            <p className="font-medium">No staff accounts yet.</p>
            <p className="text-sm text-muted-foreground">
              Add your ops team and riders so they can sign in.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      {member.id === me?.id && (
                        <span className="text-xs text-muted-foreground">(you)</span>
                      )}
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
                  <TableCell className="text-sm text-muted-foreground">
                    {member.role === 'RIDER' && member.deliveriesToday !== undefined ? (
                      `${member.deliveriesToday} deliveries today`
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => showDialog(member)}
                      data-testid={`button-edit-staff-${member.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(member)}
                      disabled={updateStaff.isPending}
                      data-testid={`button-toggle-staff-${member.id}`}
                    >
                      {member.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editing ? `Edit ${editing.fullName}` : "Add Staff"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Change what this person can do, or set a new password for them."
                : "Create a sign-in for someone on your team. Riders get the delivery app, ops and admins get this dashboard."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g. Ramesh Patil"
                data-testid="input-staff-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@odfish.co"
                data-testid="input-staff-email"
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  The email is the sign-in name and cannot be changed.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit mobile"
                data-testid="input-staff-phone"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role: Role) => setForm({ ...form, role })}
              >
                <SelectTrigger data-testid="select-staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLES.find((r) => r.value === form.role)?.hint}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>{editing ? "New password (optional)" : "Password"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "Leave blank to keep the current one" : "At least 6 characters"}
                data-testid="input-staff-password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} data-testid="button-save-staff">
              {saving ? "Saving..." : editing ? "Save changes" : "Add staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
