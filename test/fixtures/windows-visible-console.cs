using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

internal static class WindowsVisibleConsole
{
    private static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            return 64;
        }

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = args[0],
            Arguments = BuildArgumentString(args),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = false,
            WindowStyle = ProcessWindowStyle.Normal,
        };

        using (Process child = Process.Start(startInfo))
        {
            if (child == null)
            {
                return 1;
            }

            Task outputCopy = child.StandardOutput.BaseStream.CopyToAsync(Console.OpenStandardOutput());
            Task errorCopy = child.StandardError.BaseStream.CopyToAsync(Console.OpenStandardError());
            child.WaitForExit();
            Task.WaitAll(outputCopy, errorCopy);
            return child.ExitCode;
        }
    }

    private static string BuildArgumentString(string[] args)
    {
        StringBuilder command = new StringBuilder();
        for (int index = 1; index < args.Length; index++)
        {
            if (command.Length > 0)
            {
                command.Append(' ');
            }
            command.Append(QuoteArgument(args[index]));
        }
        return command.ToString();
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
}
