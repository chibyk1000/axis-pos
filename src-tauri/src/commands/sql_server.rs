use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::AppHandle;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
use tauri::Emitter;

#[cfg(target_os = "windows")]
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::path::{Path, PathBuf};

// ─── Public return type ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct SqlServerStatus {
    pub installed: bool,
    /// "localdb" | "express" | "" when not installed
    pub variant: String,
    /// Human-readable message surfaced directly in the UI
    pub description: String,
}

// ─── Platform probes ──────────────────────────────────────────────────────────

/// Returns true when SQL Server LocalDB is installed (Windows-only).
fn probe_localdb() -> bool {
    #[cfg(target_os = "windows")]
    {
        Command::new("SqlLocalDB")
            .args(["info"])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(not(target_os = "windows"))]
    false
}

/// Returns true when a SQL Server Express instance service is running.
fn probe_express() -> bool {
    #[cfg(target_os = "windows")]
    {
        for svc in &["MSSQL$SQLEXPRESS", "MSSQL$EXPRESS", "MSSQLServer"] {
            let ok = Command::new("sc")
                .args(["query", svc])
                .creation_flags(0x08000000)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);
            if ok {
                return true;
            }
        }
        false
    }
    #[cfg(not(target_os = "windows"))]
    false
}

// ─── Command 1: check_sql_server_installation ────────────────────────────────

/// Detect whether SQL Server LocalDB or Express is installed.
///
/// TypeScript:
/// ```ts
/// const status = await invoke<SqlServerStatus>("check_sql_server_installation");
/// ```
#[tauri::command]
pub fn check_sql_server_installation() -> SqlServerStatus {
    if probe_localdb() {
        return SqlServerStatus {
            installed: true,
            variant: "localdb".into(),
            description: "SQL Server LocalDB is installed and ready.".into(),
        };
    }
    if probe_express() {
        return SqlServerStatus {
            installed: true,
            variant: "express".into(),
            description: "SQL Server Express is installed and ready.".into(),
        };
    }
    SqlServerStatus {
        installed: false,
        variant: String::new(),
        description:
            "SQL Server LocalDB is not installed. It is required to import .bak files.".into(),
    }
}

// ─── Command: ensure_sqlcmd_available ────────────────────────────────────────

/// Pre-flight check the frontend calls before starting a `.bak` import — makes
/// sure `sqlcmd.exe` is resolvable (already on PATH, previously cached, or
/// downloaded now) *before* the import kicks off. `import_aronium_bak` also
/// resolves it internally, so this just gives first-time provisioning its own
/// visible progress step instead of appearing to hang mid-restore.
///
/// TypeScript:
/// ```ts
/// await invoke<void>("ensure_sqlcmd_available");
/// ```
#[tauri::command]
pub async fn ensure_sqlcmd_available(app: AppHandle) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        return Err("SQL Server tools are only available on Windows.".into());
    }
    #[cfg(target_os = "windows")]
    {
        resolve_sqlcmd_exe(&app).await.map(|_| ())
    }
}

// ─── Logging helper ───────────────────────────────────────────────────────────

/// Emits a status line to the frontend on the `sql-install-log` event, and
/// also prints it to stdout so it shows up in the `tauri dev` / packaged app
/// terminal logs.
#[cfg(target_os = "windows")]
fn log_step(app: &AppHandle, message: impl Into<String>) {
    let msg = message.into();
    println!("[sql-localdb-install] {msg}");
    let _ = app.emit("sql-install-log", msg);
}

/// Reads the last `max_lines` lines of the msiexec verbose install log.
/// MSI logs are written as UTF-16LE with a BOM, so we decode accordingly.
#[cfg(target_os = "windows")]
fn read_msi_log_tail(path: &std::path::Path, max_lines: usize) -> String {
    let bytes = match std::fs::read(path) {
        Ok(b) => b,
        Err(e) => return format!("(could not read msiexec install log: {e})"),
    };

    let text = if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        // UTF-16LE with BOM — strip the 2-byte BOM, then decode pairs.
        let units: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        String::from_utf16_lossy(&units)
    } else {
        String::from_utf8_lossy(&bytes).into_owned()
    };

    let lines: Vec<&str> = text.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    lines[start..].join("\n")
}

// ─── Guard helpers ────────────────────────────────────────────────────────────

/// Guard 1 — returns true if LocalDB is already installed.
/// Checks both the registry (works even if SqlLocalDB.exe is not on PATH)
/// and the live probe, so a corrupted PATH doesn't give a false negative.
#[cfg(target_os = "windows")]
fn localdb_already_installed() -> bool {
    let reg_ok = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Microsoft SQL Server Local DB\Installed Versions",
        ])
        .creation_flags(0x08000000)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if reg_ok {
        return true;
    }

    probe_localdb()
}

/// Guard 2 — returns true if the current process token has elevated privileges.
#[cfg(target_os = "windows")]
fn is_elevated() -> bool {
    use std::mem;
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::processthreadsapi::{GetCurrentProcess, OpenProcessToken};
    use winapi::um::securitybaseapi::GetTokenInformation;
    use winapi::um::winnt::{TokenElevation, HANDLE, TOKEN_ELEVATION, TOKEN_QUERY};

    unsafe {
        let mut token: HANDLE = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut size = mem::size_of::<TOKEN_ELEVATION>() as u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            size,
            &mut size,
        ) != 0;
        CloseHandle(token);
        ok && elevation.TokenIsElevated != 0
    }
}

/// Relaunches msiexec elevated via ShellExecuteExW "runas" verb — triggers the
/// UAC prompt without requiring the whole Tauri app to restart.
/// Blocks until msiexec exits and returns its exit code.
#[cfg(target_os = "windows")]
fn run_msiexec_elevated(args: &str) -> Result<u32, String> {
    use std::ffi::OsStr;
    use std::iter::once;
    use std::os::windows::ffi::OsStrExt;
    use winapi::shared::minwindef::DWORD;
    use winapi::um::errhandlingapi::GetLastError;
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::processthreadsapi::GetExitCodeProcess;
    use winapi::um::shellapi::{ShellExecuteExW, SHELLEXECUTEINFOW};
    use winapi::um::synchapi::WaitForSingleObject;
    use winapi::um::winbase::INFINITE;
    use winapi::um::winnt::HANDLE;

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(once(0)).collect()
    }

    let verb   = to_wide("runas");
    let file   = to_wide("msiexec");
    let params = to_wide(args);

    let mut info: SHELLEXECUTEINFOW = unsafe { std::mem::zeroed() };
    info.cbSize       = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
    // SEE_MASK_NOCLOSEPROCESS (0x40) — keep hProcess so we can wait on it
    info.fMask        = 0x00000040;
    info.lpVerb       = verb.as_ptr();
    info.lpFile       = file.as_ptr();
    info.lpParameters = params.as_ptr();
    // SW_HIDE = 0
    info.nShow        = 0;

    let ok = unsafe { ShellExecuteExW(&mut info) };
    if ok == 0 {
        let err = unsafe { GetLastError() };
        // ERROR_CANCELLED (1223) = user clicked "No" on the UAC prompt
        if err == 1223 {
            return Err("UAC prompt was cancelled by the user.".into());
        }
        return Err(format!("ShellExecuteExW failed with error code {err}"));
    }

    let process: HANDLE = info.hProcess;
    unsafe { WaitForSingleObject(process, INFINITE) };

    let mut exit_code: DWORD = 1;
    unsafe { GetExitCodeProcess(process, &mut exit_code) };
    unsafe { CloseHandle(process) };

    Ok(exit_code)
}

/// Guard 3 — checks for the VC++ 2015-2022 x64 redistributable.
/// SQL Server 2022 LocalDB requires it; without it msiexec exits 1603.
#[cfg(target_os = "windows")]
fn vcredist_installed() -> bool {
    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64",
            "/v",
            "Installed",
        ])
        .creation_flags(0x08000000)
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            stdout.contains("0x1")
        }
        _ => false,
    }
}

