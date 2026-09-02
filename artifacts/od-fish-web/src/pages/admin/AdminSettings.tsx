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
  const { data: settings, isLoading, error: loadError } = useGetSettings();
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
  if (loadError || !settings) return (
    <div className="p-12 text-center space-y-2" data-testid="text-settings-failed">
      <p className="font-medium">Could not load your store settings.</p>
      <p className="text-sm text-muted-foreground">{apiErrorMessage(loadError, "Refresh the page to try again.")}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Store configuration and rules</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="h-12 sm:h-10 text-base sm:text-sm w-full sm:w-auto">
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>Master switches for the store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label className="text-base font-bold" htmlFor="storeOpen">Store Open</Label>
                <p className="text-sm text-muted-foreground">Accepting new orders</p>
              </div>
              <Switch 
                id="storeOpen"
                checked={!!form.storeOpen} 
                onCheckedChange={(c) => handleChange("storeOpen", c)}
                className="scale-125 sm:scale-100 origin-right"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label className="text-base font-bold" htmlFor="codEnabled">COD Enabled</Label>
                <p className="text-sm text-muted-foreground">Allow Cash on Delivery</p>
              </div>
              <Switch 
                id="codEnabled"
                checked={!!form.codEnabled} 
                onCheckedChange={(c) => handleChange("codEnabled", c)} 
                className="scale-125 sm:scale-100 origin-right"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fees & Thresholds</CardTitle>
            <CardDescription>Values in Paise (100 Paise = ₹1)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Delivery Fee (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.deliveryFeePaise || 0} 
                  onChange={(e) => handleChange("deliveryFeePaise", parseInt(e.target.value) || 0)} 
                  className="text-base h-12 sm:h-10 flex-1"
                />
                <div className="text-sm font-medium text-muted-foreground min-w-[70px] shrink-0 text-right">
                  {formatPaise(form.deliveryFeePaise)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Free Delivery Threshold (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.freeDeliveryThresholdPaise || 0} 
                  onChange={(e) => handleChange("freeDeliveryThresholdPaise", parseInt(e.target.value) || 0)} 
                  className="text-base h-12 sm:h-10 flex-1"
                />
                <div className="text-sm font-medium text-muted-foreground min-w-[70px] shrink-0 text-right">
                  {formatPaise(form.freeDeliveryThresholdPaise)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Handling Fee (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.handlingFeePaise || 0} 
                  onChange={(e) => handleChange("handlingFeePaise", parseInt(e.target.value) || 0)} 
                  className="text-base h-12 sm:h-10 flex-1"
                />
                <div className="text-sm font-medium text-muted-foreground min-w-[70px] shrink-0 text-right">
                  {formatPaise(form.handlingFeePaise)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">COD Maximum Order (Paise)</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="number" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.codMaxOrderPaise || 0} 
                  onChange={(e) => handleChange("codMaxOrderPaise", parseInt(e.target.value) || 0)} 
                  className="text-base h-12 sm:h-10 flex-1"
                />
                <div className="text-sm font-medium text-muted-foreground min-w-[70px] shrink-0 text-right">
                  {formatPaise(form.codMaxOrderPaise)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>Public facing contact info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Support Phone</Label>
              <Input 
                type="tel"
                value={form.supportPhone || ""} 
                onChange={(e) => handleChange("supportPhone", e.target.value)} 
                className="text-base h-12 sm:h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">WhatsApp (Optional)</Label>
              <Input 
                type="tel"
                value={form.supportWhatsapp || ""} 
                onChange={(e) => handleChange("supportWhatsapp", e.target.value)} 
                className="text-base h-12 sm:h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">FSSAI License No.</Label>
              <Input 
                value={form.fssaiLicenseNo || ""} 
                onChange={(e) => handleChange("fssaiLicenseNo", e.target.value)} 
                className="text-base h-12 sm:h-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
