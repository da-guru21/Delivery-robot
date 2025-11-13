# Creates a Scheduled Task that runs `pm2 resurrect` at user logon
# Run this PowerShell script as Administrator.

# Configure these if you prefer to hardcode paths. By default the script will try to discover them.
$taskName = "PM2 Resurrect"

# Try to discover node and pm2 paths from PATH
try {
    $nodePath = (Get-Command node.exe -ErrorAction Stop).Path
} catch {
    Write-Error "node.exe not found in PATH. Make sure Node is installed and available to this user."
    exit 1
}

try {
    $pm2Path = (Get-Command pm2 -ErrorAction Stop).Path
} catch {
    Write-Error "pm2 not found in PATH. Install pm2 globally (e.g. npm i -g pm2) and ensure it's in PATH."
    exit 1
}

# Build the command to run: "C:\path\to\node.exe" "C:\path\to\pm2" resurrect
$action = '"' + $nodePath + '" "' + $pm2Path + '" resurrect'
Write-Output "Node: $nodePath"
Write-Output "PM2:  $pm2Path"
Write-Output "Scheduled task will run: $action"

## Prefer using the ScheduledTasks module (Register-ScheduledTask) for robust creation
try {
    Write-Output "Attempting to create scheduled task using ScheduledTasks cmdlets..."
    # Prepare action: execute node.exe with argument: "<pm2Path>" resurrect
    $actionArgument = '"' + $pm2Path + '" resurrect'
    $taskAction = New-ScheduledTaskAction -Execute $nodePath -Argument $actionArgument -WindowStyle Hidden
    $taskTrigger = New-ScheduledTaskTrigger -AtLogOn
    # Register with highest privileges if possible
    Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -RunLevel Highest -Force
    Write-Output "Scheduled task '$taskName' created successfully via Register-ScheduledTask."
    Write-Output "To test: run 'Start-ScheduledTask -TaskName \"$taskName\"' or sign out and sign back in."
} catch {
    Write-Output "Register-ScheduledTask failed or cmdlets unavailable: $($_.Exception.Message)"
    Write-Output "Falling back to schtasks.exe (legacy)."

    # Fallback to schtasks.exe with properly quoted /TR argument (wrap entire command in escaped quotes)
    # schtasks expects: /TR "<command> <args>" so we wrap $action as a single quoted string
    $wrappedAction = '"' + $action + '"'
    $createArgsArray = @(
        '/Create',
        '/SC', 'ONLOGON',
        '/RL', 'HIGHEST',
        '/TN', $taskName,
        '/TR', $wrappedAction,
        '/F'
    )

    $createArgs = $createArgsArray -join ' '
    Write-Output "Running: schtasks $createArgs"
    $proc = Start-Process -FilePath schtasks -ArgumentList $createArgs -Wait -NoNewWindow -PassThru
    if ($proc.ExitCode -eq 0) {
        Write-Output "Scheduled task '$taskName' created successfully."
        Write-Output "To test: run 'schtasks /Run /TN \"$taskName\"' or sign out and sign back in."
    } else {
        Write-Error "schtasks returned exit code $($proc.ExitCode) for attempt 1 (with /RL HIGHEST)."
        Write-Output "Attempting fallback: create without /RL (still specifying user)"
        # Fallback 1: create without /RL but specify the user explicitly (domain\user)
        $runUser = "$env:USERDOMAIN\$env:USERNAME"
        $fallbackArgs1 = "/Create /SC ONLOGON /TN `"$taskName`" /TR $wrappedAction /RU `"$runUser`" /F"
        Write-Output "Running: schtasks $fallbackArgs1"
        $proc2 = Start-Process -FilePath schtasks -ArgumentList $fallbackArgs1 -Wait -NoNewWindow -PassThru
        if ($proc2.ExitCode -eq 0) {
            Write-Output "Scheduled task '$taskName' created successfully (fallback: without /RL)."
            Write-Output "To test: run 'schtasks /Run /TN \"$taskName\"' or sign out and sign back in."
        } else {
            Write-Error "schtasks returned exit code $($proc2.ExitCode) for fallback 1 (without /RL)."
            Write-Output "Attempting fallback 2: create without specifying user (let schtasks pick)."
            $fallbackArgs2 = "/Create /SC ONLOGON /TN `"$taskName`" /TR $wrappedAction /F"
            Write-Output "Running: schtasks $fallbackArgs2"
            $proc3 = Start-Process -FilePath schtasks -ArgumentList $fallbackArgs2 -Wait -NoNewWindow -PassThru
            if ($proc3.ExitCode -eq 0) {
                Write-Output "Scheduled task '$taskName' created successfully (fallback: no /RU)."
                Write-Output "To test: run 'schtasks /Run /TN \"$taskName\"' or sign out and sign back in."
            } else {
                Write-Error "schtasks returned exit code $($proc3.ExitCode) for fallback 2."
                Write-Error "All schtasks attempts failed. You may need to create the task manually in Task Scheduler (taskschd.msc), or run this script as the target user interactively."
            }
        }
    }
}

Write-Output "Reminder: Run 'pm2 save' now (in your user session) to persist the current process list that 'pm2 resurrect' will restore."