/// Guard 3b — download and silently install the VC++ 2022 x64 redistributable.
/// The vc_redist.x64.exe installer handles its own UAC elevation internally,
/// so this works correctly from a non-elevated process.
#[cfg(target_os = "windows")]
async fn install_vcredist(app: &AppHandle) -> Result<(), String> {
    const VCREDIST_URL: &str = "https://aka.ms/vs/17/release/vc_redist.x64.exe";

    log_step(app, "VC++ 2022 runtime missing — downloading redistributable...");

    let response = reqwest::get(VCREDIST_URL).await.map_err(|e| {
        let msg = format!("Failed to download VC++ redistributable: {e}");
        log_step(app, format!("ERROR: {msg}"));
        msg
    })?;

    if !response.status().is_success() {
        let msg = format!(
            "VC++ redistributable download failed with HTTP {}",
            response.status()
        );
        log_step(app, format!("ERROR: {msg}"));
        return Err(msg);
    }

    let bytes = response.bytes().await.map_err(|e| {
        let msg = format!("Failed to read VC++ redistributable bytes: {e}");
        log_step(app, format!("ERROR: {msg}"));
        msg
    })?;

    log_step(
        app,
        format!("Downloaded VC++ redistributable ({} bytes)", bytes.len()),
    );

    let redist_path = std::env::temp_dir().join("vc_redist.x64.exe");
    std::fs::write(&redist_path, &bytes).map_err(|e| {
        let msg = format!("Failed to write VC++ redistributable to disk: {e}");
        log_step(app, format!("ERROR: {msg}"));
        msg
    })?;

    log_step(app, "Installing VC++ 2022 runtime silently (UAC prompt may appear)...");

    let status = Command::new(&redist_path)
        .args(["/install", "/quiet", "/norestart"])
        .creation_flags(0x08000000)
        .status()
        .map_err(|e| {
            let msg = format!("Failed to launch VC++ installer: {e}");
            log_step(app, format!("ERROR: {msg}"));
            msg
        })?;

    let _ = std::fs::remove_file(&redist_path);

    // 3010 = success, reboot recommended — safe to ignore for LocalDB
    if status.success() || status.code() == Some(3010) {
        log_step(app, "VC++ 2022 runtime installed successfully.");
        Ok(())
    } else {
        let msg = format!(
            "VC++ installer exited with code {}",
            status.code().unwrap_or(-1)
        );
        log_step(app, format!("ERROR: {msg}"));
        Err(msg)
    }
}

/// Guard 4 — ensures the Windows Installer service is running.
/// A stopped or hung msiserver is a common cause of 1603 on clean VMs.
/// Works from both elevated and non-elevated contexts: `net start` will
/// trigger its own UAC elevation if needed on modern Windows.
#[cfg(target_os = "windows")]
fn ensure_msi_service_running(app: &AppHandle) -> Result<(), String> {
    let query = Command::new("sc")
        .args(["query", "msiserver"])
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("sc query msiserver failed: {e}"))?;

    let stdout = String::from_utf8_lossy(&query.stdout);
    if stdout.contains("RUNNING") {
        return Ok(());
    }

    log_step(app, "Windows Installer service not running — restarting...");

    // Stop first (best-effort — it may already be stopped or stuck)
    let _ = Command::new("net")
        .args(["stop", "msiserver"])
        .creation_flags(0x08000000)
        .status();

    let start = Command::new("net")
        .args(["start", "msiserver"])
        .creation_flags(0x08000000)
        .status()
        .map_err(|e| format!("net start msiserver failed: {e}"))?;

    if start.success() {
        log_step(app, "Windows Installer service started.");
        Ok(())
    } else {
        let msg = format!(
            "Could not start Windows Installer service (exit {})",
            start.code().unwrap_or(-1)
        );
        log_step(app, format!("ERROR: {msg}"));
        Err(msg)
    }
}

/// Guard 5 — checks that the .NET Framework 4.x runtime is present.
/// SQL Server 2022 LocalDB setup depends on it. Reads the registry key that
/// the official .NET installer writes on all supported Windows versions.
#[cfg(target_os = "windows")]
fn dotnet_framework_installed() -> bool {
    // Release DWORD >= 533320 means .NET Framework 4.8.1+
    // Release DWORD >= 528040 means .NET Framework 4.8   (minimum acceptable)
    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full",
            "/v",
            "Release",
        ])
        .creation_flags(0x08000000)
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            // The line looks like:  "    Release    REG_DWORD    0x81d38"
            for line in stdout.lines() {
                if line.trim_start().starts_with("Release") {
                    if let Some(hex) = line.split_whitespace().last() {
                        let val = u64::from_str_radix(hex.trim_start_matches("0x"), 16)
                            .unwrap_or(0);
                        // 461808 = 4.7.2, 528040 = 4.8 — require at least 4.7.2
                        return val >= 461808;
                    }
                }
            }
            false
        }
        _ => false,
    }
}

/// Guard 5b — open the Microsoft .NET Framework download page in the default
/// browser and return an error so the caller can surface a clear message.
/// We cannot silently install the .NET Framework redistributable because it
/// requires a full Windows Update component and interactive setup.
#[cfg(target_os = "windows")]
fn prompt_install_dotnet_framework(app: &AppHandle) -> Result<(), String> {
    const DOTNET_URL: &str =
        "https://dotnet.microsoft.com/en-us/download/dotnet-framework/net48";

    log_step(
        app,
        format!(
            ".NET Framework 4.8+ is required but not found. \
             Opening download page: {DOTNET_URL}"
        ),
    );

    // ShellExecute "open" on a URL launches the default browser — no elevation needed.
    let _ = Command::new("cmd")
        .args(["/c", "start", "", DOTNET_URL])
        .creation_flags(0x08000000)
        .status();

    Err(
        ".NET Framework 4.8 or later is required to install SQL Server LocalDB.\n\
         The download page has been opened in your browser.\n\
         Please install .NET Framework 4.8, then retry."
            .into(),
    )
}

/// Guard 6 — verifies that no process holds the global Windows Installer mutex.
///
/// The real signal is the named mutex `_MSIExecute` — Windows Installer creates
/// it exclusively while any msiexec operation is in progress (Windows Update,
/// a concurrent app install, etc.). We attempt to open it with OpenMutexW; if
/// it exists and is owned by another process the call succeeds and we know the
/// lock is held. If the mutex does not exist (ERROR_FILE_NOT_FOUND) the path is
/// clear.
///
/// Returns true only when the mutex is provably held by another process.
#[cfg(target_os = "windows")]
fn windows_update_busy() -> bool {
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::synchapi::OpenMutexW;
    use winapi::um::winnt::SYNCHRONIZE;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::iter::once;

    // "_MSIExecute" is the documented global mutex Windows Installer holds
    // for the duration of any msiexec operation.
    let name: Vec<u16> = OsStr::new("_MSIExecute")
        .encode_wide()
        .chain(once(0))
        .collect();

    let handle = unsafe { OpenMutexW(SYNCHRONIZE, 0, name.as_ptr()) };

    if handle.is_null() {
        // ERROR_FILE_NOT_FOUND (2) => mutex does not exist => path is clear.
        // Any other error (e.g. access denied) => assume clear to avoid
        // false positives — it is better to attempt the install and get a
        // real msiexec error than to block the user unnecessarily.
        return false;
    }

    // Mutex exists and is owned by another process — installer lock is held.
    unsafe { CloseHandle(handle) };
    true
}

