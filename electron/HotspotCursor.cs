using System;
using System.Runtime.InteropServices;
using System.Text;

internal static class Program
{
    [DllImport("user32.dll")]
    private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out POINT point);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);

    [DllImport("user32.dll")]
    private static extern bool CloseDesktop(IntPtr desktop);

    [DllImport("user32.dll")]
    private static extern IntPtr GetThreadDesktop(uint threadId);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder name, int bytes, out int needed);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT { public int X, Y; }

    private const uint DESKTOP_READOBJECTS = 1;
    private const int UOI_NAME = 2;
    private const int ERROR_ACCESS_DENIED = 5;
    private static readonly IntPtr DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = new IntPtr(-4);

    private static bool ReadDesktopName(IntPtr desktop, StringBuilder name)
    {
        int needed;
        return desktop != IntPtr.Zero && GetUserObjectInformation(desktop, UOI_NAME, name, name.Capacity * sizeof(char), out needed);
    }

    private static void WriteCursorSample(string threadDesktop, StringBuilder name)
    {
        IntPtr input = OpenInputDesktop(0, false, DESKTOP_READOBJECTS);
        if (input == IntPtr.Zero)
        {
            Console.WriteLine(Marshal.GetLastWin32Error() == ERROR_ACCESS_DENIED ? "inactive-desktop" : "unavailable");
            return;
        }

        try
        {
            POINT point;
            if (!ReadDesktopName(input, name)) Console.WriteLine("unavailable");
            else if (name.ToString() != threadDesktop) Console.WriteLine("inactive-desktop");
            else if (!GetCursorPos(out point)) Console.WriteLine("unavailable");
            else Console.WriteLine("{0} {1}", point.X, point.Y);
        }
        finally
        {
            CloseDesktop(input);
        }
    }

    public static int Main()
    {
        // The main process converts these physical pixels to per-display DIP.
        if (SetThreadDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2) == IntPtr.Zero) return 2;
        var name = new StringBuilder(256);
        if (!ReadDesktopName(GetThreadDesktop(GetCurrentThreadId()), name)) return 2;
        string threadDesktop = name.ToString();

        while (Console.ReadLine() != null) WriteCursorSample(threadDesktop, name);
        return 0;
    }
}
