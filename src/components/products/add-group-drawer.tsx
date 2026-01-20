"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface AddGroupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { id: string; name: string }[];
  onSave: (name: string, parentId?: string) => void;
}

export function AddGroupDrawer({
  open,
  onOpenChange,
  groups,
  onSave,
}: AddGroupDrawerProps) {
  const [name, setName] = React.useState("");
  const [parentId, setParentId] = React.useState<string | undefined>();

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), parentId);
    setName("");
    setParentId(undefined);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-w-md bg-slate-900 border-l border-slate-700 p-6 flex flex-col gap-4">
        <DrawerHeader>
          <DrawerTitle className="text-white">New Group</DrawerTitle>
        </DrawerHeader>

        <Tabs defaultValue="details">
          <TabsList className="bg-transparent mb-0">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-sky-500 rounded-none data-[state=active]:text-white text-white"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="img"
              className="data-[state=active]:bg-sky-500 rounded-none data-[state=active]:text-white text-white"
            >
              Image & Color
            </TabsTrigger>
          </TabsList>
          <Separator />

          <TabsContent value="details">
            <div className="flex flex-col gap-4">
              {/* Group Name */}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">Name</label>
                <Input
                  placeholder="Enter group name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Parent Group */}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-400">groups</label>
                <Select onValueChange={setParentId} value={parentId}>
                  <SelectTrigger
                    className="w-full
              "
                  >
                    <SelectValue placeholder="No parent (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="img">
            {/* Colors */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Colors</label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800">
                  <SelectItem
                    value="transparent"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 border border-slate-400 rounded-sm bg-transparent"></div>
                    Transparent
                  </SelectItem>
                  <SelectItem
                    value="slate"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-slate-500"></div>
                    Slate
                  </SelectItem>
                  <SelectItem
                    value="red"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-red-500"></div>
                    Red
                  </SelectItem>
                  <SelectItem
                    value="green"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-green-500"></div>
                    Green
                  </SelectItem>
                  <SelectItem
                    value="blue"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-blue-500"></div>
                    Blue
                  </SelectItem>
                  <SelectItem
                    value="yellow"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-yellow-400"></div>
                    Yellow
                  </SelectItem>
                  <SelectItem
                    value="indigo"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-indigo-500"></div>
                    Indigo
                  </SelectItem>
                  <SelectItem
                    value="purple"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-purple-500"></div>
                    Purple
                  </SelectItem>
                  <SelectItem
                    value="pink"
                    className="flex items-center gap-2 focus:bg-sky-200"
                  >
                    <div className="w-4 h-4 rounded-sm bg-pink-500"></div>
                    Pink
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload */}
            <div className="flex flex-col gap-4 mt-4 ">
              <label className="text-sm text-slate-400">Image</label>

              <div className="grid grid-cols-2 gap-x-3">
                <Button
                  onClick={() => document.getElementById("img-input")?.click()}
                  variant={"outline"}
                  className="bg-transparent text-white"
                >
                  Browse
                </Button>
                <Button
                  onClick={() => document.getElementById("img-input")?.click()}
                  variant={"secondary"}
                  disabled
                >
                  Clear
                </Button>
              </div>
              <input type="file" id="img-input" hidden />
            </div>
          </TabsContent>
        </Tabs>

        <DrawerFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