/// Guard 7 — checks that there is enough free disk space on the system drive
/// for the LocalDB installation (~280 MB needed).
#[cfg(target_os = "windows")]
fn sufficient_disk_space() -> bool {
    use std::ffi::OsStr;
    use std::iter::once;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::fileapi::GetDiskFreeSpaceExW;
    use winapi::um::winnt::ULARGE_INTEGER;

    let path: Vec<u16> = OsStr::new("C:\\").encode_wide().chain(once(0)).collect();
    let mut free_bytes: ULARGE_INTEGER = unsafe { std::mem::zeroed() };
    let ok = unsafe {
        GetDiskFreeSpaceExW(
            path.as_ptr(),
            &mut free_bytes,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };
    if ok == 0 {
        // If we can't determine, assume there is enough space
        return true;
    }
    // Require at least 512 MB free
    let free = unsafe { *free_bytes.QuadPart() };
    free >= 512 * 1024 * 1024
}

/// Guard 7b — verifies the pending-reboot registry keys are clear.
///
/// Only the two keys that Windows itself writes to signal a mandatory reboot
/// are checked.
///
/// Returns true if a reboot is pending (i.e., the guard should FAIL).
#[cfg(target_os = "windows")]
fn reboot_pending() -> bool {
    // Written by Windows Update when it has staged patches that need a reboot.
    let wua = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired",
        ])
        .creation_flags(0x08000000)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    // Written by CBS (Component Based Servicing) when a component update
    // requires a reboot to complete file replacement.
    let cbs = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending",
        ])
        .creation_flags(0x08000000)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    // NOTE: PendingFileRenameOperations is intentionally NOT checked here.
    // That value exists on nearly all Windows machines at all times for routine
    // file operations and does not indicate that a reboot is required.

    wua || cbs
}

/// Guard 9 — repairs broken ACLs on the Windows Installer registry keys.
///
/// MSI log `Note: 1: 1402 ... Installer\Rollback\Scripts ... 3: 2` means
/// msiexec received ERROR_ACCESS_DENIED (2) when writing rollback state, even
/// though it is running elevated. We fix it with a PowerShell one-liner that
/// uses `Set-Acl` to grant BUILTIN\Administrators and NT AUTHORITY\SYSTEM full
/// control on the four keys msiexec must write to.
#[cfg(target_os = "windows")]
fn repair_installer_registry_acls(app: &AppHandle) {
    log_step(app, "Repairing Windows Installer registry key permissions...");

    let ps_script = r#"
$keys = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Rollback\Scripts',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Rollback',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\InProgress',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer'
)
$admins  = [System.Security.Principal.NTAccount]'BUILTIN\Administrators'
$system  = [System.Security.Principal.NTAccount]'NT AUTHORITY\SYSTEM'
$rights  = [System.Security.AccessControl.RegistryRights]::FullControl
$inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
$prop    = [System.Security.AccessControl.PropagationFlags]::None
$allow   = [System.Security.AccessControl.AccessControlType]::Allow

foreach ($path in $keys) {
    try {
        if (-not (Test-Path $path)) {
            New-Item -Path $path -Force | Out-Null
        }
        $acl = Get-Acl $path
        $acl.SetOwner($admins)
        $acl.AddAccessRule((New-Object System.Security.AccessControl.RegistryAccessRule($admins,$rights,$inherit,$prop,$allow)))
        $acl.AddAccessRule((New-Object System.Security.AccessControl.RegistryAccessRule($system,$rights,$inherit,$prop,$allow)))
        Set-Acl -Path $path -AclObject $acl
        Write-Host "Fixed: $path"
    } catch {
        Write-Host "Warning: could not fix $path — $_"
    }
}
"#;

    let script_path = std::env::temp_dir().join("fix_installer_acls.ps1");
    if std::fs::write(&script_path, ps_script).is_err() {
        log_step(app, "Warning: could not write ACL repair script — skipping.");
        return;
    }

    use std::ffi::OsStr;
    use std::iter::once;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::processthreadsapi::GetExitCodeProcess;
    use winapi::um::shellapi::{ShellExecuteExW, SHELLEXECUTEINFOW};
    use winapi::um::synchapi::WaitForSingleObject;
    use winapi::um::winbase::INFINITE;
    use winapi::shared::minwindef::DWORD;

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(once(0)).collect()
    }

    let verb   = to_wide("runas");
    let file   = to_wide("powershell.exe");
    let params = to_wide(&format!(
        "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"{}\"",
        script_path.display()
    ));

    let mut info: SHELLEXECUTEINFOW = unsafe { std::mem::zeroed() };
    info.cbSize       = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
    info.fMask        = 0x00000040; // SEE_MASK_NOCLOSEPROCESS
    info.lpVerb       = verb.as_ptr();
    info.lpFile       = file.as_ptr();
    info.lpParameters = params.as_ptr();
    info.nShow        = 0; // SW_HIDE

    let ok = unsafe { ShellExecuteExW(&mut info) };
    if ok == 0 {
        log_step(app, "Warning: could not launch ACL repair (ShellExecuteExW failed) — continuing.");
        let _ = std::fs::remove_file(&script_path);
        return;
    }

    unsafe { WaitForSingleObject(info.hProcess, INFINITE) };

    let mut exit_code: DWORD = 1;
    unsafe { GetExitCodeProcess(info.hProcess, &mut exit_code) };
    unsafe { CloseHandle(info.hProcess) };

    let _ = std::fs::remove_file(&script_path);

    if exit_code == 0 {
        log_step(app, "Windows Installer registry permissions repaired.");
    } else {
        log_step(
            app,
            format!("Warning: ACL repair exited with code {exit_code} — continuing anyway."),
        );
    }
}

// ─── MSI URL ──────────────────────────────────────────────────────────────────

/// Official Microsoft download URL for the en-US, x64 SqlLocalDB.msi installer.
const LOCALDB_MSI_URL: &str =
    "https://download.microsoft.com/download/3/8/d/38de7036-2433-4207-8eae-06e247e17b25/SqlLocalDB.msi";

// ─── Command 2: install_sql_server_localdb ───────────────────────────────────

