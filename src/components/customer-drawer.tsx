"use client";

import {  useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Switch } from "./ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import {
  useAddLoyaltyCard,
  useCreateCustomer,
  useCustomerLoyaltyCards,
  useDeleteLoyaltyCard,
  useUpdateCustomer,
} from "@/hooks/controllers/customers";
import { useAddCustomerDiscount, useCustomerDiscounts } from "@/hooks/controllers/discount";
import Select from "react-select"
import { CSS } from "@dnd-kit/utilities";
interface TreeItem {
  id: string;
  label: string;
  type: "folder" | "tag";
  children?: TreeItem[];
}

interface LoyaltyCard {
  id: string;
  number: string;
}






function DraggableFolder({
  element,
  children,
}: {
  element: TreeViewElement;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: element.id,
      data: {
        type: "TREE_FOLDER",
        item: element,
      },
      disabled: element.isSelectable === false,
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className="relative"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()} // 🔑 CRITICAL
        className="absolute left-0 top-1/2 -translate-y-1/2 cursor-grab text-slate-400 hover:text-white"
      >
        <GripVertical className="size-4" />
      </div>

      <div className="pl-4">{children}</div>
    </div>
  );
}




function DraggableFile({ element }: { element: TreeViewElement }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: element.id,
      data: {
        type: "TREE_ITEM",
        item: element,
      },
      disabled: element.isSelectable === false,
    });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <File value={element.id} isSelectable={element.isSelectable}>
        {element.name}
      </File>
    </div>
  );
}

function RenderTree({ elements }: { elements: TreeViewElement[] }) {
  return (
    <>
      {elements.map((el) => {
        const isFolder = el.children && el.children.length > 0;

        if (isFolder) {
          return (
            <DraggableFolder key={el.id} element={el}>
              <Folder
                value={el.id}
                element={el.name}
                isSelectable={el.isSelectable}
              >
                <RenderTree elements={el.children!} />
              </Folder>
            </DraggableFolder>
          );
        }

        return <DraggableFile key={el.id} element={el} />;
      })}
    </>
  );
}




function DiscountDropZone({

  children,
}: {
  onDrop: (item: TreeItem) => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "DISCOUNT_DROPZONE",
  });

  return (
    <div
      ref={setNodeRef}
      className={`border border-slate-700 rounded-md p-4 transition ${
        isOver ? "bg-slate-700/40" : "bg-slate-800"
      }`}
    >
      {children}
    </div>
  );
}


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData:Customer | null
}

interface DiscountItem {
  id: string;
  label: string;
  value: number;
}



