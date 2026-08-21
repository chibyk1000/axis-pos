"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/app-select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { toast } from "react-toastify";
import { useEffect,  useState } from "react";
import { useRootWithoutChildren } from "@/hooks/controllers/nodes";
import { uploadImage } from "@/helpers/image";
import type { UploadedImage } from "@/helpers/image";

interface AddGroupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  onSave: (
    name: string,
    image: UploadedImage | null,
    displayName: string,
    parentId?: string,
    color?: string,
      id?: string
  ) => void;
  initialData: {
    id: string;
    name: string;
    displayName: string | null;
    type: "group" | "product";
    parentId: string | null;
    image: string | null;
    color: string | null;
    position: number;
    createdAt: Date;
    updatedAt: Date | null;
  };

}

export function AddGroupDrawer({
  open,
  onOpenChange,
initialData,
  onSave,
}: AddGroupDrawerProps) {
   const isEdit = !!initialData;

   const [name, setName] = useState("");
   const [color, setColor] = useState<string | undefined>();
   const [parentId, setParentId] = useState<string | undefined>("root");
  const [image, setImage] = useState<UploadedImage | null>(null);


   const { data = [] } = useRootWithoutChildren();


   /* ---------------------------
    * Populate form on edit
    * -------------------------- */
useEffect(() => {
  if (open && initialData) {
    setName(initialData.name);
    setColor(initialData.color ?? undefined);
    setParentId(initialData.parentId ?? "root");

    if (initialData.image) {
      setImage({
        path: initialData.image,
        base64: "",
        previewUrl: initialData.image,
        name: "existing-image",
      });
    }
  }
}, [open, initialData]);


   /* ---------------------------
    * Reset only on close (create mode)
    * -------------------------- */
   useEffect(() => {
     if (!open && !isEdit) {
       setName("");
       setColor(undefined);
       setParentId("root");
       setImage(null);
     }
   }, [open, isEdit]);

   const handleSave = () => {
     if (!name.trim()) {
       toast.error("Name is required");
       return;
     }

     const parent = data.find((d: any) => d.id === parentId);
     const displayName = parent ? `${parent.displayName}/${name}` : name;

 onSave(
   name.trim(),
   image,
   displayName,
   parentId,
   color,
   initialData?.id,
 );


     onOpenChange(false);
   };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-w-md bg-stone-50 dark:bg-stone-900 border-l border-stone-200 dark:border-stone-700 p-6 flex flex-col gap-4">
        <DrawerHeader>
          <DrawerTitle className="text-stone-900 dark:text-white">New Group</DrawerTitle>
        </DrawerHeader>

        <Tabs defaultValue="details">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger
              value="details"
              className="rounded-none data-[state=active]:bg-amber-500 data-[state=active]:text-stone-900 dark:text-white text-stone-900 dark:text-white"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="img"
              className="rounded-none data-[state=active]:bg-amber-500 data-[state=active]:text-stone-900 dark:text-white text-stone-900 dark:text-white"
            >
              Image & Color
            </TabsTrigger>
          </TabsList>

          <Separator />

          {/* DETAILS TAB */}
          <TabsContent value="details">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-stone-500 dark:text-stone-400">Name</label>
                <Input
                  placeholder="Enter group name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-stone-500 dark:text-stone-400">Parent group</label>
                <AppSelect
                  value={parentId}
                  onChange={(val) => setParentId(val)}
                  placeholder="No parent (top-level)"
                  isClearable
                  options={[
                    { value: "root", label: "No parent (top-level)" },
                    ...(data?.map((g: any) => ({
                      value: g.id,
                      label: g.displayName,
                    })) || []),
                  ]}
                />
              </div>
            </div>
          </TabsContent>

          {/* IMAGE & COLOR TAB */}
          <TabsContent value="img">
            <div className="flex flex-col gap-4">
              {/* Color */}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-stone-500 dark:text-stone-400">Color</label>
                <AppSelect
                  value={color}
                  onChange={(val) => setColor(val)}
                  placeholder="Select color"
                  isClearable
                  options={[
                    { value: "transparent", label: "Transparent", bg: "bg-transparent" },
                    { value: "slate", label: "Slate", bg: "bg-slate-500" },
                    { value: "red", label: "Red", bg: "bg-red-500" },
                    { value: "green", label: "Green", bg: "bg-green-500" },
                    { value: "blue", label: "Blue", bg: "bg-blue-500" },
                    { value: "yellow", label: "Yellow", bg: "bg-yellow-400" },
                    { value: "indigo", label: "Indigo", bg: "bg-indigo-500" },
                    { value: "purple", label: "Purple", bg: "bg-purple-500" },
                    { value: "pink", label: "Pink", bg: "bg-pink-500" },
                  ]}
                  formatOptionLabel={(option: any) => (
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-sm border border-stone-600 ${option.bg}`} />
                      <span>{option.label}</span>
                    </div>
                  )}
                />
              </div>

              {/* Image */}
              {/* Image */}
              <div className="flex flex-col gap-2">
                <label className="text-sm text-stone-500 dark:text-stone-400">Image</label>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="bg-transparent text-stone-900 dark:text-white"
                    onClick={async () => {
                      const result = await uploadImage();
                      if (!result) return;
                      setImage(result);
                    }}
                  >
                    Browse
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={!image}
                    onClick={() => setImage(null)}
                  >
                    Clear
                  </Button>
                </div>

                {image && (
                  <div className="flex items-center gap-3 mt-2">
                    
                    <img
                      src={image.previewUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded border border-stone-200 dark:border-stone-700"
                    />
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {image.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DrawerFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{isEdit ? "Update" : "Save"}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