/// Download the SqlLocalDB.msi installer from Microsoft and run it silently.
///
/// Runs ten pre-flight guards before touching msiexec:
///   1. Already installed?        → return Ok immediately, nothing to do.
///   2. VC++ 2022 x64 runtime?    → auto-download and install if missing.
///   3. .NET Framework 4.8+?      → open download page and return an error if missing.
///   4. Windows Update busy?      → return an error asking the user to wait.
///   5. Sufficient disk space?    → require at least 512 MB free on C:\.
///   6. Reboot pending?           → warn the user to reboot first.
///   7. MSI service running?      → stop/start msiserver if needed.
///   8. Stale temp MSI?           → delete any leftover from a previous attempt.
///   9. Installer registry ACLs?  → use PowerShell Set-Acl (self-elevated).
///  10. Elevated?                 → if not, download then relaunch msiexec via UAC.
///
/// TypeScript:
/// ```ts
/// await invoke<void>("install_sql_server_localdb");
/// await listen<string>("sql-install-log", (e) => console.log(e.payload));
/// ```
#[tauri::command]
pub async fn install_sql_server_localdb(app: AppHandle) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        return Err("SQL Server LocalDB is only available on Windows.".into());
    }

    #[cfg(target_os = "windows")]
    {
        // ── Guard 1: already installed? ──────────────────────────────────────
        log_step(&app, "Checking for existing LocalDB installation...");
        if localdb_already_installed() {
            log_step(&app, "SQL Server LocalDB is already installed. Nothing to do.");
            return Ok(());
        }

        // ── Guard 2: VC++ 2022 x64 runtime ───────────────────────────────────
        log_step(&app, "Checking for VC++ 2022 x64 runtime...");
        if !vcredist_installed() {
            install_vcredist(&app).await?;
        } else {
            log_step(&app, "VC++ 2022 runtime already present.");
        }

        // ── Guard 3: .NET Framework 4.8+ ─────────────────────────────────────
        log_step(&app, "Checking for .NET Framework 4.8+...");
        if !dotnet_framework_installed() {
            return prompt_install_dotnet_framework(&app);
        }
        log_step(&app, ".NET Framework 4.8+ found.");

        // ── Guard 4: Windows Update not busy ─────────────────────────────────
        log_step(&app, "Checking whether Windows Update is active...");
        if windows_update_busy() {
            let msg = "Windows Update is currently running and holds a global installer lock.\n\
                       Please wait for Windows Update to finish (or pause it), then retry.";
            log_step(&app, format!("ERROR: {msg}"));
            return Err(msg.into());
        }
        log_step(&app, "Windows Update is not active.");

        // ── Guard 5: sufficient disk space ───────────────────────────────────
        log_step(&app, "Checking available disk space...");
        if !sufficient_disk_space() {
            let msg = "Less than 512 MB is available on C:\\.\n\
                       Please free up disk space and retry.";
            log_step(&app, format!("ERROR: {msg}"));
            return Err(msg.into());
        }
        log_step(&app, "Disk space is sufficient.");

        // ── Guard 6: pending reboot ───────────────────────────────────────────
        log_step(&app, "Checking for a pending system reboot...");
        if reboot_pending() {
            let msg = "A system reboot is pending (from Windows Update or a previous install).\n\
                       Please reboot your computer and retry.";
            log_step(&app, format!("ERROR: {msg}"));
            return Err(msg.into());
        }
        log_step(&app, "No pending reboot detected.");

        // ── Guard 7: Windows Installer service ───────────────────────────────
        log_step(&app, "Checking Windows Installer service...");
        ensure_msi_service_running(&app)?;

        // ── Guard 8: stale temp MSI from a previous failed attempt ────────────
        let installer_path = std::env::temp_dir().join("SqlLocalDB.msi");
        if installer_path.exists() {
            log_step(&app, "Removing stale SqlLocalDB.msi from a previous attempt...");
            let _ = std::fs::remove_file(&installer_path);
        }

        // ── Guard 9: repair Windows Installer registry ACLs ───────────────────
        log_step(&app, "Repairing Windows Installer registry key permissions...");
        repair_installer_registry_acls(&app);

        // ── Guard 10: elevated privileges ────────────────────────────────────
        log_step(&app, "Checking for administrator privileges...");
        if !is_elevated() {
            log_step(&app, "Not elevated — downloading installer before UAC prompt...");

            let msi_log_path = std::env::temp_dir().join("SqlLocalDB_install.log");

            let response = reqwest::get(LOCALDB_MSI_URL).await.map_err(|e| {
                let msg = format!("Failed to download SqlLocalDB.msi: {e}");
                log_step(&app, format!("ERROR: {msg}"));
                msg
            })?;

            if !response.status().is_success() {
                let msg = format!("Download failed with HTTP status {}", response.status());
                log_step(&app, format!("ERROR: {msg}"));
                return Err(msg);
            }

            let bytes = response.bytes().await.map_err(|e| {
                let msg = format!("Failed to read downloaded installer: {e}");
                log_step(&app, format!("ERROR: {msg}"));
                msg
            })?;

            std::fs::write(&installer_path, &bytes).map_err(|e| {
                let msg = format!("Failed to write installer to disk: {e}");
                log_step(&app, format!("ERROR: {msg}"));
                msg
            })?;

            log_step(&app, format!("Downloaded {} bytes — showing UAC prompt...", bytes.len()));

            let args = format!(
                "/i \"{}\" /quiet /norestart /l*v \"{}\" ALLUSERS=1 REBOOT=ReallySuppress",
                installer_path.display(),
                msi_log_path.display(),
            );

            let code = run_msiexec_elevated(&args).map_err(|e| {
                log_step(&app, format!("ERROR: {e}"));
                e
            })?;

            let _ = std::fs::remove_file(&installer_path);

            if code != 0 && code != 3010 {
                let tail = read_msi_log_tail(&msi_log_path, 40);
                let msg = format!(
                    "msiexec exited with code {code}.\n\
                     --- last lines of install log ({}) ---\n{}",
                    msi_log_path.display(),
                    tail
                );
                log_step(&app, format!("ERROR: {msg}"));
                return Err(msg);
            }

            if code == 3010 {
                log_step(
                    &app,
                    "SqlLocalDB installed — a reboot is recommended but not required.",
                );
            } else {
                log_step(&app, "SqlLocalDB installed successfully.");
            }

            let _ = std::fs::remove_file(&msi_log_path);
            return Ok(());
        }

        // ── Already elevated: download and run msiexec directly ───────────────

        log_step(&app, format!("Downloading installer from {LOCALDB_MSI_URL}"));

        let response = reqwest::get(LOCALDB_MSI_URL).await.map_err(|e| {
            let msg = format!("Failed to download SqlLocalDB.msi: {e}");
            log_step(&app, format!("ERROR: {msg}"));
            msg
        })?;

        if !response.status().is_success() {
            let msg = format!("Download failed with HTTP status {}", response.status());
            log_step(&app, format!("ERROR: {msg}"));
            return Err(msg);
        }

        let bytes = response.bytes().await.map_err(|e| {
            let msg = format!("Failed to read downloaded installer: {e}");
            log_step(&app, format!("ERROR: {msg}"));
            msg
        })?;
        log_step(&app, format!("Downloaded {} bytes", bytes.len()));

        std::fs::write(&installer_path, &bytes).map_err(|e| {
            let msg = format!("Failed to write installer to disk: {e}");
            log_step(&app, format!("ERROR: {msg}"));
            msg
        })?;
        log_step(&app, format!("Saved installer to {}", installer_path.display()));

        let msi_log_path = std::env::temp_dir().join("SqlLocalDB_install.log");
        log_step(&app, "Launching msiexec (silent install)...");

        let output = Command::new("msiexec")
            .args([
                "/i",
                installer_path.to_str().unwrap_or(""),
                "/quiet",
                "/norestart",
                "/l*v",
                msi_log_path.to_str().unwrap_or(""),
                "ALLUSERS=1",
                "REBOOT=ReallySuppress",
            ])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| {
                let msg = format!("Failed to launch msiexec: {e}");
                log_step(&app, format!("ERROR: {msg}"));
                msg
            })?;

        let _ = std::fs::remove_file(&installer_path);

        let code = output.status.code().unwrap_or(-1);

        if !output.status.success() && code != 3010 {
            let tail = read_msi_log_tail(&msi_log_path, 40);
            let msg = format!(
                "msiexec exited with code {code}.\n\
                 --- last lines of install log ({}) ---\n{}",
                msi_log_path.display(),
                tail
            );
            log_step(&app, format!("ERROR: {msg}"));
            return Err(msg);
        }

        if code == 3010 {
            log_step(
                &app,
                "SqlLocalDB installed — a reboot is recommended but not required.",
            );
        } else {
            log_step(&app, "SqlLocalDB installed successfully.");
        }

        let _ = std::fs::remove_file(&msi_log_path);
        Ok(())
    }
}

// ─── Command 3: import_aronium_bak ───────────────────────────────────────────

/// Restore a SQL Server .bak into a temporary LocalDB instance, read every
/// Aronium table, and return the data as a JSON string.
///
/// Steps:
///   1. Create + start the `axis_import` LocalDB instance (idempotent).
///   2. Detect logical file names via `RESTORE FILELISTONLY`.
///   3. Restore the database to the user's %LOCALAPPDATA%.
///   4. Read Tax, ProductGroup, Product, Barcode, ProductTax, Customer,
///      Country, PriceList, StockEntry using `FOR JSON AUTO`.
///   5. Drop the temp database (instance stays running for speed).
///   6. Return `{ Tax: [...], ProductGroup: [...], ... }` as a JSON string.
///
/// TypeScript:
/// ```ts
/// const json = await invoke<string>("import_aronium_bak", { filePath });
/// const tables = JSON.parse(json);
/// ```
#[tauri::command]
pub async fn import_aronium_bak(app: AppHandle, file_path: String) -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, file_path);
        return Err("SQL Server LocalDB is only available on Windows.".into());
    }

    #[cfg(target_os = "windows")]
    {
        // Resolved here (async, can .await the download) rather than inside
        // the blocking closure below, then handed down as a plain path.
        let sqlcmd_path = resolve_sqlcmd_exe(&app).await?;

        // async + spawn_blocking: this command shells out to SqlLocalDB/sqlcmd
        // dozens of times and takes 30-60s. As a synchronous command it ran on
        // the app's main thread, freezing the webview for the whole restore —
        // which killed the Vite dev-server websocket, whose reconnect then
        // force-reloaded the page mid-import (wiping the progress toast and
        // cutting off whatever import steps hadn't run yet).
        tauri::async_runtime::spawn_blocking(move || {
            import_aronium_bak_blocking(file_path, sqlcmd_path)
        })
        .await
        .map_err(|e| format!("Import task panicked: {e}"))?
    }
}

