import React, { useState, useEffect, useRef } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { formatPaise } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<any>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (settings && !initialized.current) {
      setForm({
        storeOpen: settings.storeOpen,
        codEnabled: settings.codEnabled,
        deliveryFeePaise: settings.deliveryFeePaise,
        freeDeliveryThresholdPaise: settings.freeDeliveryThresholdPaise,
        handlingFeePaise: settings.handlingFeePaise,
        codMaxOrderPaise: settings.codMaxOrderPaise,
        supportPhone: settings.supportPhone,
        supportWhatsapp: settings.supportWhatsapp || "",
        fssaiLicenseNo: settings.fssaiLicenseNo
      });
      initialized.current = true;
    }
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate({ data: form }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/public/summary"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to save", description: apiErrorMessage(err, "Could not save the settings. Please try again."), variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Store configuration and rules</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>Master switches for the store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-bold">Store Open</Label>
                <p className="text-sm text-muted-foreground">Accepting new orders</p>
              </div>
              <Switch 
                checked={form.storeOpen} 
                onCheckedChange={(c) => handleChange("storeOpen", c)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-bold">COD Enabled</Label>
                <p className="text-sm text-muted-foreground">Allow Cash on Delivery</p>
              </div>
              <Switch 
                checked={form.codEnabled} 
                onCheckedChange={(c) => handleChange("codEnabled", c)} 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fees & Thresholds</CardTitle>
            <CardDescription>Values in Paise (100 Paise = ₹1)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Fee (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  value={form.deliveryFeePaise || 0} 
                  onChange={(e) => handleChange("deliveryFeePaise", parseInt(e.target.value) || 0)} 
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px]">{formatPaise(form.deliveryFeePaise)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Free Delivery Threshold (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  value={form.freeDeliveryThresholdPaise || 0} 
                  onChange={(e) => handleChange("freeDeliveryThresholdPaise", parseInt(e.target.value) || 0)} 
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px]">{formatPaise(form.freeDeliveryThresholdPaise)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Handling Fee (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  value={form.handlingFeePaise || 0} 
                  onChange={(e) => handleChange("handlingFeePaise", parseInt(e.target.value) || 0)} 
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px]">{formatPaise(form.handlingFeePaise)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>COD Maximum Order (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  value={form.codMaxOrderPaise || 0} 
                  onChange={(e) => handleChange("codMaxOrderPaise", parseInt(e.target.value) || 0)} 
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px]">{formatPaise(form.codMaxOrderPaise)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>Public facing contact info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Support Phone</Label>
              <Input 
                value={form.supportPhone || ""} 
                onChange={(e) => handleChange("supportPhone", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp (Optional)</Label>
              <Input 
                value={form.supportWhatsapp || ""} 
                onChange={(e) => handleChange("supportWhatsapp", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>FSSAI License No.</Label>
              <Input 
                value={form.fssaiLicenseNo || ""} 
                onChange={(e) => handleChange("fssaiLicenseNo", e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
