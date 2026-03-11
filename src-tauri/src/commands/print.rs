// In your Rust backend
#[tauri::command]
fn print_receipt(text: String) {
    use escposify::printer::Printer;
    use escposify::device::File;

    // On macOS, printers often appear as /dev/usb/lp0 or similar
    let device = File::new("/dev/usb/lp0"); 
    let mut printer = Printer::new(device, None, None);

    printer
        .font("C")
        .align("center")
        .text(text)
        .cut()
        .flush();
}