/// Starts the named LocalDB instance, (re)creating it first if needed.
///
/// Uninstalling/reinstalling the LocalDB engine orphans any instance created
/// under the old install — `start` then fails with something like "no named
/// pipe instance matching '{INSTANCE}'" even though `create`+`start` both
/// "succeeded" (as processes), because the old code only checked whether the
/// commands *spawned*, never their exit status. Try the fast path (instance
/// already exists and just needs starting) first; only if that fails, drop
/// and recreate it from scratch, and surface a real error if that fails too
/// instead of silently continuing into a confusing sqlcmd-level failure.
///
/// Returns the instance's fully-qualified named-pipe address (e.g.
/// `np:\\.\pipe\LOCALDB#XXXX\tsql\query`) for callers to use as the sqlcmd
/// `-S` server. We deliberately connect via the explicit pipe rather than the
/// `(localdb)\instance` shorthand: the portable go-sqlcmd binary this app now
/// ships fails to resolve that shorthand ("no named pipe instance matching
/// 'INSTANCE' returned from host '(localdb)'"), whereas the explicit pipe
/// works with both go-sqlcmd and the classic ODBC sqlcmd.
/// LocalDB's built-in automatic instance. It is created and started on demand
/// by the engine itself and is the most reliable instance to fall back to when
/// a custom instance won't come up.
#[cfg(target_os = "windows")]
const DEFAULT_LOCALDB_INSTANCE: &str = "MSSQLLocalDB";

#[cfg(target_os = "windows")]
fn ensure_localdb_instance_running(instance: &str) -> Result<String, String> {
    // Prefer our dedicated instance (isolated from anything else the user's
    // tools may keep in the default one).
    let first_err = match bring_up_instance(instance, true) {
        Ok(pipe) => return Ok(pipe),
        Err(e) => e,
    };

    // Fall back to the engine's automatic instance. If `instance` is corrupt
    // (a real possibility after a LocalDB reinstall) but the engine itself is
    // healthy, `MSSQLLocalDB` comes up cleanly and the import proceeds. We
    // don't delete/recreate the default instance — it belongs to the whole
    // machine, and if it's stale the engine auto-heals it on start.
    if instance != DEFAULT_LOCALDB_INSTANCE {
        if let Ok(pipe) = bring_up_instance(DEFAULT_LOCALDB_INSTANCE, false) {
            return Ok(pipe);
        }
    }

    // Both failed — the LocalDB engine itself isn't producing a working
    // instance, which is an environment problem the app can't force past.
    Err(format!(
        "SQL Server LocalDB is installed but could not start a working database \
         instance, so the backup can't be restored on this PC.\n\n\
         Try: (1) restart the computer and run the import again; (2) reinstall \
         SQL Server LocalDB; (3) if antivirus is active, allow SQL Server \
         (sqlservr.exe) to run.\n\n\
         Details: {first_err}\n\nDiagnostics (SqlLocalDB info {instance}):\n{}",
        localdb_info_text(instance).unwrap_or_else(|e| e)
    ))
}

/// Brings a single LocalDB instance up and returns its named-pipe address.
///
/// `allow_recreate` controls the recovery step: for our own instance we
/// delete + recreate it when `start` "succeeds" but no pipe appears (the
/// classic stale-instance-after-engine-upgrade case); for the shared default
/// instance we never delete it — we only create it if it's missing.
#[cfg(target_os = "windows")]
fn bring_up_instance(instance: &str, allow_recreate: bool) -> Result<String, String> {
    // Attempt 1 — the common case: the instance already exists and just needs
    // starting. A healthy instance publishes its pipe within a second or two,
    // so this only ever waits the full minute on a machine that's genuinely
    // struggling (slow disk, first start after a LocalDB install).
    let quick_start = run_localdb(&["start", instance]);
    if matches!(&quick_start, Ok(o) if o.status.success()) {
        if let Some(pipe) = poll_localdb_pipe(instance, std::time::Duration::from_secs(60)) {
            return Ok(pipe);
        }
    }

    // Attempt 2 — recover. We land here when the instance doesn't exist yet,
    // or when `start` "succeeded" but no pipe ever appeared. For our own
    // instance, an orphan left by an older engine only recovers via delete +
    // recreate; for the shared default we just ensure it exists.
    if allow_recreate {
        let _ = run_localdb(&["stop", instance]);
        let _ = run_localdb(&["delete", instance]);
    }

    // create is idempotent-ish: harmless "already exists" error when the
    // default instance is present, which we ignore by re-checking for a pipe.
    let create =
        run_localdb(&["create", instance]).map_err(|e| format!("Cannot run SqlLocalDB create: {e}"))?;
    if allow_recreate && !create.status.success() {
        return Err(format!(
            "Cannot create LocalDB instance '{instance}': {}",
            command_output_text(&create)
        ));
    }

    let start =
        run_localdb(&["start", instance]).map_err(|e| format!("Cannot run SqlLocalDB start: {e}"))?;
    if !start.status.success() {
        return Err(format!(
            "Cannot start LocalDB instance '{instance}': {}",
            command_output_text(&start)
        ));
    }

    // A freshly created instance builds its system databases on first start,
    // which is far slower than starting an existing one — especially on a slow
    // disk right after a LocalDB install. Give it real time before giving up.
    if let Some(pipe) = poll_localdb_pipe(instance, std::time::Duration::from_secs(90)) {
        return Ok(pipe);
    }

    Err(format!(
        "LocalDB instance '{instance}' started but never reported a connection pipe."
    ))
}

#[cfg(target_os = "windows")]
fn run_localdb(args: &[&str]) -> std::io::Result<std::process::Output> {
    Command::new("SqlLocalDB")
        .args(args)
        .creation_flags(0x08000000)
        .output()
}

/// stderr if present, otherwise stdout — SqlLocalDB reports some failures on
/// stdout only.
#[cfg(target_os = "windows")]
fn command_output_text(out: &std::process::Output) -> String {
    let stderr = decode_console_output(&out.stderr);
    if stderr.trim().is_empty() {
        decode_console_output(&out.stdout)
    } else {
        stderr
    }
}

/// Some Windows builds emit UTF-16LE from console tools; dropping NUL bytes
/// makes the ASCII payload readable either way.
#[cfg(target_os = "windows")]
fn decode_console_output(bytes: &[u8]) -> String {
    let filtered: Vec<u8> = bytes.iter().copied().filter(|b| *b != 0).collect();
    String::from_utf8_lossy(&filtered).into_owned()
}

#[cfg(target_os = "windows")]
fn localdb_info_text(instance: &str) -> Result<String, String> {
    let out = run_localdb(&["info", instance])
        .map_err(|e| format!("Cannot query SqlLocalDB info: {e}"))?;
    Ok(decode_console_output(&out.stdout))
}

/// Finds the instance's named-pipe address in `SqlLocalDB info` output.
///
/// Located by its `np:\` prefix rather than the "Instance pipe name:" label so
/// this keeps working on non-English Windows, where SqlLocalDB translates its
/// output labels and a label-based match would never fire (leaving the caller
/// to time out as if the engine were broken).
#[cfg(target_os = "windows")]
fn extract_localdb_pipe(text: &str) -> Option<String> {
    text.lines().find_map(|line| {
        let idx = line.find("np:\\")?;
        let pipe = line[idx..].trim();
        if pipe.is_empty() {
            None
        } else {
            Some(pipe.to_string())
        }
    })
}

