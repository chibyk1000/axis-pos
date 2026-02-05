import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";

export type UploadedImage = {
  path: string;
  base64: string;
  previewUrl: string;
  name: string;
};

export async function uploadImage(): Promise<UploadedImage | null> {
  const file = await open({
    multiple: false,
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp"],
      },
    ],
  });

  if (!file || Array.isArray(file)) return null;

    const bytes = await readFile(file);
    
  const base64 = btoa(
    bytes.reduce((data, byte) => data + String.fromCharCode(byte), ""),
  );
console.log(convertFileSrc(file));

  return {
    path: file,
    base64,
    previewUrl: convertFileSrc(file),
    name: file.split("/").pop() ?? "image",
  };
}