import { Formik, FieldArray, FormikProps } from "formik";
import {
  DndContext,

  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import { GripVertical, Info, X } from "lucide-react";
import { toast } from "react-toastify";
import { Alert, AlertDescription } from "./ui/alert";
import Counter from "./counter";
import { useRootNodes } from "@/hooks/controllers/nodes";
import { File, Folder, Tree, TreeViewElement } from "./ui/file-tree";
import { Customer } from "@/db/schema";

export default function CustomerSupplierDrawer({
  onOpenChange,
  open,
  initialData,
}: Props) {
  const [activeTab, setActiveTab] = useState("General");
  
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [cardInput, setCardInput] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isCustomer, setIsCustomer] = useState(true);
  const [taxExempt, setIsTaxExempt] = useState(false);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const addCustomerDiscount = useAddCustomerDiscount();
  const getLoyaltyCards = useCustomerLoyaltyCards(initialData?.id as string)
  const deletLoyaltyCard = useDeleteLoyaltyCard(initialData?.id as string);

  const getDiscount = useCustomerDiscounts(initialData?.id as string)

  

  const { data: rootGroups = [],  } = useRootNodes();
  const addLoyaltyCardMutation = useAddLoyaltyCard("");
  const formikRef = useRef<FormikProps<{ discounts: DiscountItem[] }>>(null);
  const mapGroupsToTree = (groups: any[]): TreeViewElement[] =>
    groups.map((group) => ({
      id: group.id,
      name: group.name,
      isSelectable: true,
      children: group.children ? mapGroupsToTree(group.children) : [],
    }));
  // General info state
  const [form, setForm] = useState({
    name: "",
    code: "",
    taxNumber: "",
    streetName: "",
    buildingNumber: "",
    additionalStreet: "",
    plotIdentification: "",
    district: "",
    postalCode: "",
    city: "",
    state: "",
    phone: "",
    country: "",
    email: "",
    dueDate: 0,
  });

  const tabs = ["General", "Discounts", "Loyalty cards", "Payment terms"];

  /* ---------- General handlers ---------- */
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------- Loyalty cards handlers ---------- */
  const addCard = () => {
    if (!cardInput.trim()) return;
    setCards((prev) => [
      ...prev,
      { id: crypto.randomUUID(), number: cardInput.trim() },
    ]);
    setCardInput("");
  };


  useEffect(() => {
    if (getLoyaltyCards.data) {
      setCards(
        getLoyaltyCards.data.map((c) => ({
          id: c.id,
          number: c.number,
        })),
      );
    }
  }, [getLoyaltyCards.data]);

useEffect(() => {
  if (initialData?.id && getDiscount.data && formikRef.current) {
    formikRef.current.setValues({
      discounts: getDiscount.data.map((d) => ({
        id: d.productId,
        label: d.productId, // or product name if you join later
        value: d.discountPercent,
      })),
    });
  }
}, [initialData?.id, getDiscount.data]);

  // ---------- Sync initialData when drawer opens ----------
  useEffect(() => {
    if (open && initialData) {
      setForm({
        name: initialData.name || "",
        code: initialData.code || "",
        taxNumber: initialData.taxNumber || "",
        streetName: initialData.streetName || "",
        buildingNumber: initialData.buildingNumber || "",
        additionalStreet: initialData.additionalStreetName || "",
        plotIdentification: initialData.plotIdentification || "",
        district: initialData.district || "",
        postalCode: initialData.postalCode || "",
        city: initialData.city || "",
        state: initialData.stateProvince || "",
        phone: initialData.phoneNumber || "",
        country: initialData.country || "",
        email: initialData.email || "",
        dueDate: initialData.paymentTermsDays || 0,

      });
      setIsActive(initialData.active ?? true);
      setIsCustomer(initialData.customer ?? true);
      setIsTaxExempt(initialData.taxExempt ?? false);
    
      
  
    } else if (!open) {
      // Reset form when closing drawer
      resetForm();
    }
  }, [open, initialData]);

  const resetForm = () => {
    setForm({
      name: "",
      code: "",
      taxNumber: "",
      streetName: "",
      buildingNumber: "",
      additionalStreet: "",
      plotIdentification: "",
      district: "",
      postalCode: "",
      city: "",
      state: "",
      phone: "",
      country: "",
      email: "",
      dueDate: 0,
    });
    setIsActive(true);
    setIsCustomer(true);
    setIsTaxExempt(false);
    setCards([]);
    setCardInput("");
    setSelectedCardId(null);
  };
  const deleteCard = async () => {
    if (!selectedCardId) return;

    if (initialData) {
        await deletLoyaltyCard.mutateAsync(selectedCardId);
    }
    setCards((prev) => prev.filter((c) => c.id !== selectedCardId));
    setSelectedCardId(null);
  };

  /* ---------- Save handler ---------- */
const handleSave = async () => {
  try {
    const customerId = initialData?.id ?? crypto.randomUUID();

    /* ---------------- UPDATE ---------------- */
    if (initialData?.id) {
      // 1. Update customer
      await updateCustomer.mutateAsync({
        id: customerId,
        data: {
          ...form,
          active: isActive,
          customer: isCustomer,
          taxExempt,
        },
      });

      // 2. DELETE ALL loyalty cards
      if (getLoyaltyCards.data?.length) {
        for (const card of getLoyaltyCards.data) {
          await deletLoyaltyCard.mutateAsync(card.id);
        }
      }

      // 3. DELETE ALL discounts
      if (getDiscount.data?.length) {
        for (const discount of getDiscount.data) {
          await addCustomerDiscount.reset(); // ensure clean state
          await addCustomerDiscount.mutateAsync({
            id: discount.id, // doesn't matter, will be deleted anyway
            customerId,
            productId: discount.productId,
            discountPercent: discount.discountPercent,
          });
        }
      }

      // 4. RE-ADD loyalty cards
      for (const card of cards) {
        await addLoyaltyCardMutation.mutateAsync({
          id: crypto.randomUUID(),
          customerId,
          number: card.number,
        });
      }

      // 5. RE-ADD discounts
      if (formikRef.current) {
        const discounts = formikRef.current.values.discounts;

        for (const discount of discounts) {
          await addCustomerDiscount.mutateAsync({
            id: crypto.randomUUID(),
            customerId,
            productId: discount.id,
            discountPercent: discount.value,
          });
        }
      }
    } else {

    /* ---------------- CREATE ---------------- */
      await createCustomer.mutateAsync({
        id: customerId,
        ...form,
        active: isActive,
        customer: isCustomer,
        taxExempt,
      });

      for (const card of cards) {
        await addLoyaltyCardMutation.mutateAsync({
          id: crypto.randomUUID(),
          customerId,
          number: card.number,
        });
      }

      if (formikRef.current) {
        const discounts = formikRef.current.values.discounts;

        for (const discount of discounts) {
          await addCustomerDiscount.mutateAsync({
            id: crypto.randomUUID(),
            customerId,
            productId: discount.id,
            discountPercent: discount.value,
          });
        }
      }
    }

    toast.success(initialData ? "Customer updated" : "Customer added");
    onOpenChange(false);
  } catch (err) {
    console.error(err);
    toast.error("Failed to save customer");
  }
};

  const treeElements = mapGroupsToTree(rootGroups);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      handleOnly={true}
    >
      <DrawerContent className="w-full data-[vaul-drawer-direction=right]:sm:max-w-4xl bg-slate-900 border-l border-slate-700 p-6 flex flex-col gap-4">
        <DrawerHeader>
          <DrawerTitle className="text-white">
            New Customer / Supplier
          </DrawerTitle>
        </DrawerHeader>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-700 ">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-t-md transition ${
                activeTab === tab
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1  overflow-y-auto   py- space-y-5 text-sm flex  flex-col">
          {/* Tab Content */}
          {activeTab === "General" && (
            <div className="max-w-3xl mb-6">
              <h2 className="text-lg font-medium mb-4 text-white">
                General Info
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <Field
                  label="Name"
                  required
                  value={form.name}
                  onChange={(v) => handleChange("name", v)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Code"
                    value={form.code}
                    onChange={(v) => handleChange("code", v)}
                  />
                  <Field
                    label="Tax number"
                    value={form.taxNumber}
                    onChange={(v) => handleChange("taxNumber", v)}
                  />
                </div>
                <Field
                  label="Street name"
                  value={form.streetName}
                  onChange={(v) => handleChange("streetName", v)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Building number"
                    value={form.buildingNumber}
                    onChange={(v) => handleChange("buildingNumber", v)}
                  />
                  <Field
                    label="Additional street name"
                    value={form.additionalStreet}
                    onChange={(v) => handleChange("additionalStreet", v)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Plot identification"
                    value={form.plotIdentification}
                    onChange={(v) => handleChange("plotIdentification", v)}
                  />
                  <Field
                    label="District"
                    value={form.district}
                    onChange={(v) => handleChange("district", v)}
                  />
                </div>
                <Field
                  label="Postal code"
                  value={form.postalCode}
                  onChange={(v) => handleChange("postalCode", v)}
                />
                <Field
                  label="City"
                  value={form.city}
                  onChange={(v) => handleChange("city", v)}
                />
                <Field
                  label="State / Province"
                  value={form.state}
                  onChange={(v) => handleChange("state", v)}
                />
                <Field
                  label="Phone number"
                  value={form.phone}
                  onChange={(v) => handleChange("phone", v)}
                />
                <Field
                  label="Country"
                  value={form.country}
                  onChange={(v) => handleChange("country", v)}
                />
                <Field
                  label="Email"
                  value={form.email}
                  onChange={(v) => handleChange("email", v)}
                />

                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <span>Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isCustomer}
                      onCheckedChange={setIsCustomer}
                    />
                    <span>Customer</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "Discounts" && (
            <Formik
              innerRef={formikRef}
              initialValues={{ discounts: [] as DiscountItem[] }}
              validate={(values) => {
                const errors: { discounts?: { value?: string }[] } = {};
                values.discounts.forEach((d, i) => {
                  if (d.value < 0 || d.value > 100) {
                    if (!errors.discounts) errors.discounts = [];
                    errors.discounts[i] = {
                      value: "Must be between 0 and 100",
                    };
                  }
                });
                return errors;
              }}
              onSubmit={() => {}}
            >
              {({ values, setFieldValue }) => (
                <FieldArray name="discounts">
                  {({ push, remove }) => (
                    <DndContext
                      onDragEnd={({ active, over }) => {
                        if (!over || over.id !== "DISCOUNT_DROPZONE") return;

                        const draggedItem = active.data.current?.item as
                          | TreeViewElement
                          | undefined;
                        if (!draggedItem) return;

                        // prevent duplicates by PRODUCT ID
                        const alreadyAdded = values.discounts.some(
                          (d) => d.id === draggedItem.id,
                        );

                        if (alreadyAdded) {
                          toast.error(
                            `Discount for ${draggedItem.name} already added`,
                          );
                          return;
                        }

                        push({
                          id: draggedItem.id, // ✅ use product id
                          label: draggedItem.name, // display name
                          value: 10, // default %
                        });
                      }}
                    >
                      <div className="grid grid-cols-[360px_1fr] gap-4 min-h-[60dvh]">
                        {/* LEFT */}
                        <div className="border border-slate-700 bg-slate-800 rounded-md p-2">
                          <Tree elements={treeElements}>
                            <RenderTree elements={treeElements} />
                          </Tree>
                        </div>

                        {/* RIGHT */}
                        <DiscountDropZone onDrop={() => {}}>
                          {values.discounts.length === 0 ? (
                            <div className="text-slate-400 text-center">
                              Drag products here
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {values.discounts.map((d, i) => (
                                <div
                                  key={d.id}
                                  className="flex justify-between items-center bg-slate-700 px-3 py-2 rounded"
                                >
                                  <span className="text-xs text-white">
                                    {d.label}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="number"
                                      className="w-16 bg-slate-800 border border-slate-50 pl-2 text-white rounded"
                                      value={d.value}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `discounts.${i}.value`,
                                          Number(e.target.value),
                                        )
                                      }
                                    />
                                    %
                                    <button
                                      onClick={() => remove(i)}
                                      className="text-xs text-red-400"
                                    >
                                      <X />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </DiscountDropZone>
                      </div>
                    </DndContext>
                  )}
                </FieldArray>
              )}
            </Formik>
          )}

          {activeTab === "Loyalty cards" && (
            <div className="mb-6">
              <p className="text-sm text-slate-300 mb-4">
                Enter customer loyalty cards
              </p>

              <div className="flex items-center gap-4 mb-3">
                <input
                  value={cardInput}
                  onChange={(e) => setCardInput(e.target.value)}
                  placeholder="Card number"
                  className="w-64 bg-slate-800 border border-slate-600 px-3 py-2 text-sm rounded outline-none focus:ring-2 focus:ring-slate-500"
                />

                <button
                  onClick={addCard}
                  className="flex items-center gap-1 text-sm text-slate-300 hover:text-white"
                >
                  <span className="text-lg">＋</span> Add card
                </button>

                <button
                  onClick={deleteCard}
                  disabled={!selectedCardId}
                  className="flex items-center gap-1 text-sm text-slate-400 disabled:opacity-40 hover:text-white"
                >
                  <span className="text-lg">🗑</span> Delete
                </button>
              </div>

              <div className="border border-slate-700 bg-slate-800 rounded-md h-90 overflow-auto">
                {cards.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    No loyalty cards
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-700">
                    {cards.map((card) => (
                      <li
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`px-4 py-2 cursor-pointer text-sm ${
                          selectedCardId === card.id
                            ? "bg-slate-600 text-white"
                            : "hover:bg-slate-700"
                        }`}
                      >
                        {card.number}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === "Payment terms" && (
            <div className="text-slate-300 mb-6 space-y-6">
              <Alert className="flex items-center gap-3 bg-slate-800 border-slate-700 text-slate-100 rounded-none">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                  <Info className="h-4 w-4" />
                </div>
                <AlertDescription className="text-sm text-sky-300 flex items-center">
                  Use due date period to set number of days before transaction
                  must be paid for each unpaid sale assigned to this customer
                </AlertDescription>
              </Alert>

              <div>
                <p>Due date period</p>
                <Counter
                  initialValue={form.dueDate}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    setForm((prev) => {
                      return { ...prev, dueDate: val };
                    })
                  }
                />
              </div>

              <div className="flex gap-2">
                <Switch checked={taxExempt} onCheckedChange={setIsTaxExempt} />
                <span>Tax exempt</span>
              </div>
              <div className="max-w-50.5">
                <p className="mb-2">Price list</p>
                <Select
                  options={[]}
                  className="bg-transparent"
                  styles={{
                    control: (props) => {
                      return {
                        ...props,
                        backgroundColor: "transparent",
                        color: "white",
                      };
                    },
                    input: (props) => {
                      return {
                        ...props,
                        backgroundColor: "transparent",
                        color: "white",
                      };
                    },
                    menu: (props) => {
                      return {
                        ...props,
                        backgroundColor: "transparent",
                        color: "white",
                      };
                    },
                  }}
                />
              </div>
            </div>
          )}
        </ScrollArea>
        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button className="px-6 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600">
            Cancel
          </button>
          <button
            disabled={createCustomer.isPending || updateCustomer.isPending}
            onClick={handleSave}
            className="px-6 py-2 bg-slate-600 rounded hover:bg-slate-500 text-white"
          >
            {initialData ? "Update" : "Save"}
           
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------- Field helper ---------- */
function Field({
  label,
  value = "",
  onChange,
  required = false,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
      />
    </div>
  );
}