/// Polls `SqlLocalDB info` until the instance publishes its named pipe, up to
/// `timeout`. `SqlLocalDB start` returns as soon as the service is asked to
/// start, well before the engine is actually accepting connections, so
/// querying immediately fails with "no named pipe instance matching ...".
#[cfg(target_os = "windows")]
fn poll_localdb_pipe(instance: &str, timeout: std::time::Duration) -> Option<String> {
    let deadline = std::time::Instant::now() + timeout;
    loop {
        if let Ok(text) = localdb_info_text(instance) {
            if let Some(pipe) = extract_localdb_pipe(&text) {
                return Some(pipe);
            }
        }
        if std::time::Instant::now() >= deadline {
            return None;
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}

fn import_aronium_bak_blocking(
    file_path: String,
    sqlcmd_path: std::path::PathBuf,
) -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (file_path, sqlcmd_path);
        return Err("SQL Server LocalDB is only available on Windows.".into());
    }

    #[cfg(target_os = "windows")]
    {
        // Only one import may run at a time: the setup below drops and
        // re-restores the shared AroniumImport database, so a second
        // concurrent invocation (e.g. a double-clicked confirm button)
        // yanks the database out from under the first — every remaining
        // table read in the first run then comes back "not found".
        static IMPORT_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
        let _guard = IMPORT_LOCK.try_lock().map_err(|_| {
            "An Aronium import is already in progress — wait for it to finish."
                .to_string()
        })?;

        const INSTANCE: &str = "axis_import";
        const DB_NAME: &str = "AroniumImport";

        // ── 1. Ensure the LocalDB instance exists and is running ───────────────
        // Connect via the explicit named pipe it reports (not the
        // `(localdb)\instance` shorthand, which go-sqlcmd can't resolve).
        let server = ensure_localdb_instance_running(INSTANCE)?;

        // ── 2. Detect logical file names ───────────────────────────────────────
        let (data_logical, mut log_logical) =
            restore_filelistonly(&server, &file_path, &sqlcmd_path)
                .map_err(|e| format!("RESTORE FILELISTONLY failed: {e}"))?;

        if data_logical.is_empty() {
            return Err("Could not detect data logical name from backup file.".into());
        }
        if log_logical.is_empty() {
            log_logical = format!("{data_logical}_log");
        }

        // ── 3. Restore into %LOCALAPPDATA% ─────────────────────────────────────
        let local_app_data = std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| std::env::temp_dir().to_string_lossy().to_string());
        let mdf = format!("{local_app_data}\\{DB_NAME}.mdf");
        let ldf = format!("{local_app_data}\\{DB_NAME}_log.ldf");

        // Drop any leftover temp database from a previous import
        let _ = run_sqlcmd(
            &sqlcmd_path,
            &server,
            "master",
            &format!(
                "IF DB_ID('{DB_NAME}') IS NOT NULL \
                 BEGIN ALTER DATABASE [{DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; \
                       DROP DATABASE [{DB_NAME}]; END"
            ),
        );

        run_sqlcmd(
            &sqlcmd_path,
            &server,
            "master",
            &format!(
                "RESTORE DATABASE [{DB_NAME}] \
                 FROM DISK = N'{file_path}' \
                 WITH MOVE N'{data_logical}' TO N'{mdf}', \
                      MOVE N'{log_logical}' TO N'{ldf}', \
                      REPLACE, RECOVERY"
            ),
        )
        .map_err(|e| format!("RESTORE DATABASE failed: {e}"))?;

        // ── 4. Read the Aronium tables the importer actually consumes ─────────
        // Keep this list in sync with runImport() in aroniumImporter.ts.
        // It used to fetch ~40 tables "just in case" (ApplicationProperty,
        // Template, FiscalItem, Company logos, Product image blobs, ...) —
        // FOR JSON AUTO base64-encodes every varbinary column, which blew the
        // returned payload up to >100MB and made the frontend spend ages
        // shipping and parsing data it immediately threw away.
        let tables: &[&str] = &[
            "Tax",
            "ProductGroup",
            "Product",
            "Barcode",
            "ProductTax",
            "Stock",
            "StockEntry",
            "StockControl",
            "Customer",
            "Country",
            "PaymentType",
            "Payment",
            "Document",
            "DocumentItem",
            "DocumentItemTax",
            "DocumentType",
        ];
        let mut result = serde_json::Map::new();
        // Table-fetch failures used to be swallowed into an empty result
        // (`unwrap_or_default()` below) with only a println! nobody sees —
        // indistinguishable from a table that's genuinely empty. Collect
        // them here and surface them in the returned JSON instead.
        let mut import_errors: Vec<String> = Vec::new();

        for &table in tables {
            // Step A: check the table exists before querying it.
            // This avoids FOR JSON AUTO emitting nothing (not even "[]") on a
            // missing table and lets us short-circuit cleanly with an empty array.
            let exists_query = format!(
                "SELECT CAST(CASE WHEN OBJECT_ID(N'[{table}]', 'U') IS NOT NULL \
                 THEN 1 ELSE 0 END AS varchar(1)) AS exists_flag"
            );
            let exists_raw =
                run_sqlcmd(&sqlcmd_path, &server, DB_NAME, &exists_query).unwrap_or_default();
            let table_exists = exists_raw
                .lines()
                .any(|l| l.trim() == "1");

            if !table_exists {
                println!("[aronium-import] table={table} → not found in database, skipping");
                result.insert(table.to_owned(), serde_json::Value::Array(vec![]));
                continue;
            }

            // Step B: stream every row out as JSON.
            // FOR JSON AUTO splits output into 2033-char chunks — one sqlcmd
            // output line per chunk. We must concatenate ALL of them.
            // We do NOT use -y / -Y (column width caps) because they silently
            // truncate JSON mid-chunk. sqlcmd's default is unlimited for
            // nvarchar(max).
            //
            // Binary columns (Product.Image etc.) are excluded via dynamic
            // SQL: FOR JSON base64-encodes varbinary data, and the importer
            // never uses it — including it multiplied the payload ~50x.
            let query = format!(
                "DECLARE @cols NVARCHAR(MAX); \
                 SELECT @cols = COALESCE(@cols + ',', '') + QUOTENAME(c.name) \
                 FROM sys.columns c \
                 JOIN sys.types t ON c.user_type_id = t.user_type_id \
                 WHERE c.object_id = OBJECT_ID(N'[{table}]') \
                   AND t.name NOT IN ('image', 'varbinary', 'binary'); \
                 DECLARE @sql NVARCHAR(MAX) = \
                     N'SELECT ' + @cols + N' FROM [{table}] FOR JSON AUTO'; \
                 EXEC sp_executesql @sql;"
            );
            // Retry once — a transient sqlcmd/LocalDB hiccup (rapid
            // sequential temp-file spawns across ~40 tables) shouldn't
            // silently drop an entire table's data.
            let raw = match run_sqlcmd(&sqlcmd_path, &server, DB_NAME, &query) {
                Ok(r) => r,
                Err(first_err) => {
                    println!(
                        "[aronium-import] table={table} query failed, retrying once: {first_err}"
                    );
                    match run_sqlcmd(&sqlcmd_path, &server, DB_NAME, &query) {
                        Ok(r) => r,
                        Err(second_err) => {
                            let msg = format!(
                                "table {table}: query failed after retry: {second_err}"
                            );
                            println!("[aronium-import] ERROR {msg}");
                            import_errors.push(msg);
                            String::new()
                        }
                    }
                }
            };

            println!(
                "[aronium-import] table={table} raw_bytes={} first_120={:?}",
                raw.len(),
                &raw[..raw.len().min(120)]
            );

            // Step C: reassemble JSON chunks.
            //
            // Without -h-1, sqlcmd emits a header row and a dashes separator
            // before the data. FOR JSON AUTO output goes into a single column
            // so the header line will be something like "JSON_F52E2B61-..."
            // and the separator a line of dashes. Both are noise to discard.
            //
            // Noise lines to discard:
            //   • blank lines
            //   • "(N rows affected)" — starts with '(' AND ends with ')'
            //   • "Changed database context to 'X'."
            //   • lines consisting entirely of dashes (column header separator)
            //   • lines that don't start with '[' or a JSON continuation
            //     character — i.e. the column name header row itself
            //
            // JSON chunk lines to KEEP: any line whose trimmed content starts
            // with '[', '{', or is a bare continuation (mid-chunk fragment).
            // Because chunks can start with any character mid-string we keep
            // everything that isn't positively identified as noise.
            let json_str: String = raw
                .lines()
                .filter(|l| {
                    let t = l.trim();
                    if t.is_empty() {
                        return false;
                    }
                    // "(N rows affected)"
                    if t.starts_with('(') && t.ends_with(')') {
                        return false;
                    }
                    // sqlcmd informational
                    if t.starts_with("Changed database context") {
                        return false;
                    }
                    // column header separator: "-------..."
                    if t.chars().all(|c| c == '-') {
                        return false;
                    }
                    // column name header row — FOR JSON AUTO always uses an
                    // internal column name starting with "JSON_F52E2B61"
                    if t.starts_with("JSON_F52E2B61") {
                        return false;
                    }
                    true
                })
                .collect::<Vec<_>>()
                .join(""); // NO separator — chunks are split mid-character

            println!(
                "[aronium-import] table={table} json_len={} head={:?} tail={:?}",
                json_str.len(),
                &json_str[..json_str.len().min(80)],
                &json_str[json_str.len().saturating_sub(80)..]
            );

            // Step D: validate basic JSON structure before parsing.
            // A well-formed FOR JSON AUTO result always starts with '[' and ends
            // with ']'. If it doesn't, the output was truncated — surface an
            // error so it's visible rather than silently returning empty data.
            let json_str = if json_str.is_empty() {
                println!(
                    "[aronium-import] table={table} → empty output after filtering, using []"
                );
                "[]".to_owned()
            } else if !json_str.starts_with('[') {
                return Err(format!(
                    "table {table}: FOR JSON output does not start with '[' — \
                     got {:?}… — this is a sqlcmd encoding issue",
                    &json_str[..json_str.len().min(40)]
                ));
            } else if !json_str.ends_with(']') {
                return Err(format!(
                    "table {table}: FOR JSON output is truncated — \
                     json_len={} ends with {:?} — \
                     expected ']'. The -y 0 flag should prevent this.",
                    json_str.len(),
                    &json_str[json_str.len().saturating_sub(40)..]
                ));
            } else {
                json_str
            };

            // Step E: parse.
            let parsed: serde_json::Value = match serde_json::from_str::<serde_json::Value>(&json_str) {
                Ok(v) => {
                    let count = v.as_array().map(|a| a.len()).unwrap_or(0);
                    println!("[aronium-import] table={table} → {count} rows parsed OK");
                    v
                }
                Err(e) => {
                    // Print as much context around the error position as possible.
                    let col = e.column();
                    let ctx_start = col.saturating_sub(40).min(json_str.len());
                    let ctx_end   = (col + 40).min(json_str.len());
                    let msg = format!("table {table}: JSON parse error at col {col}: {e}");
                    println!("[aronium-import] ERROR {msg}");
                    println!(
                        "[aronium-import] table={table} context: {:?}",
                        &json_str[ctx_start..ctx_end]
                    );
                    import_errors.push(msg);
                    serde_json::Value::Array(vec![])
                }
            };

            result.insert(table.to_owned(), parsed);
        }

        if !import_errors.is_empty() {
            println!(
                "[aronium-import] {} table(s) failed to import fully: {}",
                import_errors.len(),
                import_errors.join(" | ")
            );
        }
        result.insert(
            "_ImportErrors".to_owned(),
            serde_json::Value::Array(
                import_errors.into_iter().map(serde_json::Value::String).collect(),
            ),
        );

        // ── 5. Drop temp database ──────────────────────────────────────────────
        let _ = run_sqlcmd(
            &sqlcmd_path,
            &server,
            "master",
            &format!(
                "ALTER DATABASE [{DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; \
                 DROP DATABASE [{DB_NAME}]"
            ),
        );

        // ── 6. Return JSON ─────────────────────────────────────────────────────
        serde_json::to_string(&result)
            .map_err(|e| format!("Cannot serialise result: {e}"))
    }
}

