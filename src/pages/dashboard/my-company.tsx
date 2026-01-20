import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, Save } from "lucide-react";

export default function CompanyDataPage() {
  return (
    
    <div className="h-screen bg-slate-900 text-slate-100">
      {/* Tabs */}
      <Tabs defaultValue="company" className="h-full">
        <TabsList className="w-full justify-start rounded-none border-b  border-slate-700 bg-slate-800 px-4">
          <TabsTrigger value="company" className="border-none">Company data</TabsTrigger>
          <TabsTrigger value="void">Void reasons</TabsTrigger>
          <TabsTrigger value="logo">My logo</TabsTrigger>
          <TabsTrigger value="reset">Reset database</TabsTrigger>
        </TabsList>

        {/* Company Data */}
        <TabsContent value="company" className="p-6">
          {/* Header actions */}
          <div className="flex items-center gap-6 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </Button>
          </div>

          <h2 className="text-lg mb-4">My company data</h2>

          {/* Form */}
          <div className="grid grid-cols-[220px_1fr] gap-x-6 gap-y-3 max-w-3xl">
            <FormRow label="Name" required>
              <Input className="border-red-500 focus-visible:ring-red-500" />
            </FormRow>

            <FormRow label="Tax number">
              <Input className="max-w-xs" />
            </FormRow>

            <FormRow label="Street name">
              <Input className="h-16" />
            </FormRow>

            <FormRow label="Building number">
              <Input className="max-w-[120px]" />
            </FormRow>

            <FormRow label="Additional street name">
              <Input />
            </FormRow>

            <FormRow label="Plot identification">
              <Input className="max-w-xs" />
            </FormRow>

            <FormRow label="District">
              <Input />
            </FormRow>

            <FormRow label="Postal code">
              <Input className="max-w-[120px]" />
            </FormRow>

            <FormRow label="City">
              <Input />
            </FormRow>

            <FormRow label="State / Province">
              <Input />
            </FormRow>

            <FormRow label="Country" required>
              <Select>
                <SelectTrigger className="border-red-500 focus:ring-red-500">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ng">Nigeria</SelectItem>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Phone number">
              <Input />
            </FormRow>

            <FormRow label="Email">
              <Input type="email" />
            </FormRow>
          </div>

          <Separator className="my-6 bg-slate-700" />

          {/* Bank account */}
          <h3 className="mb-4">Bank account</h3>

          <div className="grid grid-cols-[220px_1fr] gap-x-6 gap-y-3 max-w-3xl">
            <FormRow label="Bank acc. number">
              <Input className="max-w-md" />
            </FormRow>

            <FormRow label="Bank details">
              <Input className="h-16" />
            </FormRow>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Helpers ---------- */

function FormRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Label className="text-slate-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
    </>
  );
}
