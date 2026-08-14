using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

internal static class WindowsHiddenConsole
{
    private const uint CreateNewConsole = 0x00000010;
    private const uint CreateSuspended = 0x00000004;
    private const uint Infinite = 0xffffffff;
    private const uint JobObjectLimitKillOnJobClose = 0x00002000;
    private const int JobObjectExtendedLimitInformation = 9;
    private const uint StartfUseShowWindow = 0x00000001;
    private const uint StartfUseStdHandles = 0x00000100;
    private const short SwHide = 0;
    private const int StdInputHandle = -10;
    private const int StdOutputHandle = -11;
    private const int StdErrorHandle = -12;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcess(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref StartupInfo startupInfo,
        out ProcessInformation processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetStdHandle(int standardHandle);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr jobAttributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(
        IntPtr job,
        int informationClass,
        IntPtr information,
        uint informationLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr thread);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr process, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct StartupInfo
    {
        public uint Size;
        public string Reserved;
        public string Desktop;
        public string Title;
        public uint X;
        public uint Y;
        public uint XSize;
        public uint YSize;
        public uint XCountChars;
        public uint YCountChars;
        public uint FillAttribute;
        public uint Flags;
        public short ShowWindow;
        public short Reserved2;
        public IntPtr Reserved2Pointer;
        public IntPtr StandardInput;
        public IntPtr StandardOutput;
        public IntPtr StandardError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessInformation
    {
        public IntPtr Process;
        public IntPtr Thread;
        public uint ProcessId;
        public uint ThreadId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IoCounters
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct BasicLimitInformation
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ExtendedLimitInformation
    {
        public BasicLimitInformation BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    private static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            WriteError("Usage: windows-hidden-console.exe <program> [arguments...]");
            return 64;
        }

        try
        {
            return Run(args);
        }
        catch (Exception error)
        {
            WriteError(error.ToString());
            return 1;
        }
    }

    private static int Run(string[] args)
    {
        IntPtr job = CreateKillOnCloseJob();
        ProcessInformation process = new ProcessInformation();
        try
        {
            StartupInfo startupInfo = new StartupInfo
            {
                Size = (uint)Marshal.SizeOf(typeof(StartupInfo)),
                Flags = StartfUseShowWindow | StartfUseStdHandles,
                ShowWindow = SwHide,
                StandardInput = GetStdHandle(StdInputHandle),
                StandardOutput = GetStdHandle(StdOutputHandle),
                StandardError = GetStdHandle(StdErrorHandle),
            };

            StringBuilder commandLine = BuildCommandLine(args);
            if (!CreateProcess(
                args[0],
                commandLine,
                IntPtr.Zero,
                IntPtr.Zero,
                true,
                CreateNewConsole | CreateSuspended,
                IntPtr.Zero,
                null,
                ref startupInfo,
                out process))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateProcess failed");
            }

            if (!AssignProcessToJobObject(job, process.Process))
            {
                int error = Marshal.GetLastWin32Error();
                TerminateProcess(process.Process, 1);
                throw new Win32Exception(error, "AssignProcessToJobObject failed");
            }

            if (ResumeThread(process.Thread) == uint.MaxValue)
            {
                int error = Marshal.GetLastWin32Error();
                TerminateProcess(process.Process, 1);
                throw new Win32Exception(error, "ResumeThread failed");
            }

            if (WaitForSingleObject(process.Process, Infinite) == uint.MaxValue)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "WaitForSingleObject failed");
            }

            uint exitCode;
            if (!GetExitCodeProcess(process.Process, out exitCode))
            {
                throw new Win32Exception(Marshal.GetLastWin32Error(), "GetExitCodeProcess failed");
            }
            return unchecked((int)exitCode);
        }
        finally
        {
            if (process.Thread != IntPtr.Zero) CloseHandle(process.Thread);
            if (process.Process != IntPtr.Zero) CloseHandle(process.Process);
            CloseHandle(job);
        }
    }

    private static IntPtr CreateKillOnCloseJob()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObject failed");
        }

        ExtendedLimitInformation limits = new ExtendedLimitInformation();
        limits.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;
        int size = Marshal.SizeOf(typeof(ExtendedLimitInformation));
        IntPtr pointer = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(limits, pointer, false);
            if (!SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                pointer,
                (uint)size))
            {
                int error = Marshal.GetLastWin32Error();
                CloseHandle(job);
                throw new Win32Exception(error, "SetInformationJobObject failed");
            }
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }

        return job;
    }

    private static StringBuilder BuildCommandLine(string[] args)
    {
        StringBuilder command = new StringBuilder();
        for (int index = 0; index < args.Length; index++)
        {
            if (command.Length > 0)
            {
                command.Append(' ');
            }
            command.Append(QuoteArgument(args[index]));
        }
        return command;
    }

    private static string QuoteArgument(string argument)
    {
        if (argument.Length > 0
            && argument.IndexOfAny(new[] { ' ', '\t', '"' }) < 0)
        {
            return argument;
        }

        StringBuilder quoted = new StringBuilder("\"");
        int backslashes = 0;
        foreach (char character in argument)
        {
            if (character == '\\')
            {
                backslashes++;
                continue;
            }

            if (character == '"')
            {
                quoted.Append('\\', backslashes * 2 + 1);
                quoted.Append('"');
                backslashes = 0;
                continue;
            }

            quoted.Append('\\', backslashes);
            backslashes = 0;
            quoted.Append(character);
        }

        quoted.Append('\\', backslashes * 2);
        quoted.Append('"');
        return quoted.ToString();
    }

    private static void WriteError(string message)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(message + Environment.NewLine);
        Stream error = Console.OpenStandardError();
        error.Write(bytes, 0, bytes.Length);
        error.Flush();
    }
}