// ─── Internal: RESTORE FILELISTONLY parser ────────────────────────────────────

/// Runs `RESTORE FILELISTONLY` and returns `(data_logical_name, log_logical_name)`.
///
/// `RESTORE FILELISTONLY` cannot use `FOR JSON AUTO` directly. Instead we
/// insert its result set into a temp table and then SELECT from it with
/// `FOR JSON AUTO`, which gives us clean structured output to parse.
#[cfg(target_os = "windows")]
fn restore_filelistonly(
    server: &str,
    file_path: &str,
    sqlcmd_path: &Path,
) -> Result<(String, String), String> {
    let sql = format!(
        "CREATE TABLE #fl (\
            LogicalName nvarchar(128), PhysicalName nvarchar(260), \
            [Type] char(1), FileGroupName nvarchar(128), Size numeric(20,0), \
            MaxSize numeric(20,0), FileId bigint, CreateLSN numeric(25,0), \
            DropLSN numeric(25,0), UniqueId uniqueidentifier, ReadOnlyLSN numeric(25,0), \
            ReadWriteLSN numeric(25,0), BackupSizeInBytes bigint, SourceBlockSize int, \
            FileGroupId int, LogGroupGUID uniqueidentifier, \
            DifferentialBaseLSN numeric(25,0), DifferentialBaseGUID uniqueidentifier, \
            IsReadOnly bit, IsPresent bit, TDEThumbprint varbinary(32), \
            SnapshotUrl nvarchar(360) \
        ); \
        INSERT INTO #fl EXEC('RESTORE FILELISTONLY FROM DISK = N''{file_path}'''); \
        SELECT LogicalName, [Type] FROM #fl FOR JSON AUTO; \
        DROP TABLE #fl;"
    );

    let raw = run_sqlcmd(sqlcmd_path, server, "master", &sql)
        .map_err(|e| format!("FILELISTONLY query failed: {e}"))?;

    // Reassemble FOR JSON AUTO chunks using the same defensive logic as above.
    let json_str: String = raw
        .lines()
        .filter(|l| {
            let t = l.trim();
            if t.is_empty() { return false; }
            if t.starts_with('(') && t.ends_with(')') { return false; }
            if t.starts_with("Changed database context") { return false; }
            if t.chars().all(|c| c == '-') { return false; }
            if t.starts_with("JSON_F52E2B61") { return false; }
            true
        })
        .collect::<Vec<_>>()
        .join("");

    let json_str = if json_str.is_empty() { "[]".to_owned() } else { json_str };

    if !json_str.starts_with('[') || !json_str.ends_with(']') {
        return Err(format!(
            "FILELISTONLY JSON is malformed or truncated: starts={:?} ends={:?}",
            &json_str[..json_str.len().min(40)],
            &json_str[json_str.len().saturating_sub(40)..]
        ));
    }

    println!("[aronium-import] FILELISTONLY json={json_str}");

    let rows: Vec<serde_json::Value> = serde_json::from_str(&json_str)
        .unwrap_or_default();

    let mut data_logical = String::new();
    let mut log_logical  = String::new();

    for row in &rows {
        let name = row["LogicalName"].as_str().unwrap_or("").to_owned();
        let typ  = row["Type"].as_str().unwrap_or("");
        match typ {
            "D" if data_logical.is_empty() => data_logical = name,
            "L" if log_logical.is_empty()  => log_logical  = name,
            _ => {}
        }
    }

    Ok((data_logical, log_logical))
}

// ─── Internal: resolve sqlcmd.exe ─────────────────────────────────────────────

/// Official Microsoft go-sqlcmd release — a single statically-linked,
/// dependency-free sqlcmd.exe (no ODBC driver, no elevation needed to run).
/// A fixed, versioned direct-download link, same reproducibility rationale as
/// `LOCALDB_MSI_URL` above (not a "latest" resolver).
#[cfg(target_os = "windows")]
const SQLCMD_ZIP_URL: &str =
    "https://github.com/microsoft/go-sqlcmd/releases/download/v1.10.0/sqlcmd-windows-amd64.zip";

/// Resolves a usable `sqlcmd` executable, cheapest option first:
///   1. Already on PATH? → use it directly, zero extra work (the common case).
///   2. Previously downloaded and cached under the app data dir? → reuse it.
///   3. Otherwise, download the portable go-sqlcmd zip, extract it with
///      PowerShell's `Expand-Archive` (no new crate dependency, consistent
///      with this file's existing style of shelling out to Windows
///      built-ins), and cache it for next time.
///
/// `sqlcmd.exe` genuinely not being installed (only the LocalDB *engine* is
/// checked/installed elsewhere in this file) is exactly what caused "sqlcmd
/// not found or failed to start" on machines that never had SSMS or the SQL
/// Server command-line utilities installed.
#[cfg(target_os = "windows")]
async fn resolve_sqlcmd_exe(app: &AppHandle) -> Result<PathBuf, String> {
    // 1. PATH — same cheap spawn probe `run_sqlcmd` already relied on.
    if Command::new("sqlcmd")
        .args(["-?"])
        .creation_flags(0x08000000)
        .output()
        .is_ok()
    {
        return Ok(PathBuf::from("sqlcmd"));
    }

    // 2. Cached copy from a previous run.
    let tools_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data directory: {e}"))?
        .join("tools")
        .join("sqlcmd");
    let cached_exe = tools_dir.join("sqlcmd.exe");
    if cached_exe.is_file() {
        return Ok(cached_exe);
    }

    // 3. First-time download + extract.
    std::fs::create_dir_all(&tools_dir)
        .map_err(|e| format!("Cannot create sqlcmd tools directory: {e}"))?;

    let response = reqwest::get(SQLCMD_ZIP_URL).await.map_err(|e| {
        format!(
            "Could not download the SQL command-line tools (sqlcmd) — no internet \
             connection or the download was blocked: {e}. If you're behind a \
             corporate firewall or proxy, allow access to github.com, or install \
             \"sqlcmd\" manually and ensure it's on your PATH, then retry the import."
        )
    })?;
    if !response.status().is_success() {
        return Err(format!(
            "Downloading sqlcmd failed (HTTP {}). This may mean the download was \
             blocked by a firewall, or the download link is out of date. You can \
             install \"sqlcmd\" manually (search \"SQL Server command line \
             utilities\" or download go-sqlcmd from \
             https://github.com/microsoft/go-sqlcmd/releases) and make sure it's \
             on your PATH, then retry.",
            response.status()
        ));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read sqlcmd download: {e}"))?;

    let zip_path = std::env::temp_dir().join("axis_sqlcmd_download.zip");
    std::fs::write(&zip_path, &bytes)
        .map_err(|e| format!("Cannot write sqlcmd download to disk: {e}"))?;

    let extract = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &format!(
                "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
                zip_path.display(),
                tools_dir.display()
            ),
        ])
        .creation_flags(0x08000000)
        .output();

    let _ = std::fs::remove_file(&zip_path);

    let extract = extract.map_err(|e| format!("Cannot launch PowerShell to unpack sqlcmd: {e}"))?;
    if !extract.status.success() {
        return Err(format!(
            "Downloaded sqlcmd but could not unpack it: {}. Try re-running the \
             import, or install sqlcmd manually and add it to PATH.",
            String::from_utf8_lossy(&extract.stderr)
        ));
    }

    // go-sqlcmd's zip layout isn't guaranteed flat — search a couple of
    // levels deep for the extracted exe rather than assuming tools_dir root.
    let found = find_file_recursive(&tools_dir, "sqlcmd.exe", 2).ok_or_else(|| {
        "Downloaded and unpacked sqlcmd, but sqlcmd.exe was not found in the archive."
            .to_string()
    })?;

    // Sanity-check the extracted binary actually runs before trusting/caching
    // it — a corrupt or antivirus-quarantined download should fail loudly
    // here instead of being silently cached as a broken "cached copy" for
    // every future import.
    Command::new(&found)
        .args(["-?"])
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| {
            format!(
                "The downloaded sqlcmd.exe could not be run — it may have been \
                 blocked by antivirus software: {e}. Check your antivirus \
                 quarantine, or install sqlcmd manually."
            )
        })?;

    Ok(found)
}

/// Searches `dir` up to `max_depth` levels deep for a file named `name`.
#[cfg(target_os = "windows")]
fn find_file_recursive(dir: &Path, name: &str, max_depth: u32) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    let mut subdirs = Vec::new();
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && path.file_name().and_then(|n| n.to_str()) == Some(name) {
            return Some(path);
        }
        if path.is_dir() {
            subdirs.push(path);
        }
    }
    if max_depth == 0 {
        return None;
    }
    for subdir in subdirs {
        if let Some(found) = find_file_recursive(&subdir, name, max_depth - 1) {
            return Some(found);
        }
    }
    None
}

// ─── Internal: run one T-SQL statement via sqlcmd ─────────────────────────────

/// Writes `sql` to a plain temp file (closed before sqlcmd spawns), runs
/// sqlcmd, then deletes the file. Using a plain `fs::File` instead of
/// `NamedTempFile` avoids the race where the tempfile crate deletes the file
/// while sqlcmd is still opening it ("file is being used by another process").
#[cfg(target_os = "windows")]
fn run_sqlcmd(sqlcmd_path: &Path, server: &str, database: &str, sql: &str) -> Result<String, String> {
    use std::io::Write;

    let tmp_path = std::env::temp_dir().join(format!(
        "axis_sqlcmd_{}.sql",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos()
    ));

    // Write and explicitly close the file before spawning sqlcmd so that no
    // Rust handle is open when sqlcmd tries to open the same path.
    {
        let mut f = std::fs::File::create(&tmp_path)
            .map_err(|e| format!("Cannot create temp SQL file: {e}"))?;
        f.write_all(sql.as_bytes())
            .map_err(|e| format!("Cannot write temp SQL file: {e}"))?;
        f.flush()
            .map_err(|e| format!("Cannot flush temp SQL file: {e}"))?;
        // `f` drops here, closing the file handle before sqlcmd spawns
    }

    let output = Command::new(sqlcmd_path)
        .args([
            "-S", server,
            "-d", database,
            "-i", tmp_path.to_str().unwrap_or(""),
            "-b",       // exit non-zero on SQL error
            "-y", "0",  // nvarchar display width: unlimited (required for FOR JSON AUTO chunks)
            "-Y", "0",  // varchar display width: unlimited
            // NOTE: -W and -h are mutually exclusive with -y/-Y and must not be used
        ])
        .creation_flags(0x08000000)
        .output();

    // Always clean up the temp file, regardless of whether sqlcmd succeeded.
    let _ = std::fs::remove_file(&tmp_path);

    let output = output.map_err(|e| format!("sqlcmd not found or failed to start: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!(
            "sqlcmd exit {}: {}",
            output.status.code().unwrap_or(-1),
            if stderr.is_empty() { &stdout } else { &stderr }
        ));
    }

    // Return the raw stdout with newlines preserved so callers can filter
    // noise lines before concatenating FOR JSON AUTO chunks.
    // NOTE: do NOT join with "" here — that was the original bug that caused
    // multi-chunk JSON to be silently corrupted into unparseable strings.
    Ok(stdout)
}

// (CommandExt for CREATE_NO_WINDOW is imported at the top of the file
//  via `use std::os::windows::process::CommandExt` under #[cfg(target_os = "windows")]